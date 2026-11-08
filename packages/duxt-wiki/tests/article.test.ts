import { expect, it } from 'vitest';
import { splitWikiBody, wikiNavboxGroups, wikiCategoryName } from '../article';

it('places the outline after the lead without changing stored nodes or footnotes', () => {
  const paragraph = ['p', {}, 'Lead'];
  const heading = ['h2', { id: 'history' }, 'History'];
  const notes = ['section', { class: 'footnotes' }, 'Notes'];
  const body = {
    type: 'minimal',
    value: [paragraph, heading, notes],
    toc: { links: [] }
  };
  const result = splitWikiBody(body);
  expect(result.lead.value).toEqual([paragraph]);
  expect(result.rest.value).toEqual([heading, notes]);
  expect(body.value).toHaveLength(3);
});

it('keeps a heading-less article together and uses real category names for virtual URLs', () => {
  expect(splitWikiBody({ value: [['p', {}, 'Only lead']] }).rest.value).toEqual(
    []
  );
  expect(wikiCategoryName('game-modes', ['Game modes', 'Other'])).toBe(
    'Game modes'
  );
  expect(wikiCategoryName('unknown', ['Game modes'])).toBeUndefined();
});

it('groups category members under their child categories, retaining direct members', () => {
  const page = (path: string, title: string, categories: string[]) => ({
    collection: 'wiki',
    path,
    title,
    categories,
    aliases: [],
    links: []
  });
  const pages = [
    page('/wiki/guide', 'Guide', ['Games']),
    page('/wiki/category/modes', 'Modes', ['Games']),
    page('/wiki/fast', 'Fast', ['Modes'])
  ];
  expect(
    wikiNavboxGroups(pages, 'Games').map((g) => [
      g.title,
      g.pages.map((p) => p.title)
    ])
  ).toEqual([
    ['Games', ['Guide']],
    ['Modes', ['Fast']]
  ]);
});
