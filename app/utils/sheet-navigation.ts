/**
 * The mobile sheet's navigation, with the sections hung where they belong.
 *
 * The desktop header shows two rows: the navbar links up top and the sections
 * below. The sheet has no rows, and listing the two as sibling blocks made the
 * documentation look like a peer of its own parts — "Docs" in one list and
 * "Guides", "ADR", "API" in another, with nothing saying the second is what the
 * first opens.
 *
 * It already is, everywhere else. A navbar entry with no `to` means "the
 * documentation" (see `DuxtHeader.linkTarget`), and `entryActive` lights it
 * wherever ANY section is. This gives that entry the children it has always
 * implied, so the sheet can render one tree instead of two lists.
 *
 * Pure and here rather than inline in the component, because the interesting
 * part is what happens when there is nothing to hang them on — and a section
 * that silently reaches no list at all is unreachable on a phone.
 */

/** The navbar with the sections adopted, plus whatever nobody adopted. */
export interface DuxtSheetNavigation {
  entries: DuxtLink[];
  /**
   * Sections left over.
   *
   * Empty on the ordinary site, where an entry took them. A consumer who
   * replaces `navigation` wholesale — `mergeDuxtConfig` REPLACES an array — may
   * leave no entry that qualifies, and the sheet then renders these as their own
   * block. Dropping them instead would take the whole documentation off the
   * phone.
   */
  sections: DuxtSection[];
}

/**
 * Which entry may adopt the sections: the first with neither a `to` nor
 * children of its own.
 *
 * Both halves matter. An entry WITH a `to` names one page — a consumer wrote a
 * destination and meant it, and appending eight children under it would
 * repurpose their link. An entry that already has children carries a menu the
 * consumer authored, and the sections are not more of it.
 */
function adopts(entry: DuxtLink) {
  return !entry.to && !entry.children?.length;
}

export function buildSheetNavigation(
  navigation: DuxtLink[] | undefined,
  sections: DuxtSection[] | undefined
): DuxtSheetNavigation {
  const entries = navigation ?? [];
  const list = sections ?? [];

  if (!list.length) return { entries, sections: [] };

  const host = entries.findIndex(adopts);
  if (host < 0) return { entries, sections: list };

  return {
    entries: entries.map((entry, index) =>
      index === host ? { ...entry, children: list } : entry
    ),
    sections: []
  };
}
