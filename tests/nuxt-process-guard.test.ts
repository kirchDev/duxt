import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
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
  new URL('../www/node_modules/nuxt/bin/nuxt.mjs', import.meta.url)
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
  const port = 33432;
  const root = mkdtempSync(join(tmpdir(), 'duxt-env-'));
  roots.push(root);
  const env = join(root, '.env');
  writeFileSync(env, '');
  const server = spawn(
    process.execPath,
    [nuxt, 'dev', '--port', String(port), '--dotenv', env],
    {
      cwd: join(project, 'www'),
      detached: true,
      env: { ...process.env, NODE_ENV: 'development', TEST: undefined },
      stdio: 'ignore'
    }
  );
  try {
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(`http://localhost:${port}/getting-started`))
              .status;
          } catch {
            return 0;
          }
        },
        { timeout: 90_000 }
      )
      .toBe(200);

    writeFileSync(env, 'DUXT_NUXT_RELOAD_TEST=1\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await expect
      .poll(
        async () => {
          try {
            return (await fetch(`http://localhost:${port}/getting-started`))
              .status;
          } catch {
            return 0;
          }
        },
        { timeout: 60_000 }
      )
      .toBe(200);
  } finally {
    await stopProcessGroup(server);
  }
}, 180_000);
