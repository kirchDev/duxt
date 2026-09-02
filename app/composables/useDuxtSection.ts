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
  const { duxt } = useAppConfig();

  const section = computed(() =>
    duxt.sections?.find(
      (candidate) => candidate.to && route.path.startsWith(candidate.to)
    )
  );

  const items = computed<ContentNavigationItem[]>(() => {
    const tree = navigation.value ?? [];
    const path = section.value?.to;

    if (!path) return tree;

    // The section's own node is the branch; its children become the sidebar.
    const branch = tree.find((item) => item.path === path);
    return branch?.children?.length
      ? branch.children
      : tree.filter((item) => item.path === path);
  });

  return { section, items };
}
