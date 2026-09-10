import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, copyFile, symlink, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';

async function runCheck(mode: string) {
  const root = await mkdtemp(join(tmpdir(), 'duxt-seo-test-'));
  const reservation = createServer();
  await new Promise<void>((done) => reservation.listen(0, '127.0.0.1', done));
  const address = reservation.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  const port = address.port;
  await new Promise<void>((done) => reservation.close(() => done()));
  await mkdir(join(root, 'scripts'));
  await mkdir(join(root, 'www/.output/server'), { recursive: true });
  await symlink(resolve('node_modules'), join(root, 'node_modules'), 'dir');
  await copyFile(
    resolve('scripts/check-seo.ts'),
    join(root, 'scripts/check-seo.ts')
  );
  await copyFile(
    resolve('tests/fixtures/seo-server.mjs'),
    join(root, 'www/.output/server/index.mjs')
  );
  const foreign =
    mode === 'occupied'
      ? spawn(process.execPath, [join(root, 'www/.output/server/index.mjs')], {
          env: {
            ...process.env,
            SEO_FIXTURE_MODE: 'valid',
            NITRO_PORT: String(port),
            NITRO_HOST: '127.0.0.1',
            NUXT_SITE_URL: `http://127.0.0.1:${port}`
          },
          stdio: ['ignore', 'pipe', 'pipe']
        })
      : undefined;
  if (foreign)
    await new Promise<void>((done, reject) => {
      foreign.once('error', reject);
      foreign.stdout.once('data', () => done());
    });
  const child = spawn(process.execPath, [join(root, 'scripts/check-seo.ts')], {
    env: {
      ...process.env,
      SEO_FIXTURE_MODE: mode,
      SEO_CHECK_PORT: String(port),
      SEO_CHECK_TIMEOUT_MS: '1000'
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32'
  });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  function stopCheck() {
    if (!child.pid) return;
    try {
      // Kill the fixture too if a regression leaves the check stuck.
      if (process.platform === 'win32') child.kill('SIGTERM');
      else process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
    }
  }
  const watchdog = setTimeout(stopCheck, 8000);
  try {
    const code = await new Promise<number | null>((done, reject) => {
      child.on('error', reject);
      child.on('exit', done);
    });
    const foreignAlive = foreign
      ? (
          await fetch(`http://127.0.0.1:${port}`, {
            signal: AbortSignal.timeout(1000)
          })
        ).status === 200
      : undefined;
    return { code, output, foreignAlive };
  } finally {
    clearTimeout(watchdog);
    stopCheck();
    if (foreign) {
      const exited = new Promise<void>((done) =>
        foreign.once('exit', () => done())
      );
      foreign.kill('SIGTERM');
      await exited;
    }
    await rm(root, { recursive: true, force: true });
  }
}

test('reports the HTTP failure received by the real SEO check instead of missing tags', async () => {
  const result = await runCheck('http500');
  expect(result.code).toBe(1);
  expect(result.output).toContain('HTTP 500');
  expect(result.output).toContain('text/html');
  expect(result.output).toContain('/getting-started');
  expect(result.output).not.toContain('0 og:locale:alternate');
}, 10000);

test('fails explicitly when its own child cannot bind the occupied port', async () => {
  const result = await runCheck('occupied');
  expect(result.code).toBe(1);
  expect(result.output).toContain('EADDRINUSE');
  expect(result.output).toContain('server exited');
  expect(result.foreignAlive).toBe(true);
}, 10000);

test.each(['stall', 'body-stall'])(
  'bounds response acquisition and body reading: %s',
  async (mode) => {
    const result = await runCheck(mode);
    expect(result.code).toBe(1);
    expect(result.output).toContain('timed out');
    expect(result.output).toContain('/getting-started');
  },
  10000
);

test('accepts valid HTML including the intentional 404 and six alternates', async () => {
  const result = await runCheck('valid');
  expect(result.code).toBe(0);
  expect(result.output).toContain('SEO check passed over 4 pages');
}, 10000);

test('still rejects a valid page missing a locale alternate', async () => {
  const result = await runCheck('missing-alternate');
  expect(result.code).toBe(1);
  expect(result.output).toContain(
    '5 og:locale:alternate tags for 6 other locales'
  );
  expect(result.output).not.toContain('invalid HTML response');
}, 10000);

test.each([
  ['redirect', 'HTTP 302'],
  ['json', 'content-type application/json'],
  ['wrong404', 'expected 404 HTML'],
  ['startup-exit', 'server exited prematurely (code 17'],
  ['premature-exit', 'server exited prematurely (code 18'],
  ['startup-stall', 'server startup timed out']
])(
  'diagnoses %s explicitly',
  async (mode, diagnostic) => {
    const result = await runCheck(mode!);
    expect(result.code).toBe(1);
    expect(result.output).toContain(diagnostic);
  },
  10000
);
