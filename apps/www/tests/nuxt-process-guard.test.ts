import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it } from 'vitest';

const children: ChildProcess[] = [];
const roots: string[] = [];
const fixture = fileURLToPath(
  new URL('./fixtures/nuxt-ownership/process.ts', import.meta.url)
);
const project = fileURLToPath(new URL('..', import.meta.url));
const nuxt = fileURLToPath(
  new URL('../node_modules/nuxt/bin/nuxt.mjs', import.meta.url)
);

function start(root: string, command: string) {
  const child = spawn(process.execPath, [fixture, root, command], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  children.push(child);
  let output = '';
  child.stdout!.on('data', (data) => {
    output += data;
  });
  child.stderr!.on('data', (data) => {
    output += data;
  });
  return { child, output: () => output };
}

async function reservePort(): Promise<number> {
  const reservation = createServer();
  await new Promise<void>((resolve) =>
    reservation.listen(0, '127.0.0.1', resolve)
  );
  const address = reservation.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  return address.port;
}

async function stopProcessGroup(child: ChildProcess): Promise<void> {
  try {
    process.kill(-child.pid!, 'SIGKILL');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }
  if (child.exitCode === null) await once(child, 'exit');
}

afterEach(async () => {
  await Promise.all(
    children.splice(0).map(async (child) => {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit');
        child.kill('SIGKILL');
        await exited;
      }
    })
  );
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

it.each([
  ['dev', 'build'],
  ['build', 'dev']
])('refuses %s → %s before mutation', async (first, second) => {
  const root = mkdtempSync(join(tmpdir(), 'duxt-ownership-'));
  roots.push(root);
  const dev = start(root, first);
  await expect.poll(dev.output).toContain('ready');
  const build = start(root, second);
  await expect.poll(() => build.child.exitCode).toBe(1);
  expect(build.output()).toContain(`${first} (PID ${dev.child.pid})`);
  expect(readFileSync(join(root, 'mutated'), 'utf8')).toBe(first);
  expect(dev.child.exitCode).toBeNull();
});

it('allows clean startup after the owner is killed without removing database files', async () => {
  const root = mkdtempSync(join(tmpdir(), 'duxt-ownership-'));
  roots.push(root);
  const first = start(root, 'build');
  await expect.poll(first.output).toContain('ready');
  const exited = once(first.child, 'exit');
  first.child.kill('SIGKILL');
  await exited;
  const buildDir = join(root, 'node_modules/.cache/nuxt/.nuxt');
  mkdirSync(buildDir, { recursive: true });
  writeFileSync(
    join(buildDir, 'nuxt.lock'),
    JSON.stringify({
      pid: first.child.pid,
      command: 'build',
      startedAt: Date.now()
    })
  );
  const second = start(root, 'dev');
  await expect.poll(second.output).toContain('ready');
  expect(readFileSync(join(root, 'mutated'), 'utf8')).toBe('dev');
});

it('gives exactly one simultaneous starter ownership', async () => {
  const root = mkdtempSync(join(tmpdir(), 'duxt-ownership-'));
  roots.push(root);
  const starters = Array.from({ length: 8 }, (_, index) =>
    start(root, index % 2 ? 'dev' : 'build')
  );
  await expect
    .poll(() => starters.filter((entry) => entry.child.exitCode === 1).length, {
      timeout: 5000
    })
    .toBe(7);
  expect(
    starters.filter((entry) => entry.output().includes('ready'))
  ).toHaveLength(1);
  for (const entry of starters.filter((entry) => entry.child.exitCode === 1)) {
    expect(entry.output()).toContain('Stop that process before retrying');
  }
});

it('does not expire a live legacy Nuxt lock based on its age', async () => {
  const root = mkdtempSync(join(tmpdir(), 'duxt-ownership-'));
  roots.push(root);
  const buildDir = join(root, 'node_modules/.cache/nuxt/.nuxt');
  mkdirSync(buildDir, { recursive: true });
  const lock = JSON.stringify({
    pid: process.pid,
    command: 'dev',
    startedAt: 0
  });
  writeFileSync(join(buildDir, 'nuxt.lock'), lock);
  const build = start(root, 'build');
  await expect.poll(() => build.child.exitCode).toBe(1);
  expect(build.output()).toContain(`dev (PID ${process.pid})`);
  expect(readFileSync(join(buildDir, 'nuxt.lock'), 'utf8')).toBe(lock);
});

it('keeps serving when a .env change restarts Nuxt dev', async () => {
  const port = await reservePort();
  /**
   * INSIDE `apps/www/`, by a bare name. nuxi watches only its own working
   * directory and compares the changed file's NAME with `--dotenv`, so a file
   * handed over as an absolute path elsewhere never restarts anything — which
   * is what this test used to do, and why it passed without a restart ever
   * happening. `.env.*` is ignored by git; the site's own `.env` is left alone.
   */
  const name = `.env.duxt-reload-test-${process.pid}`;
  const env = join(project, name);
  writeFileSync(env, '');
  const probe = `http://reload-probe-${process.pid}.invalid`;

  const server = spawn(
    process.execPath,
    [nuxt, 'dev', '--port', String(port), '--dotenv', name],
    {
      cwd: project,
      detached: true,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        TEST: undefined,
        NUXT_PUBLIC_I18N_BASE_URL: undefined,
        NUXT_SITE_URL: undefined
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  // Drained, not only read: a pipe nobody empties fills up and stalls the
  // server it belongs to.
  let output = '';
  server.stdout!.on('data', (data) => {
    output += data;
  });
  server.stderr!.on('data', (data) => {
    output += data;
  });

  /**
   * The page as rendered, or nothing. While Nuxt loads, nuxi answers every
   * request with its loading template, so a 200 alone is not a served page.
   */
  const page = async () => {
    try {
      const response = await fetch(`http://localhost:${port}/getting-started`);
      const html = await response.text();
      return response.status === 200 && /<h1[\s>]/.test(html) ? html : '';
    } catch {
      return '';
    }
  };

  try {
    // A cold start of the whole site is well over a minute on a loaded
    // machine; 90 seconds failed on exactly that and nothing else.
    await expect
      .poll(page, { timeout: 240_000, interval: 1000 })
      .toContain('<h1');
    expect(await page()).not.toContain(probe);

    // THE RESTART, PROVEN BY WHAT IT SERVES. The origin comes from the
    // environment at request time, so the probe reaches the canonical and the
    // alternates only once a restarted Nuxt has read the changed file — and
    // only if the ownership guard let that restarted instance start at all.
    writeFileSync(
      env,
      `NUXT_PUBLIC_I18N_BASE_URL=${probe}\nNUXT_SITE_URL=${probe}\n`
    );

    await expect
      .poll(page, { timeout: 240_000, interval: 1000 })
      .toContain(probe);
    expect(output).not.toContain('Stop that process before retrying');
  } finally {
    await stopProcessGroup(server);
    rmSync(env, { force: true });
  }
}, 540_000);
