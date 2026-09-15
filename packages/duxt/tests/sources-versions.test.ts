import { describe, expect, it } from 'vitest';
import {
  compareVersionTags,
  newestTag,
  parseVersionTag,
  reservedSegments,
  resolveSources,
  versionRelation
} from '../build/sources/sources-resolve';

describe('compareVersionTags', () => {
  it('orders by semver, not by string', () => {
    expect(newestTag(['v1.9.0', 'v1.10.0', 'v1.2.0'])).toBe('v1.10.0');
  });

  it('does not let a patch on an old line become the newest', () => {
    // The reason the order is semver and not tag date: 1.0.1 can be cut long
    // after 2.0.0 and must still sort below it.
    expect(newestTag(['v2.0.0', 'v1.0.1'])).toBe('v2.0.0');
  });

  it('sorts a pre-release below the release it precedes', () => {
    expect(newestTag(['v2.0.0-rc.1', 'v2.0.0'])).toBe('v2.0.0');
  });

  it('never lets a non-version tag win', () => {
    expect(newestTag(['nightly', 'v0.1.0'])).toBe('v0.1.0');
  });

  it('is a comparator, so a sort of equals is stable', () => {
    expect(compareVersionTags('v1.0.0', 'v1.0.0')).toBe(0);
  });

  it('reads a component-prefixed tag by its version, not its name', () => {
    // release-please's monorepo tags: `<component>@vX.Y.Z`. The prefix names
    // the package, so `duxt@v0.10.0` is newer than `duxt@v0.9.0` and than a
    // plain `v0.4.0` cut before the repository adopted component tags.
    expect(
      newestTag(['v0.4.0', 'duxt@v0.9.0', 'duxt@v0.10.0', 'nightly'])
    ).toBe('duxt@v0.10.0');
    expect(compareVersionTags('duxt@v1.0.0', 'v1.0.0')).toBe(0);
  });

  it('never lets the pre-release swallow a component separator', () => {
    // A tag name is library input — any repository a site points at can push
    // one. CodeQL flagged the first shape of this parser (js/polynomial-redos)
    // because a component and a pre-release could each take the other's `@`,
    // leaving the engine two overlapping ways to split one string. V8 happens
    // to run it fast, which is not a property to rest on. So the pre-release
    // carries semver's own characters only, and a tag that puts an `@` after
    // its version is not a version at all.
    expect(parseVersionTag('v1.0.0-a@b')).toBeUndefined();
    expect(parseVersionTag('9.9.9-a@9.9.9-a')?.component).toBe('9.9.9-a');
  });

  it('takes the component from the last `@` and keeps a scoped name whole', () => {
    expect(parseVersionTag('@acme/sdk@v1.2.3-rc.1')).toEqual({
      component: '@acme/sdk',
      version: 'v1.2.3-rc.1',
      numbers: [1, 2, 3],
      pre: 'rc.1'
    });
    expect(parseVersionTag('v1.2.3')?.component).toBeUndefined();
    expect(parseVersionTag('@v1.2.3')).toBeUndefined();
    expect(parseVersionTag('duxt@')).toBeUndefined();
  });
});

describe('component-prefixed tags', () => {
  it('shows the version, never the component, in the label and the URL', () => {
    const resolved = resolveSources([
      {
        repo: 'acme/monorepo',
        path: 'docs',
        refs: ['main', { tag: 'duxt@v0.4.0' }]
      }
    ]);

    // The ref stays the tag git knows — it is what Content downloads.
    expect(resolved[1]).toMatchObject({
      ref: 'duxt@v0.4.0',
      version: 'v0.4.0',
      prefix: '/v0.4.0'
    });
  });

  it('compares a prefixed tag with a plain one', () => {
    expect(versionRelation('duxt@v1.0.0', 'v0.9.0')).toBe('newer');
  });

  it("still lets a ref's own label win", () => {
    const resolved = resolveSources([
      {
        repo: 'acme/monorepo',
        path: 'docs',
        refs: ['main', { tag: 'duxt@v2.0.0', label: 'v2' }]
      }
    ]);

    expect(resolved[1]).toMatchObject({ version: 'v2', prefix: '/v2' });
  });
});

describe('resolved source metadata', () => {
  it('carries the repository, ref and folder through', () => {
    const [only] = resolveSources([
      { repo: 'kirchDev/app', path: 'documentation', refs: [{ tag: 'v1.0.0' }] }
    ]);

    // This is what "Edit this page", "Last updated" and the contributor list
    // are built from — none of them takes config of its own.
    expect(only).toMatchObject({
      repository: 'kirchDev/app',
      repositoryUrl: 'https://github.com/kirchDev/app',
      ref: 'v1.0.0',
      refKind: 'tag',
      path: 'documentation',
      status: 'current'
    });
  });

  it('takes a lifecycle from the ref, falling back to the source', () => {
    const resolved = resolveSources([
      {
        repo: 'acme/docs',
        path: 'docs',
        status: 'deprecated',
        refs: ['main', { tag: 'v0.1.0', status: 'eol' }]
      }
    ]);

    expect(resolved.map((source) => source.status)).toEqual([
      'deprecated',
      'eol'
    ]);
  });

  it("lets a ref's own label name the version", () => {
    const resolved = resolveSources([
      {
        repo: 'acme/docs',
        path: 'docs',
        refs: ['main', { tag: 'v2.0.0', label: 'latest' }]
      }
    ]);

    expect(resolved[1]).toMatchObject({ version: 'latest', prefix: '/latest' });
  });
});

describe('reservedSegments', () => {
  it('names the version segment a root source may not use as a folder', () => {
    const resolved = resolveSources([
      { repo: 'acme/docs', path: 'docs', refs: ['main', 'v1'] }
    ]);
    const reserved = reservedSegments(resolved);

    // `/v1` is a version, so the default version cannot also have a `v1/`
    // folder — the prefix wins and the folder is simply unreachable.
    expect([...reserved.get('docs')!]).toEqual(['v1']);
    expect([...reserved.get('docs_v1')!]).toEqual([]);
  });

  it('claims only one level down, not the whole tree', () => {
    const resolved = resolveSources([
      { repo: 'kirchDev/app', path: 'docs', refs: ['main', 'v1'] },
      { repo: 'kirchDev/other', path: 'docs' }
    ]);

    const reserved = reservedSegments(resolved);

    expect([...reserved.get('docs_app')!]).toEqual(['v1']);
    expect([...reserved.get('docs_other')!]).toEqual([]);
  });
});

describe('versionRelation', () => {
  it('says which of two releases is the newer', () => {
    expect(versionRelation('v1.0.0', 'v2.0.0')).toBe('older');
    expect(versionRelation('v3.0.0', 'v2.0.0')).toBe('newer');
  });

  it('refuses to compare a branch with a tag', () => {
    // This is the bug the banner had: `main` parses as nothing, and guessing
    // made `v0.7.0` the newer of the two — so an old release offered itself as
    // an upgrade. Unknown is the honest answer; the config decides from there.
    expect(versionRelation('v0.7.0', 'main')).toBe('unknown');
    expect(versionRelation('next', 'v2.0.0')).toBe('unknown');
  });

  it('has nothing to say about one version', () => {
    expect(versionRelation('v1.0.0', 'v1.0.0')).toBe('same');
    expect(versionRelation(undefined, 'v1.0.0')).toBe('unknown');
  });
});

/**
 * A version a SOURCE names, where no ref names one.
 *
 * The shape an API is usually kept in: two documents in one checkout, versioned
 * by file. Before this they were two unrelated sections — the resolver derived
 * a version from a ref and there was none, so neither carried a prefix and the
 * switcher had nothing to offer.
 */
describe('a version without a ref', () => {
  const sources = [
    { path: 'openapi/v2.yaml', version: 'v2' },
    { path: 'openapi/v1.yaml', version: 'v1', status: 'deprecated' as const }
  ];

  it('serves the default without a prefix and the rest under theirs', () => {
    const resolved = resolveSources(sources);

    expect(resolved.map((source) => source.prefix)).toEqual(['', '/v1']);
    expect(resolved.map((source) => source.version)).toEqual(['v2', 'v1']);
  });

  it('takes `defaultRef` for which one that is', () => {
    const resolved = resolveSources(sources, { defaultRef: 'v1' });

    expect(resolved.map((source) => source.prefix)).toEqual(['/v2', '']);
    expect(resolved.find((source) => source.isDefault)?.version).toBe('v1');
  });

  it('carries the lifecycle a source declares', () => {
    const resolved = resolveSources(sources);

    expect(resolved.at(-1)?.status).toBe('deprecated');
  });

  it('refuses a source that names a version AND lists refs', () => {
    // Two truths about one source: it would have to be served at two prefixes
    // at once, and the reader would meet the same document twice.
    expect(() =>
      resolveSources([
        {
          repo: 'acme/docs',
          path: 'docs',
          version: 'v2',
          refs: [{ tag: 'v2.0.0' }]
        }
      ])
    ).toThrow(/never from both/);
  });

  it('leaves a single unversioned source exactly as it was', () => {
    const resolved = resolveSources([{ path: 'docs' }]);

    expect(resolved[0]?.prefix).toBe('');
    expect(resolved[0]?.version).toBeUndefined();
  });
});
