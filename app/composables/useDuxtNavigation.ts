import type { ContentNavigationItem } from '@nuxt/content';

/**
 * The collection whose navigation is being fetched.
 *
 * The handler below has to stay one stable function — Nuxt compares handlers
 * by reference and warns when callers of a shared key pass different ones —
 * but it must also follow the route. So it reads the name at call time from
 * here rather than closing over it: binding the name into the closure meant a
 * client-side move from one repository to another refetched under the old
 * collection, and the sidebar kept showing the previous project's pages.
 */
const active = shallowRef<'docs'>('docs');

const handler = () =>
  queryCollectionNavigation(active.value, ['icon', 'description']);

/**
 * The navigation tree for the collection serving this route.
 *
 * The key is a getter, so it tracks the collection: two sources are two trees
 * and must not share one cache entry.
 */
export function useDuxtNavigation() {
  const { collection } = useDuxtCollection();

  // Kept in step before every fetch, including the ones `watch` triggers.
  watchEffect(() => {
    active.value = collection.value;
  });

  return useAsyncData<ContentNavigationItem[]>(
    () => `duxt-navigation-${collection.value}`,
    handler,
    { watch: [collection] }
  );
}
