import { sourcesForRoute } from '../../sources-resolve';

/**
 * Which collection serves the current route.
 *
 * `duxtSources` generates one collection per source, version and language,
 * named after what it serves. Every query in the theme has to ask the right
 * one, or a site with two sources shows nothing at all — the collection a
 * single source produces is called `docs`, and the ones a versioned or
 * translated site produces are not.
 *
 * The choice itself is `sourcesForRoute`, pure and tested beside the resolver,
 * so the devtools path debugger answers with the same chain rather than a
 * second implementation of it. This composable is the reactive wrapper: the
 * route, the locale, and vue-i18n's own fallback — used so the interface and
 * the pages agree on where a missing translation resolves to.
 *
 * The manifest reaches the app through `app.config.ts`, because Content loads
 * `content.config.ts` in its own pass and the app never sees the result. Both
 * come from one call site; see the Sources reference.
 */
export function useDuxtCollection() {
  const duxt = useDuxtConfig();
  const path = useDuxtPath();
  const { locale, fallbackLocale } = useI18n();

  const sources = computed(() => duxt.resolvedSources ?? []);

  /**
   * The collections to try, best first.
   *
   * One entry on a site without translations, which is every site that does
   * not set `locales` — and then this composable behaves exactly as it did
   * before the key existed.
   */
  const chain = computed(() =>
    sourcesForRoute(
      path.value,
      locale.value,
      sources.value,
      fallbackLocale.value as string | string[] | undefined
    )
  );

  const current = computed(() => chain.value[0]);

  /**
   * The default-language entry for this prefix.
   *
   * The one collection guaranteed to hold every page, which is what a
   * navigation tree has to be built from — see `overlayTranslations`.
   */
  const base = computed(
    () =>
      sources.value.find(
        (source) =>
          source.prefix === current.value?.prefix && source.isDefaultLocale
      ) ?? current.value
  );

  /** Cast because the name is data: Content types collections from the config. */
  const name = computed(
    () => (current.value?.collection ?? 'docs') as DuxtCollectionName
  );

  return {
    collection: name,
    /** The complete tree's collection — the default language for this prefix. */
    baseCollection: computed(
      () => (base.value?.collection ?? 'docs') as DuxtCollectionName
    ),
    source: current,
    /** The collections a missing page falls back to, after the first. */
    fallbacks: computed(() => chain.value.slice(1)),
    /**
     * Whether this site declares translations at all.
     *
     * Without it the fallback banner cannot be told apart from the normal
     * state of a single-language site: there, every locale but the default one
     * is served the same pages by design, and announcing that as a missing
     * translation would put a notice on six of seven languages of every duxt
     * site that never asked for any of this.
     */
    translates: computed(() =>
      sources.value.some((source) => source.locale && !source.isDefaultLocale)
    ),
    sources: computed(() => sources.value)
  };
}
