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
  const section = computed(() =>
    [...(duxt.sections ?? []), ...(duxt.navigation ?? [])].find(
      (candidate) => candidate.to && path.value.startsWith(candidate.to)
    )
  );

  const items = computed(() =>
    sectionItems(navigation.value ?? [], section.value?.to, path.value)
  );

  return { section, items };
}
