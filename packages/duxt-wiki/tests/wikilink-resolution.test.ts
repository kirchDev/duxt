import { expect, it } from 'vitest';
import { resolveSources } from '@kirchdev/duxt/sources-resolve';
import type { WikiPage } from '../metadata';
import { resolveWikiLink, wikiLinkCollections } from '../wikilink-resolution';
import { wikiTokens } from '../wikilinks';

const sources = resolveSources(
  [
    {
      repo: 'acme/wiki',
      path: 'docs',
      slug: 'wiki',
      refs: ['main', 'v1'],
      locales: ['en', 'de']
    },
    { path: 'other', slug: 'other' }
  ],
  { defaultLocale: 'en' }
);
const own = sources.find((s) => s.prefix === '/wiki' && s.isDefaultLocale)!;
const translated = sources.find(
  (s) => s.prefix === '/wiki' && s.locale === 'de'
)!;
const old = sources.find((s) => s.prefix === '/wiki/v1' && s.isDefaultLocale)!;
const other = sources.find((s) => s.prefix === '/other')!;
const row = (
  source: typeof own,
  path: string,
  title: string,
  extra: Partial<WikiPage> = {}
): WikiPage => ({
  collection: source.collection,
  path,
  title,
  links: [],
  aliases: [],
  categories: [],
  ...extra
});
const context = {
  source: translated,
  sources,
  locale: 'de',
  fallbackLocale: 'en'
};
const pages = [
  row(own, '/wiki/target', 'Élite_%', { aliases: ['Fast'] }),
  row(old, '/wiki/v1/foreign', 'Old only'),
  row(other, '/other/elsewhere', 'Elsewhere'),
  row(own, '/wiki/shared-a', 'Shared'),
  row(own, '/wiki/shared-b', 'Shared'),
  row(own, '/wiki/mode-a', 'Mode'),
  row(own, '/wiki/mode-b', 'Mode'),
  row(own, '/wiki/modes', 'Mode', { type: 'disambiguation' })
];
const token = (text: string) => wikiTokens(`[[${text}]]`)[0]!;

it('resolves title alias path and sections within locale fallback, never another version', () => {
  for (const name of ['ÉLITE_%', 'fast', 'target', '/target'])
    expect(resolveWikiLink(pages, token(name), context).href).toBe(
      '/wiki/target'
    );
  expect(resolveWikiLink(pages, token('Fast#Part'), context).href).toBe(
    '/wiki/target#part'
  );
  expect(resolveWikiLink(pages, token('Old only'), context)).toMatchObject({
    wanted: true,
    href: '/wiki/wanted?title=Old%20only'
  });
  expect(resolveWikiLink(pages, token('Elsewhere'), context).wanted).toBe(true);
  expect(resolveWikiLink(pages, token('~/other/Elsewhere'), context).href).toBe(
    '/other/elsewhere'
  );
  expect(
    wikiLinkCollections([token('Fast'), token('~/other/Elsewhere')], context)
  ).toEqual([translated.collection, own.collection, other.collection]);
});

it('prefers a disambiguation title and refuses every other shared title', () => {
  expect(resolveWikiLink(pages, token('Mode'), context)).toMatchObject({
    href: '/wiki/modes',
    ambiguous: false,
    wanted: false
  });
  expect(resolveWikiLink(pages, token('Shared'), context)).toMatchObject({
    ambiguous: true,
    wanted: true
  });
});

it('recognizes a case-insensitive virtual category without inventing a wanted page', () => {
  const member = row(own, '/wiki/member', 'Member', {
    categories: ['Unpaged']
  });
  expect(
    resolveWikiLink([member], token('/WIKI/category/UNPAGED'), context)
  ).toMatchObject({ wanted: false, href: '/wiki/category/unpaged' });
});
