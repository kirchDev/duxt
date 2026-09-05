/**
 * The path the DOCUMENTATION is at, as opposed to the one the browser shows.
 *
 * The two differ by the locale segment. Read `stripLocalePrefix` for why every
 * content lookup wants this one rather than `route.path`.
 */
export function useDuxtPath() {
  const route = useRoute();
  const { locales } = useI18n();

  const codes = computed(() =>
    locales.value.map((entry) =>
      typeof entry === 'string' ? entry : entry.code
    )
  );

  return computed(() => stripLocalePrefix(route.path, codes.value));
}

/**
 * The counterpart: a documentation path, written back out as a link the
 * current locale can be reached at.
 *
 * Only paths are localised. An absolute URL, a mail link or a bare hash passes
 * through untouched, so the same helper serves the navbar's external entries
 * and the sidebar's internal ones without either side special-casing the other.
 */
export function useDuxtLink() {
  const localePath = useLocalePath();

  return (to?: string) => {
    if (!to?.startsWith('/')) return to;

    // localePath resolves a route, and a trailing anchor is not part of one.
    // Split it off and put it back, so a sidebar entry pointing at a heading
    // keeps pointing at that heading.
    const [path, hash] = to.split('#');
    const localised = localePath(path!);

    return hash ? `${localised}#${hash}` : localised;
  };
}
