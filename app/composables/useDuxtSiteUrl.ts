/**
 * The site's own origin, and paths made absolute against it.
 *
 * duxt cannot guess this — a layer has no idea what domain it will be served
 * from — so it reads `i18n.baseUrl`, the one place a Nuxt site already has to
 * state it for hreflang. Where it is unset, `absolute()` hands back the path
 * unchanged: a relative `canonical` is valid and resolves correctly, whereas a
 * guessed origin in a `canonical` is actively wrong. Same stance `app.vue`
 * takes on the alternate links, for the same reason.
 *
 * Set `NUXT_PUBLIC_I18N_BASE_URL` in the deployment, or `i18n.baseUrl` in the
 * consumer's nuxt.config.
 */
export function useDuxtSiteUrl() {
  const runtime = useRuntimeConfig().public as {
    i18n?: { baseUrl?: string };
  };

  const origin = computed(
    () => runtime.i18n?.baseUrl?.replace(/\/+$/, '') ?? ''
  );

  const absolute = (path: string) =>
    origin.value ? `${origin.value}${path}` : path;

  return { origin, absolute };
}
