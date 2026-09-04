import { describe, expect, it } from 'vitest';
import {
  isInside,
  sourceForPath,
  versionPath
} from '../app/utils/version-paths';
import { resolveSources } from '../sources-resolve';

/** The development site's own list: two repositories, a branch and a tag. */
const sources = resolveSources(
  [
    { path: 'docs', slug: 'duxt' },
    {
      repo: 'kirchDev/workflows',
      path: 'docs',
      refs: ['main', { tag: 'v0.7.0' }]
    }
  ],
  { defaultRef: 'main' }
);

describe('isInside', () => {
  it('matches the prefix itself and anything under it', () => {
    expect(isInside('/workflows', '/workflows')).toBe(true);
    expect(isInside('/workflows/guides', '/workflows')).toBe(true);
  });

  it('does not match a sibling that merely starts the same', () => {
    // The reason this is not a bare startsWith: /workflows-old is its own path.
    expect(isInside('/workflows-old', '/workflows')).toBe(false);
    expect(isInside('/workflows-old/guides', '/workflows')).toBe(false);
  });

  it('treats an empty prefix as matching everything', () => {
    expect(isInside('/anything', '')).toBe(true);
  });
});

describe('sourceForPath', () => {
  it('picks the version, not the repository, inside a versioned path', () => {
    // Both prefixes match; taking the first said "main" while reading the tag.
    expect(sourceForPath('/workflows/v0.7.0', sources)?.collection).toBe(
      'docs_workflows_v0_7_0'
    );
    expect(sourceForPath('/workflows/v0.7.0/guides', sources)?.collection).toBe(
      'docs_workflows_v0_7_0'
    );
  });

  it('picks the branch outside the version', () => {
    expect(sourceForPath('/workflows', sources)?.collection).toBe(
      'docs_workflows'
    );
    expect(sourceForPath('/workflows/guides', sources)?.collection).toBe(
      'docs_workflows'
    );
  });

  it('picks the other repository', () => {
    expect(sourceForPath('/duxt/getting-started', sources)?.collection).toBe(
      'docs_duxt'
    );
  });

  it('falls back to an unprefixed source when nothing matches', () => {
    const single = resolveSources([{ path: 'docs' }]);

    expect(sourceForPath('/anything', single)?.collection).toBe('docs');
  });

  it('returns nothing when no source can serve the path', () => {
    expect(sourceForPath('/elsewhere', sources)).toBeUndefined();
  });
});

describe('versionPath', () => {
  it('keeps the page when switching version', () => {
    expect(
      versionPath('/workflows/guides', '/workflows', '/workflows/v0.7.0')
    ).toBe('/workflows/v0.7.0/guides');
  });

  it('switches back without leaving the version segment behind', () => {
    // The bug: /workflows/v0.7.0 became /workflows/v0.7.0/v0.7.0, and again on
    // the next click, because the current prefix was mismatched.
    expect(
      versionPath('/workflows/v0.7.0/guides', '/workflows/v0.7.0', '/workflows')
    ).toBe('/workflows/guides');
  });

  it('does not double a prefix when the page is the version root', () => {
    expect(
      versionPath('/workflows/v0.7.0', '/workflows/v0.7.0', '/workflows')
    ).toBe('/workflows');
    expect(versionPath('/workflows', '/workflows', '/workflows/v0.7.0')).toBe(
      '/workflows/v0.7.0'
    );
  });

  it('handles a default version served without a prefix', () => {
    expect(versionPath('/guides', '/', '/v1.x')).toBe('/v1.x/guides');
    expect(versionPath('/v1.x/guides', '/v1.x', '/')).toBe('/guides');
  });

  it('never returns an empty path', () => {
    expect(versionPath('/v1.x', '/v1.x', '/')).toBe('/');
  });

  it('round-trips through every version of a source', () => {
    const versions = sources
      .filter((source) => source.version)
      .map((source) => source.prefix || '/');
    const start = '/workflows/guides';

    for (const target of versions) {
      const moved = versionPath(start, '/workflows', target);
      const back = versionPath(moved, target, '/workflows');

      expect(back).toBe(start);
    }
  });
});
