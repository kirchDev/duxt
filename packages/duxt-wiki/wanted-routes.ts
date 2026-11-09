export const collectionWantedRoute = (prefix: string) => `${prefix}/wanted`;

export const collectionWantedPrefixes = (
  sources: { prefix: string; generated?: unknown }[]
) => [...new Set(sources.map((source) => source.prefix))];

/** Only actual internal utility URLs; title values never name distinct pages. */
export function collectionWantedPaths(
  prefixes: string[],
  locales: string[],
  routing: { strategy?: string; defaultLocale?: string } = {}
): string[] {
  const paths = prefixes
    .filter(
      (prefix) =>
        (prefix === '' || /^\/(?!\/)[^?#]*$/.test(prefix)) &&
        !prefix
          .split('/')
          .some((segment) => segment === '.' || segment === '..')
    )
    .map(collectionWantedRoute);
  const strategy = routing.strategy ?? 'prefix_except_default';
  const routedLocales =
    strategy === 'no_prefix'
      ? []
      : locales.filter(
          (locale) =>
            /^[\w-]+$/.test(locale) &&
            (strategy !== 'prefix_except_default' ||
              locale !== routing.defaultLocale)
        );
  const routes = [
    ...new Set(
      paths.flatMap((path) => [
        ...(strategy === 'prefix' ? [] : [path]),
        ...routedLocales.map((locale) => `/${locale}${path}`)
      ])
    )
  ];
  return routes;
}

/**
 * Nuxt hands every static page route to the prerenderer, and a wanted page
 * exists under every source and version so a bundle can introduce a red link at
 * runtime. Only the ones a wiki needs are worth writing: each carries the
 * navigation of its edition, and the crawler walks that whole edition from it.
 */
export function isUnneededWantedRoute(
  route: string,
  routes: Iterable<string>,
  needed: Iterable<string>
): boolean {
  const path = route.split('?')[0]!;
  return new Set(routes).has(path) && !new Set(needed).has(path);
}

export function wantedTitleQueryPattern(
  prefixes: string[],
  locales: string[],
  routing: { strategy?: string; defaultLocale?: string } = {}
): RegExp | undefined {
  const routes = collectionWantedPaths(prefixes, locales, routing);
  if (!routes.length) return;
  const escape = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^(?:${routes.map(escape).join('|')})\\?title=[^&#]*$`);
}
