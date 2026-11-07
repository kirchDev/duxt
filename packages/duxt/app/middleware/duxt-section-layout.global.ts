import { sourcesForRoute } from '../../build/sources/sources-resolve';

/** Choose the shell before rendering so navigating within it keeps its state. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (!('slug' in to.params)) return;
  const app = useNuxtApp();
  // Nuxt restores the SSR layout from payload.state._layout. Re-querying on
  // hydration would download SQLite and collection dumps just to repeat it.
  if (import.meta.client && app.isHydrating && app.payload.serverRendered)
    return;
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
    (setPageLayout as (name: string) => void)(type.layout);
    return;
  }
});
