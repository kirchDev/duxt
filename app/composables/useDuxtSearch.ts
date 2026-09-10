import type { DuxtResolvedSource } from '../../sources-resolve';
import { searchSources } from '../utils/search-scope';
import type { DuxtSearchSection } from '@duxt/composables/useFuzzySearch';

/** A hit, with the source it came out of. */
export interface DuxtSearchHit extends DuxtSearchSection {
  /** Undefined on a site with one source: there is nothing to distinguish. */
  source?: { label: string; collection: string };
}

/**
 * Search across every source, not just the one being read.
 *
 * A site pulling three repositories had three separate searches, and which one
 * a reader got depended on which page they happened to be standing on. This is
 * the thing the `sources` model makes possible and a single-repository theme
 * cannot do at all.
 *
 * RANKED TOGETHER, NOT GROUPED PER REPOSITORY. The choice matters and it is not
 * obvious. Grouping per repository asks the reader to know which project their
 * answer is in — but if they knew that, the search would be doing less work
 * than the sidebar. So the lists are interleaved by rank and each hit carries a
 * badge saying where it came from: the best answers first, provenance kept.
 * The source being read goes first in each round, because a reader searching
 * inside a project usually means that project.
 *
 * ONE VERSION PER ARTEFACT. Searching every version returns each page as many
 * times as there are versions, which buries the answer under its own history.
 * Each docs tree and generated declaration contributes its current or default edition.
 */
export function useDuxtSearch() {
  const duxt = useDuxtConfig();
  const { source } = useDuxtCollection();
  const { locale, fallbackLocale } = useI18n();

  const sources = computed(() => duxt.resolvedSources ?? []);

  /**
   * The available collections; only selected editions are initialized.
   *
   * Fixed at setup, deliberately: each one needs its own `useSearchCollection`,
   * and a composable list that grows with the route is not a thing. The
   * manifest is build-time config and does not change while the app is running,
   * so the set is complete from the start; which of them is FIRST still follows
   * the route.
   */
  const searchable = sources.value.length
    ? [
        ...new Map(
          sources.value.map((entry) => [entry.collection, entry])
        ).values()
      ]
    : [];

  const searches = searchable.map((entry) => ({
    entry,
    ...useSearchCollection(
      entry.collection as unknown as Parameters<typeof useSearchCollection>[0],
      {
        // A table is flattened into one string, so its cells run together —
        // `KeyWhat it controlstitleThe name in the navbar…`. Its content is
        // still reachable through the page that holds it.
        ignoredTags: ['table'],
        immediate: false
      }
    )
  }));

  /**
   * The approximate pass, one index per source.
   *
   * It used to run over the collection being read alone, which made a typo
   * quietly narrow the search from every source back to one — the reader who
   * most needed the other repositories searched was the reader who had
   * mistyped. Each index is still built on first use and only on the path FTS
   * could not answer, so a reader who types accurately downloads none of them.
   */
  const approximate = searchable.map((entry) => ({
    entry,
    search: useFuzzySearch(entry.collection as DuxtCollectionName, {
      ignoredTags: ['table']
    }).search
  }));

  /** Selected editions, ordered by artefact and then preferred language. */
  const active = computed(() =>
    searchSources(
      searchable,
      source.value,
      locale.value,
      fallbackLocale.value as string | string[] | undefined
    )
  );

  const pagePaths = new Map<string, Promise<Set<string>>>();
  function paths(collection: string) {
    let pending = pagePaths.get(collection);
    if (!pending) {
      pending = queryCollection(collection as DuxtCollectionArg)
        .select('path')
        .all()
        .then((pages) => new Set(pages.map((page) => page.path)))
        .catch((error) => {
          pagePaths.delete(collection);
          throw error;
        });
      pagePaths.set(collection, pending);
    }
    return pending;
  }

  // A fallback may answer only for a PAGE absent from every better language,
  // even when a heading or the search term exists only in the original.
  async function visiblePages(wanted: DuxtResolvedSource[]) {
    return Promise.all(
      wanted.map(async (entry, index) => {
        const preferred = wanted
          .slice(0, index)
          .filter((other) => other.prefix === entry.prefix);
        return new Set(
          (
            await Promise.all(preferred.map((other) => paths(other.collection)))
          ).flatMap((pages) => [...pages])
        );
      })
    );
  }

  /** Only worth a badge when there is more than one thing to tell apart. */
  const labelled = computed(
    () => new Set(active.value.map((entry) => entry.prefix)).size > 1
  );

  const labelOf = (entry: (typeof searchable)[number]) =>
    [entry.repo, entry.version].filter(Boolean).join(' ') ||
    entry.prefix ||
    '/';

  async function init() {
    await Promise.all(
      active.value
        .map((entry) => searches.find((search) => search.entry === entry)!)
        .filter((search) => search.status.value === 'idle')
        .map((search) => search.init())
    );
  }

  /**
   * Interleave by rank.
   *
   * Without scores to compare across collections — each database ranks inside
   * itself — position is the only comparable thing there is. Round-robin over
   * the lists gives every source its best hit before any source gets its
   * second, which is the closest honest approximation of "ranked together".
   */
  function interleave(lists: DuxtSearchHit[][], limit: number) {
    const merged: DuxtSearchHit[] = [];
    const depth = Math.max(0, ...lists.map((list) => list.length));

    for (let rank = 0; rank < depth && merged.length < limit; rank++) {
      for (const list of lists) {
        const hit = list[rank];
        if (hit) merged.push(hit);
        if (merged.length >= limit) break;
      }
    }

    return merged;
  }

  async function search(
    term: string,
    limit = 20
  ): Promise<{ hits: DuxtSearchHit[]; approximate: boolean }> {
    if (!term.trim() || limit <= 0) return { hits: [], approximate: false };

    const wanted = active.value;
    const hidden = await visiblePages(wanted);
    async function visible(
      query: (requested: number) => Promise<DuxtSearchSection[]>,
      index: number
    ) {
      let requested = limit;
      while (true) {
        const hits = await query(requested);
        const shown = hits.filter(
          (hit) => !hidden[index]!.has(hit.id.split('#')[0]!)
        );
        if (
          shown.length >= limit ||
          hits.length < requested ||
          !hidden[index]!.size
        )
          return shown.slice(0, limit);
        requested *= 2;
      }
    }

    const lists = await Promise.all(
      wanted
        .map((source) => searches.find((entry) => entry.entry === source)!)
        .map(async (entry, index) => {
          const hits = await visible(
            async (requested) =>
              (await entry.search(term, {
                limit: requested
              })) as DuxtSearchSection[],
            index
          );

          return hits.map((hit) => ({
            ...hit,
            source: labelled.value
              ? {
                  label: labelOf(entry.entry),
                  collection: entry.entry.collection
                }
              : undefined
          }));
        })
    );

    const merged = interleave(lists, limit);
    if (merged.length) return { hits: merged, approximate: false };

    // FTS matches terms and prefixes, not near-misses, so one wrong letter
    // leaves the reader with an empty box. Fuse gets a second look, over the
    // same sources and merged the same way.
    const fuzzy = await Promise.all(
      wanted
        .map((source) => approximate.find((entry) => entry.entry === source)!)
        .map(async (entry, index) => {
          const hits = await visible(
            (requested) => entry.search(term, requested),
            index
          );

          return hits.map((hit) => ({
            ...hit,
            source: labelled.value
              ? {
                  label: labelOf(entry.entry),
                  collection: entry.entry.collection
                }
              : undefined
          }));
        })
    );

    return { hits: interleave(fuzzy, limit), approximate: true };
  }

  return { search, init, labelled };
}
