import {
  sourcesForRoute,
  type DuxtResolvedSource
} from '@kirchdev/duxt/sources-resolve';
import { wikiName, type WikiPage } from './metadata';
import { resolveWikiTargets } from './queries';
import type { WikiToken } from './wikilinks';
import { wikiCategoryName, wikiCategorySlug } from './article';
import { collectionWantedRoute } from './wanted-routes';
export { collectionWantedRoute } from './wanted-routes';

export interface WikiLinkContext {
  source: DuxtResolvedSource;
  sources: DuxtResolvedSource[];
  locale?: string;
  fallbackLocale?: string | string[];
}

type WikiLinkScope = {
  source: DuxtResolvedSource;
  name: string;
  chain: DuxtResolvedSource[];
};

/**
 * Scopes answered once per manifest, source, reader and target.
 *
 * Each one walks the whole manifest for the locale chain, and a maintenance
 * pass asks it for every link of every page — the same few answers thousands
 * of times. Keyed by the manifest and source OBJECTS, so a different manifest
 * never sees another's answers; the results are only ever read.
 */
const scopes = new WeakMap<
  DuxtResolvedSource[],
  WeakMap<DuxtResolvedSource, Map<string, WikiLinkScope>>
>();

export function wikiLinkScope(
  target: string,
  context: WikiLinkContext
): WikiLinkScope {
  let bySource = scopes.get(context.sources);
  if (!bySource) scopes.set(context.sources, (bySource = new WeakMap()));
  let byKey = bySource.get(context.source);
  if (!byKey) bySource.set(context.source, (byKey = new Map()));
  const key = JSON.stringify([
    target,
    context.locale ?? null,
    context.fallbackLocale ?? null
  ]);
  const known = byKey.get(key);
  if (known) return known;
  const scope = computeWikiLinkScope(target, context);
  byKey.set(key, scope);
  return scope;
}

function computeWikiLinkScope(
  target: string,
  context: WikiLinkContext
): WikiLinkScope {
  let source = context.source;
  let name = target;
  if (target.startsWith('~/')) {
    const path = target.slice(1);
    const candidates = context.sources.filter(
      (s) =>
        !s.prefix ||
        wikiName(path) === wikiName(s.prefix) ||
        wikiName(path).startsWith(`${wikiName(s.prefix)}/`)
    );
    source =
      candidates.sort((a, b) => b.prefix.length - a.prefix.length)[0] ?? source;
    name = path.slice(source.prefix.length).replace(/^\//, '');
  }
  const chain = sourcesForRoute(
    source.prefix || '/',
    context.locale ?? source.locale,
    context.sources,
    context.fallbackLocale
  );
  // The requesting source owns its collection before any locale fallback.
  if (!target.startsWith('~/')) {
    const at = chain.findIndex((s) => s.collection === source.collection);
    if (at >= 0) chain.splice(at, 1);
    chain.unshift(source);
  } else source = chain[0] ?? source;
  return { source, name, chain };
}

export function wikiLinkCollections(
  tokens: WikiToken[],
  context: WikiLinkContext
): string[] {
  return [
    ...new Set(
      [
        wikiLinkScope('', context),
        ...tokens.map((token) => wikiLinkScope(token.target, context))
      ].flatMap((scope) => scope.chain.map((source) => source.collection))
    )
  ];
}

/**
 * The rows of a scope's collections, in chain order — one list per chain, so
 * the target index built over it is reused by every link that shares it.
 */
const scopedRows = new WeakMap<WikiPage[], Map<string, WikiPage[]>>();

function scopedPages(
  pages: WikiPage[],
  chain: DuxtResolvedSource[]
): WikiPage[] {
  let byChain = scopedRows.get(pages);
  if (!byChain) scopedRows.set(pages, (byChain = new Map()));
  const key = chain.map((source) => source.collection).join('\0');
  let rows = byChain.get(key);
  if (!rows) {
    rows = chain.flatMap((source) =>
      pages.filter((page) => page.collection === source.collection)
    );
    byChain.set(key, rows);
  }
  return rows;
}

export function resolveWikiLink(
  pages: WikiPage[],
  token: WikiToken,
  context: WikiLinkContext
) {
  const scope = wikiLinkScope(token.target, context);
  const scoped = scopedPages(pages, scope.chain);
  let matched = resolveWikiTargets(
    scoped,
    [scope.name],
    scope.source.prefix
  )[0]!.pages;
  const disambiguations = matched.filter(
    (page) =>
      page.type === 'disambiguation' &&
      wikiName(page.title) === wikiName(scope.name)
  );
  if (disambiguations.length === 1) matched = disambiguations;
  let page = matched.length === 1 ? matched[0] : undefined;
  let categoryPath = scope.name.replace(/^\//, '');
  const lead = scope.source.prefix.replace(/^\//, '');
  if (lead && wikiName(categoryPath).startsWith(`${wikiName(lead)}/`))
    categoryPath = categoryPath.slice(lead.length + 1);
  const category = categoryPath.match(/^category\/([^/]+)$/i);
  if (!page && !matched.length && category) {
    const name = wikiCategoryName(
      category[1]!,
      scoped.flatMap((row) => row.categories)
    );
    if (name)
      page = {
        collection: scope.chain[0]?.collection ?? scope.source.collection,
        path: `${scope.source.prefix}/category/${wikiCategorySlug(name)}`,
        title: name,
        type: 'category',
        links: [],
        aliases: [],
        categories: []
      };
  }
  const fragment = token.section
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\s-]/gu, '')
    .replace(/\s/g, '-');
  return {
    page,
    source: scope.source,
    title: scope.name,
    ambiguous: matched.length > 1,
    wanted: !page,
    href: page
      ? `${page.path}${fragment ? `#${encodeURI(fragment)}` : ''}`
      : `${collectionWantedRoute(scope.source.prefix)}?title=${encodeURIComponent(scope.name)}`
  };
}
