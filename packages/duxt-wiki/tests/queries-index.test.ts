import { expect, it } from 'vitest';
import { resolveWikiTargets } from '../queries';
import { wikiLinkScope } from '../wikilink-resolution';
import { wikiName, type WikiPage } from '../metadata';
import type { DuxtResolvedSource } from '@kirchdev/duxt/sources-resolve';

/**
 * `resolveWikiTargets` looks targets up in an index instead of filtering every
 * row for every link. That is only a speed-up if it never changes a result, so
 * this compares it with the filter it replaced, row for row and in order.
 */
function filtered(
  pages: WikiPage[],
  targets: string[],
  prefix = ''
): { target: string; pages: WikiPage[] }[] {
  const visible = new Map<string, WikiPage>();
  for (const page of pages)
    if (!visible.has(page.path)) visible.set(page.path, page);
  const rows = [...visible.values()];
  return targets.map((target) => {
    const name = wikiName(target.split('#')[0]!);
    if (!name) return { target, pages: [] };
    const path = name.startsWith('~/')
      ? name.slice(1)
      : prefix &&
          !name.startsWith(`${wikiName(prefix)}/`) &&
          name !== wikiName(prefix)
        ? `${wikiName(prefix)}/${name.replace(/^\//, '')}`
        : `/${name.replace(/^\//, '')}`;
    const matched = rows.filter(
      (page) =>
        wikiName(page.path) === path ||
        (!name.startsWith('/') &&
          !name.startsWith('~/') &&
          [page.title, ...page.aliases].some(
            (value) => wikiName(value) === name
          ))
    );
    const collection = matched[0]?.collection;
    let candidates = matched.filter((page) => page.collection === collection);
    const disambiguations = candidates.filter(
      (page) => page.type === 'disambiguation' && wikiName(page.title) === name
    );
    if (disambiguations.length === 1) candidates = disambiguations;
    return { target, pages: candidates };
  });
}

const page = (
  collection: string,
  path: string,
  title: string,
  extra: Partial<WikiPage> = {}
): WikiPage => ({
  collection,
  path,
  title,
  links: [],
  categories: [],
  aliases: [],
  ...extra
});

const pages = [
  page('docs_de', '/wiki/mode', 'Modus', { aliases: ['Fast', 'Élite'] }),
  page('docs', '/wiki/mode', 'Mode', { aliases: ['fast'] }),
  page('docs', '/wiki/fast', 'Fast'),
  page('docs', '/wiki/Mercury', 'Mercury', { type: 'disambiguation' }),
  page('docs', '/wiki/mercury-planet', 'Mercury', { aliases: ['Planet'] }),
  page('docs', '/wiki/mercury-element', 'Mercury'),
  page('docs', '/wiki/category/modes', 'Modes', { type: 'category' }),
  page('docs_v1', '/v1/wiki/mode', 'Mode'),
  page('docs', '/guides', 'Guides', { aliases: ['  Élite  '] }),
  page('docs', '/wiki/ÉLITE', 'Elite page')
];

const targets = [
  'Fast',
  'fast#Section',
  'Mode',
  'mode',
  '/wiki/mode',
  'wiki/mode',
  '~/v1/wiki/mode',
  'Mercury',
  'Planet',
  'Élite',
  'élite',
  'Guides',
  '/guides',
  'category/Modes',
  'Missing',
  '',
  '#only'
];

it('resolves every target to the rows the filter matched, in order', () => {
  for (const prefix of ['', '/wiki', '/v1'])
    expect(resolveWikiTargets(pages, targets, prefix)).toEqual(
      filtered(pages, targets, prefix)
    );
});

it('indexes a new row list rather than reusing another one', () => {
  const before = resolveWikiTargets(pages, ['Fast'])[0]!.pages;
  // Without the German row, `Fast` resolves into `docs` instead.
  const fewer = pages.filter((row) => row.collection !== 'docs_de');
  const after = resolveWikiTargets(fewer, ['Fast']);
  expect(after).toEqual(filtered(fewer, ['Fast']));
  expect(after[0]!.pages).not.toEqual(before);
});

it('answers a repeated scope from its manifest and source', () => {
  const source = {
    collection: 'docs',
    prefix: '',
    isDefaultLocale: true
  } as DuxtResolvedSource;
  const sources = [source];
  const context = { source, sources, locale: 'en' };

  expect(wikiLinkScope('Mode', context)).toBe(
    wikiLinkScope('Mode', { ...context })
  );
  expect(wikiLinkScope('Mode', context)).not.toBe(
    wikiLinkScope('Mode', { ...context, sources: [source] })
  );
  expect(wikiLinkScope('Other', context).name).toBe('Other');
});
