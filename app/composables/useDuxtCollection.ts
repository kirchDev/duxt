/**
 * Which collection serves the current route.
 *
 * `duxtSources` generates one collection per source and version, named after
 * the URL prefix it serves. Every query in the theme has to ask the right one,
 * or a site with two sources shows nothing at all — the collection a single
 * source produces is called `docs`, and the ones a versioned site produces are
 * not.
 *
 * The manifest reaches the app through `app.config.ts`, because Content loads
 * `content.config.ts` in its own pass and the app never sees the result. Both
 * come from one call site; see the Sources reference.
 */
export function useDuxtCollection() {
  const duxt = useDuxtConfig();
  const route = useRoute();

  /** Longest matching prefix wins: `/app/v2` beats `/app` on `/app/v2/guide`. */
  const current = computed(() => {
    const sources = duxt.sources ?? [];

    return (
      [...sources]
        .sort((a, b) => b.prefix.length - a.prefix.length)
        .find(
          (source) => !source.prefix || route.path.startsWith(source.prefix)
        ) ?? sources.find((source) => !source.prefix)
    );
  });

  /** Cast because the name is data: Content types collections from the config. */
  const name = computed(() => (current.value?.collection ?? 'docs') as 'docs');

  return {
    collection: name,
    source: current,
    sources: computed(() => duxt.sources ?? [])
  };
}
