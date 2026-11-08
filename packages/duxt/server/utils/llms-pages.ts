import { queryCollection } from '@nuxt/content/nitro';
import type { H3Event } from 'h3';
import {
  sourcesForRoute,
  type DuxtResolvedSource
} from '../../build/sources/sources-resolve';
import { duxtPageSearchable } from '../../app/utils/page-controls';

/** Enumerate public pages, selecting the same collection chain as HTML. */
export async function llmsPages(
  event: H3Event,
  sources: DuxtResolvedSource[] = [],
  includeRawbody = false
) {
  // llms.txt is a map of the documentation a reader should start with. Older
  // versions stay published at their own URLs, but making an agent choose
  // between them repeats a decision the source manifest has already made.
  const defaultSources = sources.filter((source) => source.isDefault);
  const i18n = (
    useRuntimeConfig(event).public as unknown as {
      i18n?: {
        locales?: (string | { code: string })[];
        defaultLocale?: string;
        strategy?: string;
      };
    }
  ).i18n;
  const fallbackLocale = event.context.nuxtI18n?.vueI18nOptions
    ?.fallbackLocale as string | string[] | undefined;
  const codes = (i18n?.locales ?? []).map((locale) =>
    typeof locale === 'string' ? locale : locale.code
  );
  const defaultLocale = i18n?.defaultLocale ?? codes[0];
  const strategy = i18n?.strategy ?? 'prefix_except_default';
  const locales =
    strategy === 'no_prefix' || !codes.length ? [defaultLocale] : codes;
  const collections = sources.length
    ? [...new Set(defaultSources.map((source) => source.collection))]
    : ['docs'];
  // `search` travels with every row so the opt-out is applied once, here, and
  // not in the two routes: llms.txt and llms-full.txt are one index in two
  // shapes, and a page hidden from one but listed in the other is a bug nobody
  // would go looking for.
  const fields = includeRawbody
    ? (['path', 'title', 'description', 'rawbody', 'search', 'type'] as const)
    : (['path', 'title', 'description', 'search'] as const);
  const entries = await Promise.all(
    collections.map(
      async (name) =>
        [
          name,
          (
            await queryCollection(
              event,
              name as Parameters<typeof queryCollection>[1]
            )
              .select(...fields)
              .all()
          ).filter((page) => duxtPageSearchable(page))
        ] as const
    )
  );
  const pagesByCollection = new Map(
    entries.map(([name, pages]) => [
      name,
      new Map(
        pages.filter((page) => page.path).map((page) => [page.path, page])
      )
    ])
  );
  const paths = new Set(
    entries.flatMap(([, pages]) =>
      pages.map((page) => page.path).filter(Boolean)
    )
  );
  type ExportPage = (typeof entries)[number][1][number] & {
    duxtSource?: DuxtResolvedSource;
    contentPath?: string;
    duxtLocale?: string;
  };
  const result = new Map<string, ExportPage>();

  for (const locale of locales) {
    for (const path of paths) {
      const chain = sources.length
        ? sourcesForRoute(path, locale, defaultSources, fallbackLocale).map(
            (source) => source.collection
          )
        : ['docs'];
      const name = chain.find((name) => pagesByCollection.get(name)?.has(path));
      const page = name && pagesByCollection.get(name)?.get(path);
      if (!page) continue;
      const prefixed =
        locale &&
        strategy !== 'no_prefix' &&
        (strategy !== 'prefix_except_default' || locale !== defaultLocale);
      const publicPath = prefixed
        ? `/${locale}${path === '/' ? '' : path}`
        : path;
      const provenance = {
        duxtSource: sources.find((source) => source.collection === name),
        contentPath: path,
        duxtLocale: locale
      };
      result.set(publicPath, { ...page, path: publicPath, ...provenance });
      if (strategy === 'prefix_and_default' && locale === defaultLocale)
        result.set(path, { ...page, path, ...provenance });
    }
  }
  return [...result.values()].sort((a, b) => a.path.localeCompare(b.path));
}
