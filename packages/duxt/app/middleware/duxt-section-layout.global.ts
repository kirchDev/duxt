import { sourcesForRoute } from '../../build/sources/sources-resolve';

/** Choose the shell before rendering so navigating within it keeps its state. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (!('slug' in to.params) && !('category' in to.params)) return;
  const app = useNuxtApp();
  // Nuxt restores the SSR layout from payload.state._layout. Re-querying on
  // hydration would download SQLite and collection dumps just to repeat it.
  if (import.meta.client && app.isHydrating && app.payload.serverRendered)
    return;

  // A client navigation to a prerendered page reads the layout the server
  // wrote into that page's payload below. Querying for it instead opened the
  // collection in the browser — SQLite in WebAssembly plus the collection's
  // whole dump — on every navigation, for one column of one row. Nuxt fetches
  // the same payload for the page itself, and the two requests are one.
  const key = `duxt-layout:${to.path}`;
  if (import.meta.client) {
    const layout = (await loadPayload(to.path))?.data?.[key];
    if (typeof layout === 'string') {
      (setPageLayout as (name: string) => void)(layout);
      return;
    }
  }
  const config = useAppConfig().duxt as DuxtConfig | undefined;
  const i18n = useNuxtApp().$i18n as unknown as {
    locales?: { value?: (string | { code: string })[] };
    locale?: { value?: string };
    defaultLocale?: string;
    fallbackLocale?: { value?: string | string[] };
  };
  const codes = localeCodesOf(i18n?.locales?.value);
  const path = stripLocalePrefix(to.path, codes);
  const locale =
    codes.find(
      (code) => to.path === `/${code}` || to.path.startsWith(`/${code}/`)
    ) ??
    i18n?.defaultLocale ??
    i18n?.locale?.value ??
    '';
  const chain = sourcesForRoute(
    path,
    locale,
    config?.resolvedSources ?? [],
    i18n?.fallbackLocale?.value
  );
  for (const source of chain.length
    ? chain
    : [{ collection: 'docs', pageType: undefined }]) {
    const page = await queryCollection(source.collection as DuxtCollectionArg)
      .path(path)
      .select('type')
      .first();
    if (!page) continue;
    const type = duxtPageType(page, source, config?.resolvedPageTypes ?? {});
    // Carried in the payload, which prerendering writes to `_payload.json`.
    if (import.meta.server) app.payload.data[key] = type.layout;
    (setPageLayout as (name: string) => void)(type.layout);
    return;
  }
});
