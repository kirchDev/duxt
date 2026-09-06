import type Fuse from 'fuse.js';
import type { MaybeRefOrGetter } from 'vue';

/** One entry of Content's search index: a page, or a heading inside one. */
export interface DuxtSearchSection {
  id: string;
  title: string;
  titles: string[];
  level: number;
  content: string;
}

/**
 * Typo tolerance beside Content's FTS index.
 *
 * FTS5 matches terms and prefixes, never near-misses, so a single wrong letter
 * returns nothing at all. Fuse matches approximately over the same sections the
 * database indexes.
 *
 * Both the library and the sections are loaded on the first query the database
 * cannot answer, not when the dialog opens: a reader who types accurately never
 * downloads either. The sections come through Content's client database, which
 * the FTS index has already loaded by then, so the fallback costs no second
 * payload — only Fuse itself.
 */
export function useFuzzySearch(
  /**
   * Which collection to fall back over. A versioned site names its collections
   * after the prefix they serve, so this follows `useDuxtCollection()` once the
   * dialog does — it is passed rather than resolved here to keep the exact and
   * the approximate pass reading the same one.
   */
  collection: MaybeRefOrGetter<DuxtCollectionName> = 'docs' as DuxtCollectionName,
  options?: { ignoredTags?: string[] }
) {
  let index: Promise<Fuse<DuxtSearchSection>> | undefined;
  let indexedFor: string | undefined;

  async function build(name: DuxtCollectionName) {
    const [{ default: Fuse }, sections] = await Promise.all([
      import('fuse.js'),
      queryCollectionSearchSections(name as DuxtCollectionArg, options)
    ]);

    return new Fuse(sections as DuxtSearchSection[], {
      // A hit in the heading outranks one buried in a paragraph, and the
      // headings above a section still say more than its body text.
      keys: [
        { name: 'title', weight: 3 },
        { name: 'titles', weight: 2 },
        { name: 'content', weight: 1 }
      ],

      // By default Fuse scores a match by how near the start of the field it
      // sits, which says nothing about a paragraph — only the quality of the
      // match should count here.
      ignoreLocation: true,

      // Loose enough to survive a transposed letter, tight enough that a short
      // term does not drag in half the documentation.
      threshold: 0.35,
      minMatchCharLength: 3
    });
  }

  async function search(term: string, limit = 20) {
    const name = toValue(collection);

    // Built on first use, and again when the route moves to another collection
    // — otherwise a versioned site would keep answering out of the version the
    // reader happened to arrive from.
    if (!index || name !== indexedFor) {
      indexedFor = name;
      index = build(name);
    }

    const fuse = await index;

    return fuse.search(term, { limit }).map((hit) => hit.item);
  }

  return { search };
}
