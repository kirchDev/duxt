import { expect, it } from 'vitest';
import { resolveSources } from '@kirchdev/duxt/sources-resolve';
import type { WikiPage } from '../metadata';
import { wikiMaintenance } from '../wiki-maintenance';

it('reports wanted pages, backlinks, orphans, dead ends and uncategorized pages without turning misses into warnings', () => {
  const sources = resolveSources([{ path: 'docs', slug: 'wiki' }]);
  const collection = sources[0]!.collection;
  const page = (
    path: string,
    title: string,
    links: WikiPage['links'] = [],
    categories: string[] = []
  ): WikiPage => ({ collection, path, title, links, categories, aliases: [] });
  const rows = [
    page(
      '/wiki/a',
      'A',
      [
        { kind: 'wiki', target: 'B' },
        { kind: 'wiki', target: 'Missing' }
      ],
      ['Pages']
    ),
    page('/wiki/b', 'B'),
    page('/wiki/orphan', 'Orphan')
  ];
  const report = wikiMaintenance(rows, sources);
  expect(
    report.wanted.map((w) => [w.title, w.linkers.map((p) => p.path)])
  ).toEqual([['Missing', ['/wiki/a']]]);
  expect(report.backlinks[`${collection}\0/wiki/b`]).toEqual([rows[0]]);
  expect(report.orphaned.map((p) => p.path)).toEqual([
    '/wiki/a',
    '/wiki/orphan'
  ]);
  expect(report.deadEnds.map((p) => p.path)).toEqual([
    '/wiki/b',
    '/wiki/orphan'
  ]);
  expect(report.uncategorized.map((p) => p.path)).toEqual([
    '/wiki/b',
    '/wiki/orphan'
  ]);
  expect(report.warnings).toEqual([]);
});

it('uses the reader locale for a fallback article just as its rendered links do', () => {
  const sources = resolveSources(
    [{ path: 'docs', slug: 'wiki', locales: ['en', 'de'] }],
    { defaultLocale: 'en' }
  );
  const english = sources.find((source) => source.isDefaultLocale)!;
  const german = sources.find((source) => source.locale === 'de')!;
  const origin: WikiPage = {
    collection: english.collection,
    path: '/wiki/article',
    title: 'Article',
    aliases: [],
    categories: [],
    links: [{ kind: 'wiki', target: 'Deutsch only' }]
  };
  const target: WikiPage = {
    collection: german.collection,
    path: '/wiki/target',
    title: 'Deutsch only',
    aliases: [],
    categories: [],
    links: []
  };
  const result = wikiMaintenance(
    [origin, target],
    sources,
    [origin],
    'en',
    'de'
  );
  expect(result.wanted).toEqual([]);
  expect(result.backlinks[`${german.collection}\0/wiki/target`]).toEqual([
    origin
  ]);
});
