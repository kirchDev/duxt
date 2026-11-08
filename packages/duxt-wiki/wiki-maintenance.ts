import type { DuxtResolvedSource } from '@kirchdev/duxt/sources-resolve';
import { wikiName, type WikiPage } from './metadata';
import { resolveWikiLink } from './wikilink-resolution';
import { wikiTokens, type WikiToken } from './wikilinks';

export const wikiPageKey = (page: Pick<WikiPage, 'collection' | 'path'>) =>
  `${page.collection}\0${page.path}`;

export interface WikiWantedPage {
  collection: string;
  title: string;
  href: string;
  linkers: WikiPage[];
}

/** Derived from current rows only; no result is retained by runtime readers. */
export function wikiMaintenance(
  pages: WikiPage[],
  sources: DuxtResolvedSource[],
  origins = pages,
  fallbackLocale?: string | string[],
  readerLocale?: string
) {
  const wanted = new Map<string, WikiWantedPage>();
  const backlinks: Record<string, WikiPage[]> = {};
  const outgoing = new Set<string>();
  const warnings = new Set<string>();
  const resolvedLinks: { page: WikiPage; href: string; target: WikiPage }[] =
    [];
  for (const page of origins) {
    const source = sources.find(
      (entry) => entry.collection === page.collection
    );
    if (!source) continue;
    const context = {
      source,
      sources,
      locale: readerLocale ?? source.locale,
      fallbackLocale
    };
    for (const link of page.links) {
      if (/^(?:[a-z]+:|\/\/)/i.test(link.target)) continue;
      if (link.kind === 'markdown' && link.target.startsWith('#')) continue;
      let token: WikiToken | undefined;
      if (link.kind === 'wiki')
        token = wikiTokens(`[[${link.target}]]`, false)[0];
      else {
        const target = (
          link.target.startsWith('/') || link.target.startsWith('~/')
            ? link.target
            : new URL(link.target, `https://wiki.invalid${page.path}`).pathname
        ).split('?')[0]!;
        token = wikiTokens(`[[${target}]]`, false)[0];
      }
      if (!token) continue;
      const result = resolveWikiLink(pages, token, context);
      if (result.ambiguous)
        warnings.add(
          `Shared wiki target "${result.title}" in ${source.prefix || '/'} (${source.collection}); add a disambiguation page.`
        );
      if (result.wanted) {
        if (link.kind !== 'wiki') continue;
        const key = `${result.source.collection}\0${wikiName(result.title)}`;
        const entry = wanted.get(key) ?? {
          collection: result.source.collection,
          title: result.title,
          href: result.href,
          linkers: []
        };
        if (
          !entry.linkers.some(
            (linker) => wikiPageKey(linker) === wikiPageKey(page)
          )
        )
          entry.linkers.push(page);
        wanted.set(key, entry);
      } else if (result.page) {
        if (link.kind === 'wiki')
          resolvedLinks.push({
            page,
            href: `~${result.href}`,
            target: result.page
          });
        if (wikiPageKey(result.page) === wikiPageKey(page)) continue;
        outgoing.add(wikiPageKey(page));
        const key = wikiPageKey(result.page);
        const incoming = (backlinks[key] ??= []);
        if (
          !incoming.some((linker) => wikiPageKey(linker) === wikiPageKey(page))
        )
          incoming.push(page);
      }
    }
  }
  const titles = new Map<string, WikiPage[]>();
  for (const page of origins) {
    const key = `${page.collection}\0${wikiName(page.title)}`;
    const group = titles.get(key) ?? [];
    group.push(page);
    titles.set(key, group);
  }
  for (const group of titles.values()) {
    if (
      group.length > 1 &&
      group.filter((page) => page.type === 'disambiguation').length !== 1
    )
      warnings.add(
        `Shared wiki title "${group[0]!.title}" (${group[0]!.collection}); add a disambiguation page.`
      );
  }
  return {
    wanted: [...wanted.values()].sort((a, b) => a.title.localeCompare(b.title)),
    backlinks,
    orphaned: origins.filter((page) => !backlinks[wikiPageKey(page)]?.length),
    deadEnds: origins.filter((page) => !outgoing.has(wikiPageKey(page))),
    uncategorized: origins.filter((page) => !page.categories.length),
    warnings: [...warnings],
    resolvedLinks
  };
}
