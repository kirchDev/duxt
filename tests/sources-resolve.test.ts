import { describe, expect, it } from 'vitest';
import { repoUrl, resolveSources, slugify } from '../sources-resolve';

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
    const resolved = resolveSources([
      { repo: 'acme/docs', path: 'docs', refs: ['main'] }
    ]);

    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.prefix).toBe('');
  });

  it('prefixes every version except the default once there are several', () => {
    const resolved = resolveSources([
      { repo: 'acme/docs', path: 'docs', refs: ['main', 'v1.x', 'v2.x'] }
    ]);

    expect(resolved.map((source) => source.prefix)).toEqual([
      '',
      '/v1.x',
      '/v2.x'
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
      [{ repo: 'acme/docs', path: 'docs', refs: ['main', 'v1.x'] }],
      {
        defaultRef: 'v1.x'
      }
    );

    expect(resolved.find((source) => source.version === 'v1.x')!.prefix).toBe(
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

  it('gives a source that names a slug its segment, and only that one', () => {
    // The shape this exists for: one repository, documentation at the root, and
    // something published beside it. The automatic rule cannot see a difference
    // between the two — both are this checkout — so the slug is the difference.
    const resolved = resolveSources([
      { path: 'docs' },
      { path: 'www/demo', slug: 'demo' }
    ]);

    expect(resolved.map((source) => source.prefix)).toEqual(['', '/demo']);
    expect(resolved.map((source) => source.repo)).toEqual([undefined, 'demo']);
  });

  it('combines repository and version segments in that order', () => {
    const resolved = resolveSources([
      { repo: 'kirchDev/app', path: 'docs', refs: ['main', 'v1.x'] },
      { repo: 'kirchDev/other', path: 'docs', refs: ['main'] }
    ]);

    expect(resolved.map((source) => source.prefix)).toEqual([
      '/app',
      '/app/v1.x',
      '/other'
    ]);
  });

  it('uses the label instead of the ref when one is given', () => {
    const resolved = resolveSources([
      {
        repo: 'acme/docs',
        path: 'docs',
        refs: ['main', 'release/2024.1'],
        label: 'stable'
      }
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
      { repo: 'acme/docs', path: 'docs', refs: ['main', 'release/2024.1'] }
    ]);

    expect(resolved[1]!.prefix).toBe('/release-2024.1');
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
      { repo: 'acme/docs', path: 'docs', refs: ['main', 'v1.0.0'] }
    ]);

    expect(resolved[1]!.prefix).toBe('/v1.0.0');
    expect(resolved[1]!.collection).toBe('docs_v1_0_0');
  });

  it('marks exactly one source as the default', () => {
    const resolved = resolveSources([
      { repo: 'acme/docs', path: 'docs', refs: ['main', 'v1.x', 'v2.x'] }
    ]);

    expect(resolved.filter((source) => source.isDefault)).toHaveLength(1);
  });
});

describe('refs', () => {
  it('takes a bare string as a branch', () => {
    const resolved = resolveSources([
      { repo: 'acme/docs', path: 'docs', refs: ['main', 'next'] }
    ]);

    expect(resolved.map((source) => source.version)).toEqual(['main', 'next']);
  });

  it('takes a tag stated as one, and names the version after it', () => {
    // git keeps branches and tags in separate namespaces: asking for a tag
    // under refs/heads fails the build with "Could not find refs/heads/…".
    const resolved = resolveSources([
      { repo: 'acme/docs', path: 'docs', refs: ['main', { tag: 'v0.7.0' }] }
    ]);

    expect(resolved[1]).toMatchObject({
      version: 'v0.7.0',
      prefix: '/v0.7.0',
      collection: 'docs_v0_7_0'
    });
  });

  it('matches defaultRef against the ref name, whichever kind it is', () => {
    const resolved = resolveSources(
      [{ repo: 'acme/docs', path: 'docs', refs: [{ tag: 'v1.0.0' }, 'main'] }],
      { defaultRef: 'v1.0.0' }
    );

    expect(resolved[0]!.prefix).toBe('');
    expect(resolved[1]!.prefix).toBe('/main');
  });

  it('allows a source ref to be default beside another source default', () => {
    const resolved = resolveSources(
      [
        {
          repo: 'acme/docs',
          path: 'docs',
          refs: [{ tag: 'v2.0.0', label: 'latest', default: true }, 'main']
        },
        { path: 'api', slug: 'api', version: 'v3' }
      ],
      { defaultRef: 'v3', showRepo: false }
    );

    expect(resolved[0]).toMatchObject({
      version: 'latest',
      prefix: '',
      isDefault: true,
      ref: 'v2.0.0',
      refKind: 'tag'
    });
    expect(resolved[1]!.prefix).toBe('/main');
    expect(resolved[2]).toMatchObject({ prefix: '/api', isDefault: true });
  });

  it('applies an opted-in lifecycle default by ref kind', () => {
    const resolved = resolveSources([
      {
        repo: 'acme/docs',
        path: 'docs',
        refs: [{ tag: 'v2.0.0' }, { branch: 'main' }],
        statusDefaults: { tag: 'deprecated', branch: 'upcoming' }
      }
    ]);

    expect(resolved.map((source) => source.status)).toEqual([
      'deprecated',
      'upcoming'
    ]);
  });

  it('lets a ref status override its source lifecycle default', () => {
    const [source] = resolveSources([
      {
        repo: 'acme/docs',
        path: 'docs',
        refs: [{ tag: 'v2.0.0', status: 'maintained' }],
        statusDefaults: { tag: 'deprecated' }
      }
    ]);

    expect(source!.status).toBe('maintained');
  });
});

describe('slugify and repoUrl, hardened', () => {
  it('trims separators without backtracking', () => {
    expect(slugify('--v1.0--')).toBe('v1.0');
    expect(slugify('...')).toBe('');
    // The shape CodeQL flagged: many separators and nothing else. The loop is
    // linear, so this returns rather than hangs.
    expect(slugify('-'.repeat(50_000))).toBe('');
  });

  it('refuses a repository that would read as a git option', () => {
    expect(() => repoUrl('--upload-pack=touch /tmp/pwned')).toThrow();
    expect(repoUrl('kirchDev/duxt')).toBe('https://github.com/kirchDev/duxt');
    expect(repoUrl('https://example.com/x.git')).toBe(
      'https://example.com/x.git'
    );
  });
});
