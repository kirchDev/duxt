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
 * ONE VERSION PER REPOSITORY. Searching every version returns each page as many
 * times as there are versions, which buries the answer under its own history.
 * So each repository contributes the version the reader is in, or its default.
 */
export function useDuxtSearch() {
  const duxt = useDuxtConfig();
  const { collection, source } = useDuxtCollection();

  const sources = computed(() => duxt.resolvedSources ?? []);

  /**
   * The collections to search, one per repository.
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

  const { search: searchApproximately } = useFuzzySearch(collection, {
    ignoredTags: ['table']
  });

  /** One entry per repository: the version being read, else that repo's default. */
  const active = computed(() => {
    const current = source.value;
    const byRepo = new Map<string, (typeof searchable)[number]>();

    for (const entry of searchable) {
      const key = entry.repo ?? '';
      const chosen = byRepo.get(key);

      if (entry.collection === current?.collection) {
        byRepo.set(key, entry);
        continue;
      }

      if (chosen?.collection === current?.collection) continue;
      if (!chosen || (entry.isDefault && !chosen.isDefault)) {
        byRepo.set(key, entry);
      }
    }

    // The source being read leads; the rest keep the config's own order.
    return [...byRepo.values()].sort((a, b) =>
      a.collection === current?.collection
        ? -1
        : b.collection === current?.collection
          ? 1
          : 0
    );
  });

  /** Only worth a badge when there is more than one thing to tell apart. */
  const labelled = computed(() => active.value.length > 1);

  const labelOf = (entry: (typeof searchable)[number]) =>
    [entry.repo, entry.version].filter(Boolean).join(' ') ||
    entry.prefix ||
    '/';

  async function init() {
    await Promise.all(
      searches
        .filter((search) => active.value.includes(search.entry))
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
    if (!term.trim()) return { hits: [], approximate: false };

    const wanted = active.value;

    const lists = await Promise.all(
      searches
        .filter((entry) => wanted.includes(entry.entry))
        .map(async (entry) => {
          const hits = (await entry.search(term, {
            limit
          })) as DuxtSearchSection[];

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
    // leaves the reader with an empty box. Fuse gets a second look — over the
    // collection being read only, because building an approximate index per
    // source to answer a typo is more than the answer is worth.
    return { hits: await searchApproximately(term, limit), approximate: true };
  }

  return { search, init, labelled };
}
