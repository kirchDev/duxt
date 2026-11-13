/**
 * The path the DOCUMENTATION is at, as opposed to the one the browser shows.
 *
 * The two differ by the locale segment. Read `stripLocalePrefix` for why every
 * content lookup wants this one rather than `route.path`.
 */
export function useDuxtPath() {
  const route = useRoute();
  const { locales } = useI18n();

  const codes = computed(() => localeCodesOf(locales.value));

  return computed(() => stripLocalePrefix(route.path, codes.value));
}

/**
 * Where the ROUTER is — the destination of a navigation still rendering.
 *
 * `useDuxtPath` follows the route the calling component is rendered for, and a
 * layout and the page it holds see a navigation at different moments. For one
 * tick the header can still ask about the page being left, after Nuxt has
 * already released that page's data. A lookup run for that path in the browser
 * answers nothing anybody reads and pays for every collection it touches; this
 * is what tells such a lookup apart from one for the page arriving.
 */
export function useDuxtRouterPath() {
  const router = useRouter();
  const { locales } = useI18n();

  const codes = computed(() => localeCodesOf(locales.value));

  return computed(() =>
    stripLocalePrefix(router.currentRoute.value.path, codes.value)
  );
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
    // A root server route has no locale variant — see `isMachineRoute`.
    if (isMachineRoute(to)) return to;

    // localePath resolves a route, and a trailing anchor is not part of one.
    // Split it off and put it back, so a sidebar entry pointing at a heading
    // keeps pointing at that heading.
    const [path, hash] = to.split('#');
    const localised = localePath(path!);

    return hash ? `${localised}#${hash}` : localised;
  };
}
