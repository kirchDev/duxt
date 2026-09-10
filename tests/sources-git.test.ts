import { describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  execFileSync: (_command: string, args: string[]) =>
    args.at(-1)?.endsWith('/legacy')
      ? 'deadbeef\trefs/tags/v0.2.0\n'
      : 'deadbeef\trefs/tags/v0.2.0\ndeadbeef\trefs/tags/v0.3.0\n'
}));

import { resolveLatestRefs } from '../sources-git';
import { resolveSources } from '../sources-resolve';

describe('resolveLatestRefs', () => {
  it('keeps a latest ref default and labels it with its concrete tag', () => {
    const [source] = resolveLatestRefs([
      {
        repo: 'acme/legacy',
        refs: [
          {
            tag: 'latest',
            default: true,
            status: 'maintained',
            locales: ['en']
          },
          { tag: 'v0.2.0', status: 'maintained' },
          { tag: 'v0.1.0', status: 'deprecated' }
        ]
      }
    ]);

    expect(source!.refs).toEqual([
      {
        tag: 'v0.2.0',
        default: true,
        status: 'maintained',
        locales: ['en']
      },
      { tag: 'v0.1.0', status: 'deprecated' }
    ]);
    expect(resolveSources([source!])[0]!.version).toBe('v0.2.0');
  });

  it('keeps an explicit release once latest moves past it', () => {
    const [source] = resolveLatestRefs([
      {
        repo: 'acme/docs',
        statusDefaults: { latest: 'current' },
        refs: [
          { tag: 'latest', default: true },
          { tag: 'v0.3.0' },
          { tag: 'v0.2.0', status: 'maintained' }
        ]
      }
    ]);

    expect(source!.refs).toEqual([
      {
        tag: 'v0.3.0',
        default: true,
        status: 'current'
      },
      { tag: 'v0.2.0', status: 'maintained' }
    ]);
  });
});
