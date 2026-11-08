import { sourcesForRoute } from '@kirchdev/duxt/sources-resolve';
import { wikiName, type WikiPage } from './metadata';
import { wikiLinkScope, type WikiLinkContext } from './wikilink-resolution';
import { collectionWantedRoute } from './wanted-routes';
import { wikiMaintenance, wikiPageKey } from './wiki-maintenance';

/** Qualified incoming edges can originate in any published Wiki edition. */
export function wikiOriginCollections(context: WikiLinkContext): string[] {
  const prefixes = new Set(
    context.sources
      .filter((source) => source.pageType === 'article')
      .map((source) => source.prefix)
  );
  return [
    ...new Set(
      [...prefixes].flatMap((prefix) =>
        sourcesForRoute(
          prefix || '/',
          context.locale,
          context.sources,
          context.fallbackLocale
        ).map((source) => source.collection)
      )
    )
  ];
}

function visible(pages: WikiPage[], collections: string[]): WikiPage[] {
  const rows = new Map<string, WikiPage>();
  for (const collection of collections)
    for (const page of pages.filter((page) => page.collection === collection))
      if (!rows.has(page.path)) rows.set(page.path, page);
  return [...rows.values()];
}

/** Preserve local scope; foreign rows contribute only their explicit edges here. */
export function wikiViewerMaintenance(
  pages: WikiPage[],
  context: WikiLinkContext
) {
  const own = visible(
    pages,
    wikiLinkScope('', context).chain.map((source) => source.collection)
  );
  const keys = new Set(own.map(wikiPageKey));
  const foreign = visible(pages, wikiOriginCollections(context))
    .filter((page) => !keys.has(wikiPageKey(page)))
    .flatMap((page) => {
      const source = context.sources.find(
        (source) => source.collection === page.collection
      )!;
      const links = page.links.filter((link) => {
        if (!link.target.startsWith('~/')) return false;
        if (
          link.kind === 'wiki' &&
          !['article', 'category', 'disambiguation'].includes(
            page.type ?? source.pageType ?? 'docs'
          )
        )
          return false;
        return (
          wikiLinkScope(link.target, { ...context, source }).source.prefix ===
          context.source.prefix
        );
      });
      return links.length ? [{ ...page, links }] : [];
    });
  const findings = wikiMaintenance(
    pages,
    context.sources,
    [...own, ...foreign],
    context.fallbackLocale,
    context.locale
  );
  const wanted = new Map<string, (typeof findings.wanted)[number]>();
  for (const entry of findings.wanted) {
    if (
      entry.href.split('?')[0] !== collectionWantedRoute(context.source.prefix)
    )
      continue;
    const key = wikiName(entry.title);
    const previous = wanted.get(key);
    if (!previous) wanted.set(key, { ...entry, linkers: [...entry.linkers] });
    else
      for (const linker of entry.linkers)
        if (
          !previous.linkers.some(
            (page) => wikiPageKey(page) === wikiPageKey(linker)
          )
        )
          previous.linkers.push(linker);
  }
  return {
    ...findings,
    wanted: [...wanted.values()],
    orphaned: findings.orphaned.filter((page) => keys.has(wikiPageKey(page))),
    deadEnds: findings.deadEnds.filter((page) => keys.has(wikiPageKey(page))),
    uncategorized: findings.uncategorized.filter((page) =>
      keys.has(wikiPageKey(page))
    )
  };
}
