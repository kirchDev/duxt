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
  const route = useRoute();
  const duxt = useDuxtConfig();

  const section = computed(() =>
    duxt.sections?.find(
      (candidate) => candidate.to && route.path.startsWith(candidate.to)
    )
  );

  const items = computed<ContentNavigationItem[]>(() => {
    const tree = navigation.value ?? [];
    const path = section.value?.to;

    if (!path) return tree;

    // Search the whole tree, not just its top level. With a URL prefix the
    // section sits one level down — a site serving `/duxt/structure` has
    // `/duxt` at the root and the section inside it — and looking only at the
    // top left the sidebar empty on every prefixed site.
    const find = (
      entries: ContentNavigationItem[]
    ): ContentNavigationItem | undefined => {
      for (const entry of entries) {
        if (entry.path === path) return entry;

        const inside = entry.children?.length
          ? find(entry.children)
          : undefined;
        if (inside) return inside;
      }

      return undefined;
    };

    const branch = find(tree);
    return branch?.children?.length
      ? branch.children
      : branch
        ? [branch]
        : tree;
  });

  return { section, items };
}
