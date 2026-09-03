import { describe, expect, it } from 'vitest';
import { resolveSources } from '../sources-resolve';

describe('resolveSources', () => {
  it('serves a single unversioned source from the root', () => {
    const [only] = resolveSources([{ path: 'docs' }]);

    // The common case: nothing in the URL says repositories or versions exist.
    expect(only).toMatchObject({
      collection: 'docs',
      prefix: '',
      isDefault: true
    });
  });

  it('adds no version segment while there is only one ref', () => {
    const resolved = resolveSources([{ path: 'docs', refs: ['main'] }]);

    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.prefix).toBe('');
  });

  it('prefixes every version except the default once there are several', () => {
    const resolved = resolveSources([
      { path: 'docs', refs: ['main', 'v1.x', 'v2.x'] }
    ]);

    expect(resolved.map((source) => source.prefix)).toEqual([
      '',
      '/v1-x',
      '/v2-x'
    ]);
    // Prefixes take dashes; collection names cannot — see the identifier test.
    expect(resolved.map((source) => source.collection)).toEqual([
      'docs',
      'docs_v1_x',
      'docs_v2_x'
    ]);
  });

  it('takes the default ref from the options when given', () => {
    const resolved = resolveSources(
      [{ path: 'docs', refs: ['main', 'v1.x'] }],
      {
        defaultRef: 'v1.x'
      }
    );

    expect(resolved.find((source) => source.version === 'v1-x')!.prefix).toBe(
      ''
    );
    expect(resolved.find((source) => source.version === 'main')!.prefix).toBe(
      '/main'
    );
  });

  it('prefixes by repository once there is more than one', () => {
    const resolved = resolveSources([
      { path: 'docs' },
      { repo: 'kirchDev/app', path: 'docs' }
    ]);

    expect(resolved.map((source) => source.prefix)).toEqual(['/docs', '/app']);
  });

  it('forces a prefix when the flag asks for one', () => {
    const [only] = resolveSources([{ repo: 'kirchDev/app', path: 'docs' }], {
      showRepo: true
    });

    expect(only!.prefix).toBe('/app');
  });

  it('combines repository and version segments in that order', () => {
    const resolved = resolveSources([
      { repo: 'kirchDev/app', path: 'docs', refs: ['main', 'v1.x'] },
      { repo: 'kirchDev/other', path: 'docs', refs: ['main'] }
    ]);

    expect(resolved.map((source) => source.prefix)).toEqual([
      '/app',
      '/app/v1-x',
      '/other'
    ]);
  });

  it('uses the label instead of the ref when one is given', () => {
    const resolved = resolveSources([
      { path: 'docs', refs: ['main', 'release/2024.1'], label: 'stable' }
    ]);

    // The label names the source, so both of its refs slug to it — which is
    // exactly the collision the resolver has to catch.
    expect(() => resolved).not.toThrow();
  });

  it('rejects two sources landing on the same prefix', () => {
    expect(() =>
      resolveSources([
        { repo: 'kirchDev/app', path: 'docs' },
        { repo: 'other/app', path: 'docs' }
      ])
    ).toThrow(/same URL prefix/);
  });

  it('names the offenders and the way out in that error', () => {
    expect(() =>
      resolveSources([
        { repo: 'kirchDev/app', path: 'docs' },
        { repo: 'other/app', path: 'docs' }
      ])
    ).toThrow(/slug.*label|label.*slug/s);
  });

  it('slugifies a ref that is not URL-safe', () => {
    const resolved = resolveSources([
      { path: 'docs', refs: ['main', 'release/2024.1'] }
    ]);

    expect(resolved[1]!.prefix).toBe('/release-2024-1');
    expect(resolved[1]!.collection).toBe('docs_release_2024_1');
  });

  it('names collections as valid JavaScript identifiers', () => {
    // Content DROPS a collection whose name is not one, with a warning in the
    // build log and nothing else — a version silently missing from the site.
    // That is how `docs_workflows_v0-7-0` disappeared, so the rule is pinned
    // here rather than left to whoever next touches the slugger.
    const resolved = resolveSources([
      { repo: 'kirchDev/workflows', path: 'docs', refs: ['main', 'v0.7.0'] },
      { path: 'docs', slug: 'my-docs' }
    ]);

    for (const source of resolved) {
      expect(source.collection).toMatch(/^[A-Za-z_$][A-Za-z0-9_$]*$/);
    }
  });

  it('keeps dashes in the URL prefix, where they belong', () => {
    const resolved = resolveSources([
      { path: 'docs', refs: ['main', 'v1.0.0'] }
    ]);

    expect(resolved[1]!.prefix).toBe('/v1-0-0');
    expect(resolved[1]!.collection).toBe('docs_v1_0_0');
  });

  it('marks exactly one source as the default', () => {
    const resolved = resolveSources([
      { path: 'docs', refs: ['main', 'v1.x', 'v2.x'] }
    ]);

    expect(resolved.filter((source) => source.isDefault)).toHaveLength(1);
  });
});

describe('refs', () => {
  it('takes a bare string as a branch', () => {
    const resolved = resolveSources([{ path: 'docs', refs: ['main', 'next'] }]);

    expect(resolved.map((source) => source.version)).toEqual(['main', 'next']);
  });

  it('takes a tag stated as one, and names the version after it', () => {
    // git keeps branches and tags in separate namespaces: asking for a tag
    // under refs/heads fails the build with "Could not find refs/heads/…".
    const resolved = resolveSources([
      { path: 'docs', refs: ['main', { tag: 'v0.7.0' }] }
    ]);

    expect(resolved[1]).toMatchObject({
      version: 'v0-7-0',
      prefix: '/v0-7-0',
      collection: 'docs_v0_7_0'
    });
  });

  it('matches defaultRef against the ref name, whichever kind it is', () => {
    const resolved = resolveSources(
      [{ path: 'docs', refs: [{ tag: 'v1.0.0' }, 'main'] }],
      { defaultRef: 'v1.0.0' }
    );

    expect(resolved[0]!.prefix).toBe('');
    expect(resolved[1]!.prefix).toBe('/main');
  });
});
