/**
 * The layout slot a generated section's type renders through.
 *
 * A ROUTE MIDDLEWARE, and deliberately not `<NuxtLayout>` inside the page: a
 * layout rendered from within a page is remounted on every navigation, which
 * would rebuild the header, the section row and the sidebar — losing their
 * scroll and their open groups — on every click of a docs site. `setPageLayout`
 * from a middleware is the one place the choice can be made before the route
 * resolves, so the layout stays where it is and only its name changes.
 *
 * Inert until a type names a layout: `generatedLayout` filters to the sections
 * that do, and a site with none never reaches the path lookup.
 */
export default defineNuxtRouteMiddleware((to) => {
  const sources =
    (useAppConfig().duxt as DuxtConfig | undefined)?.resolvedSources ?? [];

  const layout = generatedLayout(
    // The DOCUMENTATION path, as every other lookup in the theme means it: the
    // locale translates the interface, not the content tree, so the manifest's
    // prefixes have no locale segment in front of them.
    stripLocalePrefix(to.path, localeCodes()),
    sources
  );

  // Cast for the reason `DuxtCollectionName` is a plain string: the name is
  // DATA. Nuxt types `setPageLayout` by the layouts it found in this app, and a
  // type's layout is named in a config the layer cannot see at build time.
  //
  // The FUNCTION is cast, not the argument. `setPageLayout` is generic over
  // `keyof NuxtLayouts`, so `Parameters<typeof setPageLayout>[0]` resolves
  // through a conditional on the type parameter and lands back on `string` —
  // which is then not assignable to the parameter it was derived from. Casting
  // the call signature says the one thing that is actually true: this name is
  // checked at run time, against a registry the compiler cannot see.
  if (layout) (setPageLayout as (name: string) => void)(layout);
});

/**
 * The locales the site serves, read off the plugin rather than `useI18n()`.
 *
 * `useI18n()` wants a component instance; a middleware has none, and
 * `nuxtApp.$i18n` is what @nuxtjs/i18n exposes for exactly this. Absent — a
 * consumer who removed the module — the path is used as it stands, which is
 * correct for a site with no locale prefixes to strip.
 */
function localeCodes(): string[] {
  const i18n = useNuxtApp().$i18n as
    | { locales?: { value?: (string | { code: string })[] } }
    | undefined;

  return (i18n?.locales?.value ?? []).map((entry) =>
    typeof entry === 'string' ? entry : entry.code
  );
}
