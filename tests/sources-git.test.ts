import { describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({
  execFileSync: (_command: string, args: string[]) => {
    const url = args.at(-1) ?? '';

    // An unreachable remote: git exits non-zero and says why on stderr.
    if (url.endsWith('/offline')) {
      throw Object.assign(new Error('Command failed: git ls-remote'), {
        status: 128,
        stderr:
          "fatal: unable to access 'https://github.com/acme/offline/': " +
          'Could not resolve host: github.com\n'
      });
    }

    return url.endsWith('/legacy')
      ? 'deadbeef\trefs/tags/v0.2.0\n'
      : url.endsWith('/empty')
        ? 'deadbeef\trefs/tags/nightly\n'
        : url.endsWith('/releases')
          ? [
              'deadbeef\trefs/tags/v2.1.0',
              'deadbeef\trefs/tags/v2.0.1',
              'deadbeef\trefs/tags/v1.4.2',
              'deadbeef\trefs/tags/v1.4.0-rc.1',
              'deadbeef\trefs/tags/v1.3.4',
              'deadbeef\trefs/tags/nightly'
            ].join('\n')
          : 'deadbeef\trefs/tags/v0.2.0\ndeadbeef\trefs/tags/v0.3.0\n';
  }
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

  it('discovers every stable semver release and defaults to the newest one', () => {
    const [source] = resolveLatestRefs([
      { repo: 'acme/releases', releases: { select: 'all' } }
    ]);

    expect(source!.refs).toEqual([
      { tag: 'v2.1.0' },
      { tag: 'v2.0.1' },
      { tag: 'v1.4.2' },
      { tag: 'v1.3.4' }
    ]);
  });

  it('keeps one newest stable release per selected line', () => {
    const [minor] = resolveLatestRefs([
      { repo: 'acme/releases', releases: { select: 'minor' } }
    ]);
    const [major] = resolveLatestRefs([
      { repo: 'acme/releases', releases: { select: 'major' } }
    ]);

    expect(minor!.refs).toEqual([
      { tag: 'v2.1.0' },
      { tag: 'v2.0.1' },
      { tag: 'v1.4.2' },
      { tag: 'v1.3.4' }
    ]);
    expect(major!.refs).toEqual([{ tag: 'v2.1.0' }, { tag: 'v1.4.2' }]);
  });

  it('only includes prereleases when explicitly requested', () => {
    const [source] = resolveLatestRefs([
      { repo: 'acme/releases', releases: { select: 'all', prereleases: true } }
    ]);

    expect(source!.refs).toContainEqual({ tag: 'v1.4.0-rc.1' });
  });

  it('lets an explicit discovered tag override its generated metadata', () => {
    const [source] = resolveLatestRefs([
      {
        repo: 'acme/releases',
        releases: { select: 'major' },
        refs: [{ tag: 'v1.4.2', label: 'v1', status: 'maintained' }]
      }
    ]);

    expect(source!.refs).toEqual([
      { tag: 'v2.1.0' },
      { tag: 'v1.4.2', label: 'v1', status: 'maintained' }
    ]);
  });

  it('lets sourceOptions.defaultRef override discovery default', () => {
    const [source] = resolveLatestRefs([
      { repo: 'acme/releases', releases: { select: 'major' } }
    ]);

    expect(
      resolveSources([source!], { defaultRef: 'v1.4.2' })
        .filter((entry) => entry.isDefault)
        .map((entry) => entry.ref)
    ).toEqual(['v1.4.2']);
  });

  it('uses the newest selected stable release when no default is explicit', () => {
    const [source] = resolveLatestRefs([
      { repo: 'acme/releases', releases: { select: 'major' } }
    ]);

    expect(
      resolveSources([source!]).find((entry) => entry.isDefault)?.ref
    ).toBe('v2.1.0');
  });

  it('names the source and selection when discovery finds no semver tags', () => {
    expect(() =>
      resolveLatestRefs([{ repo: 'acme/empty', releases: { select: 'all' } }])
    ).toThrow(/all.*acme\/empty.*no SemVer/i);
  });

  it('blames git, not the ref, when the tags could not be read at all', () => {
    expect(() =>
      resolveLatestRefs([
        { repo: 'acme/offline', refs: [{ tag: 'latest', default: true }] }
      ])
    ).toThrow(/acme\/offline.*git.*Could not resolve host/is);

    expect(() =>
      resolveLatestRefs([
        { repo: 'acme/offline', refs: [{ tag: 'latest', default: true }] }
      ])
    ).not.toThrow(/Name a tag explicitly/i);
  });

  it('blames git, not the selection, when discovery cannot read the tags', () => {
    expect(() =>
      resolveLatestRefs([
        { repo: 'acme/offline', releases: { select: 'minor' } }
      ])
    ).toThrow(/minor.*acme\/offline.*git.*Could not resolve host/is);

    expect(() =>
      resolveLatestRefs([
        { repo: 'acme/offline', releases: { select: 'minor' } }
      ])
    ).not.toThrow(/no SemVer tags/i);
  });

  it('reports a refused repository URL as the refusal it is', () => {
    expect(() =>
      resolveLatestRefs([
        {
          repo: 'ftp://example.invalid/docs',
          refs: [{ tag: 'latest', default: true }]
        }
      ])
    ).toThrow(/refusing to read tags/i);
  });
});
