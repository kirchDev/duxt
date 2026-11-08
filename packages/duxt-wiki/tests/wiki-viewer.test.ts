import { expect, it } from 'vitest';
import { resolveSources } from '@kirchdev/duxt/sources-resolve';
import type { WikiPage } from '../metadata';
import { wikiOriginCollections, wikiViewerMaintenance } from '../wiki-viewer';
import { collectionWantedPrefixes } from '../wanted-routes';

it('provides a foreign collection utility and its explicitly qualified wiki linkers without importing unrelated wanted names', () => {
  const sources = resolveSources([
    { path: 'wiki', slug: 'wiki', pageType: 'article' },
    { path: 'demo', slug: 'demo' }
  ]);
  const origin = sources.find((source) => source.prefix === '/wiki')!;
  const destination = sources.find((source) => source.prefix === '/demo')!;
  const page: WikiPage = {
    collection: origin.collection,
    path: '/wiki/article',
    title: 'Wiki origin',
    aliases: [],
    categories: [],
    links: [
      { kind: 'wiki', target: '~/demo/Missing' },
      { kind: 'wiki', target: 'Own missing' }
    ]
  };
  const context = { source: destination, sources, locale: 'en' };
  expect(collectionWantedPrefixes(sources)).toEqual(['/wiki', '/demo']);
  expect(wikiOriginCollections(context)).toEqual([origin.collection]);
  expect(
    wikiViewerMaintenance([page], context).wanted.map((entry) => [
      entry.title,
      entry.linkers.map((linker) => linker.path)
    ])
  ).toEqual([['Missing', ['/wiki/article']]]);
});

it('overlays origin locales and admits only explicit edges into the selected target version', () => {
  const sources = resolveSources(
    [
      {
        path: 'wiki',
        slug: 'wiki',
        pageType: 'article',
        locales: ['en', 'de']
      },
      { repo: 'acme/demo', path: 'demo', slug: 'demo', refs: ['main', 'v1'] }
    ],
    { defaultLocale: 'en' }
  );
  const english = sources.find(
    (source) => source.prefix === '/wiki' && source.isDefaultLocale
  )!;
  const german = sources.find(
    (source) => source.prefix === '/wiki' && source.locale === 'de'
  )!;
  const current = sources.find((source) => source.prefix === '/demo')!;
  const old = sources.find((source) => source.prefix === '/demo/v1')!;
  const row = (collection: string, path: string, target: string): WikiPage => ({
    collection,
    path,
    title: path,
    categories: [],
    aliases: [],
    links: [{ kind: 'wiki', target }]
  });
  const pages = [
    row(english.collection, '/wiki/translated', '~/demo/Shadowed'),
    row(german.collection, '/wiki/translated', '~/demo/v1/Old missing'),
    row(
      english.collection,
      '/wiki/untranslated',
      '~/demo/Untranslated missing'
    ),
    row(english.collection, '/wiki/bare', 'Own missing')
  ];
  const context = {
    source: current,
    sources,
    locale: 'de',
    fallbackLocale: 'en'
  };
  expect(wikiOriginCollections(context)).toEqual([
    german.collection,
    english.collection
  ]);
  expect(
    wikiViewerMaintenance(pages, context).wanted.map((entry) => entry.title)
  ).toEqual(['Untranslated missing']);
  expect(
    wikiViewerMaintenance(pages, { ...context, source: old }).wanted.map(
      (entry) => [entry.title, entry.linkers[0]?.collection]
    )
  ).toEqual([['Old missing', german.collection]]);
});
