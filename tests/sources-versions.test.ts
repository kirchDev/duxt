import { describe, expect, it } from 'vitest';
import {
  compareVersionTags,
  newestTag,
  reservedSegments,
  resolveSources,
  versionRelation
} from '../sources-resolve';

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
      { path: 'docs', refs: ['main', { tag: 'v2.0.0', label: 'latest' }] }
    ]);

    expect(resolved[1]).toMatchObject({ version: 'latest', prefix: '/latest' });
  });
});

describe('reservedSegments', () => {
  it('names the version segment a root source may not use as a folder', () => {
    const resolved = resolveSources([{ path: 'docs', refs: ['main', 'v1'] }]);
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
