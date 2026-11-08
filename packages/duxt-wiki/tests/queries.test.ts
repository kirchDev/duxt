import { expect, it } from 'vitest';
import {
  loadWikiPages,
  resolveWikiTargets,
  wikiIncoming,
  wikiCategory,
  wikiCategoryCycles
} from '../queries';
import type { WikiPage } from '../metadata';

const page = (
  path: string,
  title: string,
  extra: Partial<WikiPage> = {}
): WikiPage => ({
  collection: 'docs_wiki',
  path,
  title,
  links: [],
  categories: [],
  aliases: [],
  ...extra
});

it('resolves a whole page by title, alias and path without SQL text filters', async () => {
  const data = [
    page('/wiki/mode', 'Élite_%', { aliases: ['Fast'], categories: ['Modes'] }),
    page('/wiki/linker', 'Linker', {
      links: [{ target: 'FAST#Part', kind: 'wiki' }]
    })
  ];
  const reads: number[] = [];
  const rows = await loadWikiPages(
    async (_collection, offset, limit) => {
      reads.push(offset);
      return data.slice(offset, offset + limit);
    },
    ['docs_wiki']
  );
  expect(
    resolveWikiTargets(rows, ['ÉLITE_%', 'fast', '/wiki/mode']).map((result) =>
      result.pages.map((row) => row.path)
    )
  ).toEqual([['/wiki/mode'], ['/wiki/mode'], ['/wiki/mode']]);
  expect(wikiIncoming(rows, rows[0]!)).toEqual([rows[1]]);
  expect(reads).toEqual([0]);
});

it('uses the preferred locale once, keeps page-less categories and reports cycles', () => {
  const translated = page('/wiki/mode', 'Modus', {
    collection: 'docs_de',
    categories: ['Modes']
  });
  const original = page('/wiki/mode', 'Mode', { categories: ['Modes'] });
  const category = page('/wiki/category/modes', 'Modes', {
    categories: ['Catalog']
  });
  const parent = page('/wiki/category/catalog', 'Catalog', {
    categories: ['Modes']
  });
  const unpaged = page('/wiki/other', 'Other', { categories: ['Unpaged'] });
  const pages = [translated, original, category, parent, unpaged];
  expect(wikiCategory(pages, 'MODES')).toMatchObject({
    page: category,
    parents: ['Catalog'],
    members: [translated, parent],
    subcategories: [parent]
  });
  expect(wikiCategory(pages, 'Unpaged')).toMatchObject({
    page: undefined,
    parents: [],
    members: [unpaged]
  });
  expect(wikiCategoryCycles(pages)).toEqual([['Modes', 'Catalog', 'Modes']]);
});

it.each([false, true])(
  'collects incoming links from the visible locale only (preferred links: %s)',
  (preferredLinks) => {
    const target = page('/wiki/to', 'Target', { collection: 'docs_de' });
    const translated = page('/wiki/from', 'Von', {
      collection: 'docs_de',
      links: preferredLinks ? [{ target: 'Target', kind: 'wiki' }] : []
    });
    const original = page('/wiki/from', 'From', {
      links: [{ target: 'Target', kind: 'wiki' }]
    });
    const fallbackOnly = page('/wiki/fallback', 'Fallback', {
      links: [{ target: 'Target', kind: 'wiki' }]
    });
    expect(
      wikiIncoming([target, translated, original, fallbackOnly], target)
    ).toEqual(preferredLinks ? [translated, fallbackOnly] : [fallbackOnly]);
  }
);

it('resolves incoming and direct targets against the same visible locale rows', () => {
  const translated = page('/wiki/to', 'Ziel', { collection: 'docs_de' });
  const original = page('/wiki/to', 'Target', { aliases: ['Hidden'] });
  const linker = page('/wiki/from', 'Von', {
    collection: 'docs_de',
    links: [{ target: 'Hidden', kind: 'wiki' }]
  });
  const pages = [translated, linker, original];
  expect(
    resolveWikiTargets(pages, ['Hidden', 'Target', 'Ziel', '/wiki/to'])
  ).toEqual([
    { target: 'Hidden', pages: [] },
    { target: 'Target', pages: [] },
    { target: 'Ziel', pages: [translated] },
    { target: '/wiki/to', pages: [translated] }
  ]);
  expect(wikiIncoming(pages, translated)).toEqual([]);
});

it('pages batches and preserves scope boundaries without guessing duplicate names', async () => {
  const rows = Array.from({ length: 130 }, (_, index) =>
    page(`/wiki/p${index}`, `Title ${index}`)
  );
  rows[0]!.aliases = ['Shared'];
  rows[1]!.aliases = ['Shared'];
  const offsets: number[] = [];
  const loaded = await loadWikiPages(
    async (_collection, offset, limit) => {
      offsets.push(offset);
      return rows.slice(offset, offset + limit);
    },
    ['docs_wiki', 'docs_wiki']
  );
  expect(offsets).toEqual([0, 64, 128]);
  expect(loaded).toHaveLength(130);
  expect(resolveWikiTargets(loaded, ['Shared'])[0]!.pages).toHaveLength(2);
  expect(resolveWikiTargets(loaded, ['Foreign'])[0]!.pages).toEqual([]);
});

it('matches punctuation in titles and keeps ordinary relative links in their page directory', () => {
  const target = page('/wiki/guide/target', 'Mode: Survival');
  const linker = page('/wiki/guide/linker', 'Linker', {
    links: [{ target: './target#part', kind: 'markdown' }]
  });
  expect(
    resolveWikiTargets([target, linker], ['MODE: SURVIVAL'], '/wiki')[0]!.pages
  ).toEqual([target]);
  expect(wikiIncoming([target, linker], target, '/wiki')).toEqual([linker]);
});

it('treats a category page title, alias and URL name as the same membership', () => {
  const category = page('/wiki/category/game-modes', 'Game modes', {
    aliases: ['Play styles']
  });
  const first = page('/wiki/one', 'One', { categories: ['Game modes'] });
  const second = page('/wiki/two', 'Two', { categories: ['Play styles'] });
  expect(wikiCategory([category, first, second], 'game-modes').members).toEqual(
    [first, second]
  );
});
