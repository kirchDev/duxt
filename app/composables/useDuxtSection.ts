import type { ContentNavigationItem } from '@nuxt/content';
import type { Ref } from 'vue';

/**
 * The documentation is split into sections, each owning a branch of the tree —
 * so the sidebar shows one branch, not everything. Which branch follows from
 * the path, falling back to the whole tree so a page outside any section still
 * has a sidebar.
 */
export function useDuxtSection(
  navigation: Ref<ContentNavigationItem[] | null | undefined>
) {
  const path = useDuxtPath();
  const duxt = useDuxtConfig();

  /**
   * BOTH ROWS, sections first.
   *
   * A generated section can declare that its entry belongs in the top navbar
   * rather than in the section row (`navigation: 'navigation'`), and a site can
   * put an ordinary page there by hand. Neither stops being the branch its
   * pages sit in — but reading only `sections` said it did: the sidebar fell
   * back to the whole tree, and the breadcrumb lost its head, so a release page
   * printed its own version and nothing above it.
   */
  /**
   * LONGEST MATCH, not the first one written. `/demo` and `/demo/api` both
   * prefix a page under the reference, and taking the first said the reader was
   * in the prose beside it — so the sidebar drew that tree instead of the
   * endpoints. Same rule, and the same bug, as `sourceForPath`.
   */
  /**
   * AT THE READER'S EDITION. The sections are written once, at the default
   * edition — `/concepts` — and on `/v0.2.0/concepts/sources` nothing in that
   * list prefixes the page: no branch was found and the sidebar drew the whole
   * tree, every section at once, on every other version. `sectionsForPath`
   * moves them to the edition being read, the same list the section row shows.
   */
  const section = computed(() =>
    currentSection(
      [
        ...sectionsForPath(
          duxt.sections ?? [],
          duxt.resolvedSources ?? [],
          path.value
        ),
        ...(duxt.navigation ?? [])
      ],
      path.value
    )
  );

  const items = computed(() =>
    sectionItems(navigation.value ?? [], section.value?.to, path.value)
  );

  return { section, items };
}
