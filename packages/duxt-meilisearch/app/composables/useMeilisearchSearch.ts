import { computed } from 'vue';
import {
  useDuxtConfig,
  useDuxtCollection,
  useI18n,
  useRuntimeConfig,
  queryCollection
} from '#imports';
import { searchSources } from '@duxt/utils/search-scope';
import { sourceDisplayNames } from '@duxt/utils/search-display';
import { asText } from '@duxt/utils/duxt-text';
import { stripLocalePrefix, localeCodesOf } from '@duxt/utils/locale-path';
import type { DuxtSearchHit } from '@duxt/composables/useDuxtSearch';
import { searchMeilisearch } from '../../search';
import type { MeilisearchSearchOptions } from '../../search';

/** Connect the existing dialog, keeping edition and per-page locale fallback. */
export function useMeilisearchSearch() {
  const duxt = useDuxtConfig();
  const { source } = useDuxtCollection();
  const { locale, fallbackLocale, locales } = useI18n();
  const runtime = useRuntimeConfig();
  const options = runtime.public.duxtMeilisearch as MeilisearchSearchOptions;
  const defaultLocale =
    (runtime.public.i18n as { defaultLocale?: string } | undefined)
      ?.defaultLocale ?? 'en-GB';
  const contentLocale = (entry: { locale?: string }) =>
    entry.locale ?? defaultLocale;
  const identity = (entry: { repo?: string; generated?: { slug: string } }) =>
    `/${[entry.repo, entry.generated?.slug].filter(Boolean).join('/')}`;
  const active = computed(() =>
    searchSources(
      duxt.resolvedSources ?? [],
      source.value,
      locale.value,
      fallbackLocale.value as string | string[] | undefined
    )
  );
  const labelled = computed(() => new Set(active.value.map(identity)).size > 1);
  const names = computed(() =>
    sourceDisplayNames(duxt.resolvedSources ?? [], asText(duxt.title) ?? '')
  );
  const pages = new Map<string, Promise<Set<string>>>();
  function paths(collection: string) {
    let pending = pages.get(collection);
    if (!pending) {
      pending = queryCollection(
        collection as Parameters<typeof queryCollection>[0]
      )
        .select('path')
        .all()
        .then((rows) => new Set(rows.map((row) => row.path)))
        .catch((error) => {
          pages.delete(collection);
          throw error;
        });
      pages.set(collection, pending);
    }
    return pending;
  }
  async function search(
    term: string,
    limit = 20
  ): Promise<{ hits: DuxtSearchHit[]; approximate: boolean }> {
    if (!term.trim() || !Number.isFinite(limit) || limit < 1)
      return { hits: [], approximate: false };
    const wanted = active.value;
    try {
      // A translation covers its entire page even if this query matches only
      // the original. Inventory is read through Content's public query API.
      const hidden = await Promise.all(
        wanted.map(
          async (entry, index) =>
            new Set(
              (
                await Promise.all(
                  wanted
                    .slice(0, index)
                    .filter((preferred) => preferred.prefix === entry.prefix)
                    .map((preferred) => paths(preferred.collection))
                )
              ).flatMap((set) => [...set])
            )
        )
      );
      const codes = localeCodesOf(locales?.value ?? wanted.map(contentLocale));
      const scope = wanted.map((entry, index) => ({
        source: identity(entry),
        version: entry.version,
        locale: contentLocale(entry),
        // Content language and routed locale may differ (es vs es-ES). These
        // are exactly the route forms stripped by the page-preference check.
        excludePages: [...hidden[index]!].flatMap((path) => [
          path,
          ...codes.map((code) => `/${code}${path === '/' ? '' : path}`)
        ])
      }));
      const records = await searchMeilisearch(term, options, scope, limit);
      const hits: DuxtSearchHit[] = [];
      for (const record of records) {
        const index = wanted.findIndex(
          (entry) =>
            identity(entry) === record.source &&
            entry.version === record.version &&
            contentLocale(entry) === record.locale
        );
        if (
          index < 0 ||
          hidden[index]!.has(
            stripLocalePrefix(record.url.split('#')[0]!, codes)
          )
        )
          continue;
        const entry = wanted[index]!;
        hits.push({
          id: record.url,
          title: record.title,
          titles: [],
          content: record.content,
          level: record.url.includes('#') ? 2 : 1,
          ...(labelled.value
            ? {
                source: {
                  name: names.value.get(entry.collection) ?? '',
                  version: entry.version,
                  artefact: entry.generated?.label,
                  collection: entry.collection
                }
              }
            : {})
        });
        if (hits.length >= limit) break;
      }
      return { hits, approximate: false };
    } catch {
      console.warn('[duxt-meilisearch] Search unavailable');
      return { hits: [], approximate: false };
    }
  }
  return { search, init: async () => {}, labelled };
}
