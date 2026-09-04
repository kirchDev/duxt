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

  const items = computed(() =>
    sectionItems(navigation.value ?? [], section.value?.to, route.path)
  );

  return { section, items };
}
