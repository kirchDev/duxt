import { expect, it } from 'vitest';
import { resolveSources } from '../build/sources/sources-resolve';
import { duxtPageType } from '../app/utils/page-types';
import { resolveGeneratedSections } from '../build/sections/sections-resolve';

it('chooses frontmatter, then the source default, then docs for every locale and version', () => {
  const types = {
    docs: { layout: 'docs', template: 'DuxtDocsPage' },
    article: { layout: 'wiki', template: 'WikiArticle' },
    category: { layout: 'wiki', template: 'WikiCategory' }
  };
  const sources = resolveSources(
    [
      {
        repo: 'acme/wiki',
        path: 'docs',
        refs: ['main', 'v1'],
        locales: ['en', 'de'],
        pageType: 'article'
      }
    ],
    { defaultLocale: 'en' }
  );
  expect(sources).toHaveLength(4);
  for (const source of sources) {
    expect(duxtPageType({ type: 'category' }, source, types)).toEqual({
      name: 'category',
      ...types.category
    });
    expect(duxtPageType({}, source, types)).toEqual({
      name: 'article',
      ...types.article
    });
  }
  expect(duxtPageType({ type: null }, undefined, types)).toEqual({
    name: 'docs',
    ...types.docs
  });
  expect(() => duxtPageType({ type: 'missing' }, sources[0], types)).toThrow(
    /missing/
  );
});

it('renders built-in generated sections through page types, with flat history remaining docs', () => {
  const sections = resolveGeneratedSections([
    {
      path: 'docs',
      generated: [
        { type: 'openapi', path: 'api.json', label: 'API' },
        { type: 'bruno', path: 'bruno', label: 'Requests' },
        { type: 'changelog', path: 'CHANGELOG.md', label: 'History' },
        {
          type: 'changelog',
          path: 'CHANGELOG.md',
          label: 'Flat',
          options: { granularity: 'flat' }
        }
      ]
    }
  ]);
  expect(sections.map((source) => source.pageType)).toEqual([
    'reference',
    'reference',
    'changelog',
    'docs'
  ]);
});
