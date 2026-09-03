/**
 * The navigation tree for the collection serving this route.
 *
 * One composable rather than a `useAsyncData` call per component: five of them
 * shared the key `duxt-navigation` while each passed its own handler function,
 * and Nuxt warns on every render that the options for a shared key disagree.
 * Defining the handler once makes them the same call.
 *
 * The key carries the collection name, so two sources do not share one cached
 * tree — on a site serving several repositories they are different trees.
 */
export function useDuxtNavigation() {
  const { collection } = useDuxtCollection();

  return useAsyncData(
    `duxt-navigation-${collection.value}`,
    () => queryCollectionNavigation(collection.value, ['icon', 'description']),
    { watch: [collection] }
  );
}
