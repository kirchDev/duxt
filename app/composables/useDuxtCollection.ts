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
  const path = useDuxtPath();

  /** Longest matching prefix wins: `/app/v2` beats `/app` on `/app/v2/guide`. */
  const current = computed(() => {
    const sources = duxt.resolvedSources ?? [];

    return (
      [...sources]
        .sort((a, b) => b.prefix.length - a.prefix.length)
        .find(
          (source) => !source.prefix || path.value.startsWith(source.prefix)
        ) ??
      sources.find((source) => !source.prefix) ??
      // The landing page matches NO prefix on a site whose every source has
      // one, and there is no unprefixed source to fall back to. It still needs
      // a real collection for the navigation the header draws — falling
      // through to a literal `docs` names one that such a site does not have,
      // and the failing query took the whole render down with it.
      sources[0]
    );
  });

  /** Cast because the name is data: Content types collections from the config. */
  const name = computed(
    () => (current.value?.collection ?? 'docs') as DuxtCollectionName
  );

  return {
    collection: name,
    source: current,
    sources: computed(() => duxt.resolvedSources ?? [])
  };
}
