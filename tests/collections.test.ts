import { describe, expect, it, vi } from 'vitest';
import { duxtSources } from '../sources';
import { duxtGeneratedCollections } from '../sections';
import type { DuxtSource, DuxtSourcesOptions } from '../sources-resolve';

// Content initializes its schema converters inside Nuxt; collection assembly
// only needs its declaration boundary, while the build exercises conversion.
vi.mock('@nuxt/content', async (importOriginal) => {
  const content = await importOriginal<typeof import('@nuxt/content')>();
  return {
    ...content,
    defineCollection: (
      collection: Parameters<typeof content.defineCollection>[0]
    ) => content.defineCollection({ ...collection, schema: undefined })
  };
});

const collections = (
  sources: DuxtSource[],
  options: DuxtSourcesOptions = {}
) => ({
  ...duxtSources(sources, options),
  ...duxtGeneratedCollections(sources, options)
});

describe('combined Content collections', () => {
  it('rejects distinct slugs that normalize to the same collection', () => {
    expect(() =>
      collections([
        { path: 'a', slug: 'foo-bar' },
        { path: 'b', slug: 'foo_bar' }
      ])
    ).toThrow(/docs_foo_bar.*foo-bar.*foo_bar/);
  });
  it('rejects documentation colliding with a generated section', () => {
    expect(() =>
      collections([
        {
          path: 'a',
          slug: 'foo',
          generated: [{ type: 'changelog', path: 'CHANGELOG.md', label: 'Bar' }]
        },
        { path: 'b', slug: 'foo_bar' }
      ])
    ).toThrow(/docs_foo_bar.*documentation.*generated section/);
  });
  it('rejects punctuation that collapses to the same name', () => {
    expect(() =>
      collections([
        { path: 'a', slug: 'foo.bar' },
        { path: 'b', slug: 'foo--bar' }
      ])
    ).toThrow(/docs_foo_bar.*foo.bar.*foo--bar/);
  });

  it('rejects different segment boundaries with the same joined name', () => {
    expect(() =>
      collections([
        { path: 'a', slug: 'foo', refs: ['main', 'bar'] },
        { path: 'b', slug: 'foo_bar' }
      ])
    ).toThrow(/docs_foo_bar.*foo\/bar.*foo_bar/);
  });

  it('rejects a translated name colliding with another source', () => {
    expect(() =>
      collections([
        { path: 'a', slug: 'foo', locales: ['en', 'de'] },
        { path: 'b', slug: 'de_foo' }
      ])
    ).toThrow(/docs_de_foo.*locale "de".*de_foo/);
  });

  it('rejects generated sections with colliding normalized slugs', () => {
    expect(() =>
      collections([
        {
          path: 'docs',
          generated: [
            {
              type: 'changelog',
              path: 'CHANGELOG.md',
              label: 'First',
              slug: 'foo-bar'
            },
            {
              type: 'changelog',
              path: 'CHANGELOG.md',
              label: 'Second',
              slug: 'foo.bar'
            }
          ]
        }
      ])
    ).toThrow(/docs_foo_bar.*First.*Second/);
  });

  it('preserves the single unversioned collection', () => {
    const result = collections([{ path: 'docs' }]);
    expect(Object.keys(result)).toEqual(['docs', 'duxt_partials']);
    expect(result.docs!.source![0]!.prefix).toBe('');
  });

  it('preserves distinct names and URLs with translations and shared partials', () => {
    const result = collections([
      { path: 'a', slug: 'foo', locales: ['en', 'de'] },
      { path: 'b', slug: 'bar', locales: ['en', 'de'] }
    ]);
    expect(Object.keys(result)).toEqual([
      'docs_foo',
      'docs_de_foo',
      'docs_bar',
      'docs_de_bar',
      'duxt_partials',
      'duxt_partials_de'
    ]);
    expect(result.docs_foo!.source![0]!.prefix).toBe('/foo');
    expect(result.docs_de_foo!.source![0]!.prefix).toBe('/foo');
    expect(result.docs_bar!.source![0]!.prefix).toBe('/bar');
    expect(result.duxt_partials!.source).toHaveLength(2);
    expect(result.duxt_partials_de!.source).toHaveLength(2);
  });
});
