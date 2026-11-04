import { expect, it, vi } from 'vitest';
import { runDuxtCli } from '../build/cli/cli';
it('dispatches pack paths and prints its compatibility hash', async () => {
  const report = vi.fn();
  const pack = vi.fn().mockResolvedValue({
    bundleId: 'bundle',
    directory: '/publish/bundle',
    compatHash: 'hash'
  });
  const result = await runDuxtCli(
    [
      'content',
      'pack',
      '--publish',
      '/publish',
      '--expect',
      '/image/compat.json'
    ],
    report,
    pack
  );
  expect(result).toEqual({
    stdout: 'Bundle: /publish/bundle\nCompatibility: hash',
    stderr: '',
    exitCode: 0
  });
  expect(pack).toHaveBeenCalledWith({
    publish: '/publish',
    expect: '/image/compat.json'
  });
  expect(report).not.toHaveBeenCalled();
});
it.each([
  ['content', 'pack', '--expect'],
  ['content', 'pack', '--publish', '--help'],
  ['content', 'pack', '--publish=a', '--publish=b'],
  ['content', 'pack', '--help', '--expect=x'],
  ['content', 'pack', '--jsno'],
  ['content', 'pack', '--help=true'],
  ['content', 'pack', 'extra']
])(
  'rejects malformed pack command %j before loading content',
  async (...argv) => {
    const pack = vi.fn();
    expect((await runDuxtCli(argv, vi.fn(), pack)).exitCode).toBe(2);
    expect(pack).not.toHaveBeenCalled();
  }
);
it('prints help without a site and reports content failures with exit one', async () => {
  const pack = vi.fn().mockRejectedValue(new Error('Incompatible components'));
  const help = await runDuxtCli(['content', 'pack', '--help'], vi.fn(), pack);
  expect(help.exitCode).toBe(0);
  expect(help.stdout).toContain('--expect');
  expect(pack).not.toHaveBeenCalled();
  expect(await runDuxtCli(['content', 'pack'], vi.fn(), pack)).toEqual({
    stdout: '',
    stderr: 'Incompatible components',
    exitCode: 1
  });
});
