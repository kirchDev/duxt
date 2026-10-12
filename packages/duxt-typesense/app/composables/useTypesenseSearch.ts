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
import { localeCodesOf, stripLocalePrefix } from '@duxt/utils/locale-path';
import type { DuxtSearchHit } from '@duxt/composables/useDuxtSearch';
import { searchTypesense } from '../../search';
import type { TypesenseSearchOptions } from '../../search';

/** Reuses duxt's dialog and selects the current/default edition per artefact. */
export function useTypesenseSearch() {
  const duxt = useDuxtConfig();
  const { source } = useDuxtCollection();
  const { locale, fallbackLocale, locales } = useI18n();
  const runtime = useRuntimeConfig();
  const options = runtime.public.duxtTypesense as TypesenseSearchOptions;
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
  const inventory = new Map<string, Promise<Set<string>>>();
  function paths(collection: string) {
    let pending = inventory.get(collection);
    if (!pending) {
      pending = queryCollection(
        collection as Parameters<typeof queryCollection>[0]
      )
        .select('path')
        .all()
        .then((rows) => new Set(rows.map((row) => row.path)))
        .catch((error) => {
          inventory.delete(collection);
          throw error;
        });
      inventory.set(collection, pending);
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
    const scope = wanted.map((entry) => ({
      source: identity(entry),
      version: entry.version,
      locale: contentLocale(entry)
    }));
    try {
      // A preferred translation covers the whole page, including sections or
      // terms that only occur in the original. Query results cannot prove this.
      const covered = await Promise.all(
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
      const hits: DuxtSearchHit[] = [];
      const pageSize = Math.min(250, Math.floor(limit));
      for (let page = 1; scope.length; page++) {
        const records = await searchTypesense(
          term,
          options,
          scope,
          pageSize,
          fetch,
          page
        );
        for (const record of records) {
          const index = wanted.findIndex(
            (candidate) =>
              identity(candidate) === record.source &&
              candidate.version === record.version &&
              contentLocale(candidate) === record.locale
          );
          if (
            index < 0 ||
            covered[index]!.has(
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
            ...(labelled.value && entry
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
          if (hits.length >= limit) return { hits, approximate: false };
        }
        if (records.length < pageSize) break;
      }
      return { hits, approximate: false };
    } catch {
      console.warn('[duxt-typesense] Search unavailable');
      return { hits: [], approximate: false };
    }
  }
  return { search, init: async () => {}, labelled };
}
