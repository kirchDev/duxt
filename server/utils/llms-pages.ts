import { queryCollection } from '@nuxt/content/nitro';
import type { H3Event } from 'h3';
import {
  sourcesForRoute,
  type DuxtResolvedSource
} from '../../sources-resolve';

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
  const fields = includeRawbody
    ? (['path', 'title', 'description', 'rawbody'] as const)
    : (['path', 'title', 'description'] as const);
  const entries = await Promise.all(
    collections.map(
      async (name) =>
        [
          name,
          await queryCollection(
            event,
            name as Parameters<typeof queryCollection>[1]
          )
            .select(...fields)
            .all()
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
  const result = new Map<string, (typeof entries)[number][1][number]>();

  for (const locale of locales) {
    for (const path of paths) {
      const chain = sources.length
        ? sourcesForRoute(path, locale, defaultSources, fallbackLocale).map(
            (source) => source.collection
          )
        : ['docs'];
      const page = chain
        .map((name) => pagesByCollection.get(name)?.get(path))
        .find(Boolean);
      if (!page) continue;
      const prefixed =
        locale &&
        strategy !== 'no_prefix' &&
        (strategy !== 'prefix_except_default' || locale !== defaultLocale);
      const publicPath = prefixed
        ? `/${locale}${path === '/' ? '' : path}`
        : path;
      result.set(publicPath, { ...page, path: publicPath });
      if (strategy === 'prefix_and_default' && locale === defaultLocale)
        result.set(path, { ...page, path });
    }
  }
  return [...result.values()].sort((a, b) => a.path.localeCompare(b.path));
}
