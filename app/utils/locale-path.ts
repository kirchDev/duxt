/**
 * The route path without its locale segment.
 *
 * With `prefix_except_default` the browser is on `/de-DE/guide/deploying` while
 * the documentation page is `/guide/deploying` — the locale translates the
 * INTERFACE, not the content tree. Every lookup in the theme means the second
 * one: which collection serves this route, which section is active, which page
 * to query. Handing them the raw path 404s every page in every non-default
 * locale, which is exactly what happened the first time this was wired up.
 *
 * Pure and separate from the composable so the seam can be tested without a
 * Nuxt environment, like the source resolver next to it.
 */
export function stripLocalePrefix(
  path: string,
  codes: Iterable<string>
): string {
  const documentPath = splitLocalePath(path, codes).path;
  // Static hosts may append a slash; Content paths and prerendered async-data
  // keys do not. Both URLs must reuse the same data during hydration.
  return documentPath.replace(/\/+$/, '') || (documentPath ? '/' : '');
}

/**
 * The same split, keeping the half that was thrown away.
 *
 * Which language a URL asks for is not decoration: original and translation
 * live under IDENTICAL content paths in different collections, so a lookup
 * given only the stripped path cannot tell them apart and takes whichever
 * sorted first. Anything choosing a collection needs both halves — see
 * `sourcesForRoute`.
 */
export function splitLocalePath(
  path: string,
  codes: Iterable<string>
): { locale?: string; path: string } {
  const first = path.split('/')[1];
  if (!first) return { path };

  for (const code of codes) {
    if (code !== first) continue;

    const rest = path.slice(first.length + 1);
    return { locale: code, path: rest.startsWith('/') ? rest : rest || '/' };
  }

  return { path };
}

/**
 * The routes a MACHINE reads, which exist once for the whole site.
 *
 * `llms.txt`, `llms-full.txt`, `rss.xml` and the MCP server are server routes
 * at the root. They are not pages, `@nuxtjs/i18n` knows nothing of them, and
 * `localePath('/llms.txt')` therefore hands back `/de-DE/llms.txt` — a path
 * that falls through to the catch-all page and 404s. That is what the landing
 * page's framed `llms.txt` did in every locale: Nitro's error response carries
 * `X-Frame-Options: DENY`, so the reader saw a broken frame rather than a 404.
 *
 * An explicit list, not "has a file extension": a version segment such as
 * `v0.1.0` reads as one. And `…/page.md` is deliberately NOT on it — the
 * raw-markdown middleware splits the locale off and serves the translation,
 * so a localised `.md` link is the right link.
 *
 * Mirrors the root rows of `DEPLOYMENT_ROUTES` in `scripts/check-routes.ts`.
 */
const MACHINE_ROUTES = ['/llms.txt', '/llms-full.txt', '/rss.xml', '/mcp'];

export function isMachineRoute(path: string): boolean {
  const bare = path.split(/[?#]/)[0]!.replace(/\/+$/, '');

  return MACHINE_ROUTES.some(
    (route) => bare === route || (route === '/mcp' && bare.startsWith('/mcp/'))
  );
}
