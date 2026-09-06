import { localeChain } from '../../sources-resolve';

/**
 * Which collection serves the current route.
 *
 * `duxtSources` generates one collection per source, version and language,
 * named after what it serves. Every query in the theme has to ask the right
 * one, or a site with two sources shows nothing at all — the collection a
 * single source produces is called `docs`, and the ones a versioned or
 * translated site produces are not.
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
   * The prefix this route falls under, language aside.
   *
   * Longest matching prefix wins: `/app/v2` beats `/app` on `/app/v2/guide`.
   * Read off the DEFAULT-language entries, because the locale never appears in
   * a content prefix — every language of one source shares the prefix, which
   * is what makes the fallback below a second query for the same path.
   */
  const prefix = computed(() => {
    const candidates = sources.value.filter((source) => source.isDefaultLocale);
    const pool = candidates.length ? candidates : sources.value;

    return (
      (
        [...pool]
          .sort((a, b) => b.prefix.length - a.prefix.length)
          .find(
            (source) => !source.prefix || path.value.startsWith(source.prefix)
          ) ??
        pool.find((source) => !source.prefix) ??
        // The landing page matches NO prefix on a site whose every source has
        // one, and there is no unprefixed source to fall back to. It still needs
        // a real collection for the navigation the header draws — falling
        // through to a literal `docs` names one that such a site does not have,
        // and the failing query took the whole render down with it.
        pool[0]
      )?.prefix ?? ''
    );
    // NEVER undefined. `''` is the root prefix and a real value; undefined
    // matched no source at all, which emptied the chain below and 404ed every
    // page on a site whose manifest had not arrived yet.
  });

  /** Every language this prefix is served in, in the order the config lists. */
  const candidates = computed(() =>
    sources.value.filter((source) => source.prefix === prefix.value)
  );

  /**
   * The collections to try, best first.
   *
   * One entry on a site without translations, which is every site that does
   * not set `locales` — and then this composable behaves exactly as it did
   * before the key existed.
   */
  const chain = computed(() => {
    const available = candidates.value.map((source) => source.locale);

    const wanted = localeChain(
      locale.value,
      available,
      // vue-i18n's own fallback, so the interface and the pages agree on where
      // a missing translation resolves to rather than each carrying a list.
      fallbackLocale.value as string | string[] | undefined
    );

    const ordered = wanted
      .map((code) =>
        candidates.value.find((source) =>
          code === undefined ? source.isDefaultLocale : source.locale === code
        )
      )
      .filter(Boolean) as DuxtResolvedSource[];

    // Never empty. A route whose manifest is missing still has to query
    // SOMETHING — an empty chain means no query at all, and the page then 404s
    // although it exists.
    if (ordered.length) return ordered;
    if (candidates.value.length) return candidates.value.slice(0, 1);

    return sources.value.slice(0, 1);
  });

  const current = computed(() => chain.value[0]);

  /**
   * The default-language entry for this prefix.
   *
   * The one collection guaranteed to hold every page, which is what a
   * navigation tree has to be built from — see `overlayTranslations`.
   */
  const base = computed(
    () =>
      candidates.value.find((source) => source.isDefaultLocale) ?? current.value
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
