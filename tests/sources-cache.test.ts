import { describe, expect, it } from 'vitest';
import type { DuxtSource } from '../sources-resolve';
import {
  duxtRemoteCacheEntries,
  duxtSourcesCacheKey,
  duxtSourcesCachePaths,
  runDuxtSourcesCacheCli
} from '../sources-cache';

/**
 * The key a CI run may cache `.data/content` under, and when it may not.
 *
 * Content downloads every remote source into a directory named for the
 * repository AND the ref, so what the cache holds is a function of the RESOLVED
 * source list and of nothing else. A key over `pnpm-lock.yaml` would be wrong
 * in both directions — it moves when no source did, and it stands still when a
 * `latest` tag moves underneath it.
 *
 * Both halves are checked here because neither is visible anywhere else: a
 * wrong key is a cache that silently never hits (or worse, one that hits when
 * the source list has moved on), and the public-only rule is a security
 * property that no build failure would ever report.
 */

const key = (sources: DuxtSource[]) => duxtSourcesCacheKey(sources).key;

describe('duxtRemoteCacheEntries', () => {
  it('lists one entry per repository and ref, not per collection', () => {
    // Five locales over two refs is ten collections and two downloads —
    // Content clones a repository once per ref, whatever reads it afterwards.
    const entries = duxtRemoteCacheEntries([
      {
        repo: 'kirchDev/duxt',
        path: 'docs',
        refs: [{ tag: 'v0.2.0' }, { branch: 'main' }],
        locales: ['en-GB', 'de', 'es', 'fr', 'pt']
      }
    ]);

    expect(entries).toEqual([
      { url: 'https://github.com/kirchDev/duxt', ref: 'branch:main' },
      { url: 'https://github.com/kirchDev/duxt', ref: 'tag:v0.2.0' }
    ]);
  });

  it('keeps a tag and a branch of the same name apart', () => {
    const entries = duxtRemoteCacheEntries([
      { repo: 'o/r', path: 'docs', refs: [{ tag: 'release' }] },
      { repo: 'o/r', path: 'other', refs: [{ branch: 'release' }] }
    ]);

    expect(entries.map((entry) => entry.ref)).toEqual([
      'branch:release',
      'tag:release'
    ]);
  });

  it('ignores a source read off disk, origin and all', () => {
    // `origin` names a repository for the edit links. Nothing is downloaded for
    // it, so nothing about it belongs in a key over the download cache.
    expect(
      duxtRemoteCacheEntries([
        { path: 'docs', origin: { repo: 'kirchDev/duxt', ref: 'main' } }
      ])
    ).toEqual([]);
  });

  it('reads a ref a locale overrides for itself', () => {
    // A translation maintained in its own repository at its own tag is a
    // second download, and the key has to move when that tag does.
    const entries = duxtRemoteCacheEntries([
      {
        repo: 'o/r',
        path: 'docs',
        refs: [{ tag: 'v1.0.0' }],
        locales: [
          'en',
          { locale: 'de', repo: 'o/r-de', ref: { tag: 'v0.9.0' } }
        ]
      }
    ]);

    expect(entries).toEqual([
      { url: 'https://github.com/o/r', ref: 'tag:v1.0.0' },
      { url: 'https://github.com/o/r-de', ref: 'tag:v0.9.0' }
    ]);
  });
});

describe('duxtSourcesCacheKey', () => {
  const remote: DuxtSource[] = [
    { repo: 'o/r', path: 'docs', refs: [{ tag: 'v1.0.0' }] }
  ];

  it('moves when a resolved tag moves', () => {
    expect(key(remote)).not.toBe(
      key([{ repo: 'o/r', path: 'docs', refs: [{ tag: 'v1.1.0' }] }])
    );
  });

  it('stands still when only the order of the list changes', () => {
    const a: DuxtSource[] = [
      { repo: 'o/a', path: 'docs', refs: [{ tag: 'v1.0.0' }] },
      { repo: 'o/b', path: 'docs', refs: [{ branch: 'main' }] }
    ];

    expect(key(a)).toBe(key([...a].reverse()));
  });

  it('stands still when something that downloads nothing changes', () => {
    // A slug, a status and a label are theme decisions. Re-downloading five
    // repositories because a badge changed colour is the cost this exists to
    // avoid.
    expect(key(remote)).toBe(
      key([
        {
          repo: 'o/r',
          path: 'docs',
          slug: 'docs',
          status: 'deprecated',
          refs: [{ tag: 'v1.0.0', label: 'One' }]
        }
      ])
    );
  });

  it('refuses an unresolved `latest`, which would outlive the tag it names', () => {
    // The whole reason the key is taken over the RESOLVED list: `latest` is the
    // same five characters at v1.0.0 and at v2.0.0, so a key holding it would
    // restore last release's checkout for this release's build.
    expect(() =>
      duxtSourcesCacheKey([
        { repo: 'o/r', path: 'docs', refs: [{ tag: 'latest' }] }
      ])
    ).toThrow(/latest/);
  });
});

describe('what may be cached at all', () => {
  it('declines a list with nothing remote in it', () => {
    const result = duxtSourcesCacheKey([{ path: 'docs' }]);

    expect(result.cacheable).toBe(false);
    expect(result.key).toBe('');
    expect(result.reason).toMatch(/no remote source/i);
  });

  it('accepts an ordinary public repository', () => {
    const result = duxtSourcesCacheKey([
      { repo: 'kirchDev/duxt', path: 'docs', refs: [{ branch: 'main' }] }
    ]);

    expect(result.cacheable).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.key).toMatch(/^duxt-content-v1-[0-9a-f]{64}$/);
  });

  it('declines an SSH remote, which is an authenticated one', () => {
    for (const repo of [
      'git@github.com:o/r.git',
      'ssh://git@github.com/o/r.git'
    ]) {
      const result = duxtSourcesCacheKey([
        { repo, path: 'docs', refs: [{ branch: 'main' }] }
      ]);

      expect(result.cacheable).toBe(false);
      expect(result.key).toBe('');
      expect(result.reason).toMatch(/github\.com/);
      expect(result.reason).toMatch(/not a public/);
    }
  });

  it('declines a URL carrying credentials', () => {
    const result = duxtSourcesCacheKey([
      {
        repo: 'https://x-access-token:secret@github.com/o/r.git',
        path: 'docs',
        refs: [{ branch: 'main' }]
      }
    ]);

    expect(result.cacheable).toBe(false);
    expect(result.key).toBe('');
    // The reason is printed into a CI log, so it names the source WITHOUT the
    // credential that made it private.
    expect(result.reason).not.toContain('secret');
    expect(result.reason).toMatch(/github\.com\/o\/r/);
  });

  it('declines the whole list for one private source, never part of it', () => {
    // A partial cache would be the worst of both: the restore still exposes a
    // checkout to every reader of the cache, and the build still downloads.
    const result = duxtSourcesCacheKey([
      { repo: 'o/public', path: 'docs', refs: [{ branch: 'main' }] },
      {
        repo: 'git@github.com:o/private.git',
        path: 'docs',
        refs: [{ branch: 'main' }]
      }
    ]);

    expect(result.cacheable).toBe(false);
  });
});

describe('what the cache is allowed to hold', () => {
  it('keeps the parse cache out of it', () => {
    // `contents.sqlite` sits in the same directory as the downloads and is the
    // OUTPUT of the parse, not an input to it. Carrying one between runs hides
    // content changes rather than merely re-downloading them, which is why the
    // download cache is the one worth having and this one is not.
    const { paths } = duxtSourcesCachePaths('www/.data/content');

    expect(paths[0]).toBe('www/.data/content');
    expect(paths).toContain('!www/.data/content/contents.sqlite');
    expect(paths.some((glob) => glob.includes('contents.sqlite-'))).toBe(true);
  });
});

describe('runDuxtSourcesCacheCli', () => {
  const cacheable = {
    ...duxtSourcesCacheKey([
      { repo: 'o/r', path: 'docs', refs: [{ branch: 'main' }] }
    ]),
    ...duxtSourcesCachePaths('www/.data/content')
  };

  it('writes the step outputs a workflow reads', () => {
    const { output, exitCode } = runDuxtSourcesCacheCli(
      ['--github'],
      cacheable
    );

    expect(exitCode).toBe(0);
    expect(output).toContain('cacheable=true');
    expect(output).toContain('path=www/.data/content');
    expect(output).toContain(`key=${cacheable.key}`);
  });

  it('writes the multi-line paths as a heredoc $GITHUB_OUTPUT accepts', () => {
    const { output } = runDuxtSourcesCacheCli(['--github'], cacheable);

    const lines = output.split('\n');
    const start = lines.findIndex((line) => line.startsWith('paths<<'));
    const delimiter = lines[start]!.slice('paths<<'.length);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(lines.slice(start + 1, lines.indexOf(delimiter, start + 1))).toEqual(
      cacheable.paths
    );
    // A delimiter that also occurs in the value ends the block early and turns
    // the rest of it into forged step outputs.
    expect(cacheable.paths).not.toContain(delimiter);
  });

  it('says why there is nothing to cache, and still succeeds', () => {
    // A repository with no remote sources is not a broken one, so a job that
    // asks for the key gets an answer rather than a failed step.
    const { output, exitCode } = runDuxtSourcesCacheCli(['--github'], {
      ...duxtSourcesCacheKey([{ path: 'docs' }]),
      ...duxtSourcesCachePaths('.data/content')
    });

    expect(exitCode).toBe(0);
    expect(output).toContain('cacheable=false');
    expect(output).toContain('key=');
    expect(output).toMatch(/reason=.*remote source/i);
  });

  it('prints the entries it keyed over for a human', () => {
    const { output } = runDuxtSourcesCacheCli([], cacheable);

    expect(output).toContain('https://github.com/o/r');
    expect(output).toContain('branch:main');
    expect(output).toContain(cacheable.key);
  });
});
