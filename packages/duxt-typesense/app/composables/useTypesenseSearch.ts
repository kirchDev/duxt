import { computed } from 'vue';
import {
  useDuxtConfig,
  useDuxtCollection,
  useI18n,
  useRuntimeConfig
} from '#imports';
import { searchSources } from '@duxt/utils/search-scope';
import { sourceDisplayNames } from '@duxt/utils/search-display';
import { asText } from '@duxt/utils/duxt-text';
import type { DuxtSearchHit } from '@duxt/composables/useDuxtSearch';
import { searchTypesense } from '../../search';
import type { TypesenseSearchOptions } from '../../search';

/** Reuses duxt's dialog and selects the current/default edition per artefact. */
export function useTypesenseSearch() {
  const duxt = useDuxtConfig();
  const { source } = useDuxtCollection();
  const { locale, fallbackLocale } = useI18n();
  const options = useRuntimeConfig().public
    .duxtTypesense as TypesenseSearchOptions;
  const identity = (entry: { repo?: string; generated?: { slug: string } }) =>
    `/${[entry.repo, entry.generated?.slug].filter(Boolean).join('/')}`;
  const active = computed(() => {
    const selected = searchSources(
      duxt.resolvedSources ?? [],
      source.value,
      locale.value,
      fallbackLocale.value as string | string[] | undefined
    );
    // One available content language per edition: a translated hit must not be
    // buried among identical originals. The full index still retains all locales.
    return [
      ...new Map(
        selected
          .toReversed()
          .map((entry) => [
            JSON.stringify([identity(entry), entry.version]),
            entry
          ])
      ).values()
    ];
  });
  const labelled = computed(() => new Set(active.value.map(identity)).size > 1);
  const names = computed(() =>
    sourceDisplayNames(duxt.resolvedSources ?? [], asText(duxt.title) ?? '')
  );
  async function search(
    term: string,
    limit = 20
  ): Promise<{ hits: DuxtSearchHit[]; approximate: boolean }> {
    const scope = active.value.map((entry) => ({
      source: identity(entry),
      version: entry.version,
      locale: entry.locale ?? 'en'
    }));
    try {
      const records = await searchTypesense(term, options, scope, limit);
      return {
        approximate: false,
        hits: records.map((record) => {
          const entry = active.value.find(
            (candidate) =>
              identity(candidate) === record.source &&
              candidate.version === record.version &&
              (candidate.locale ?? 'en') === record.locale
          );
          return {
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
          };
        })
      };
    } catch {
      console.warn('[duxt-typesense] Search unavailable');
      return { hits: [], approximate: false };
    }
  }
  return { search, init: async () => {}, labelled };
}
