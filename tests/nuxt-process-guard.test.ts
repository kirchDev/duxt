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
