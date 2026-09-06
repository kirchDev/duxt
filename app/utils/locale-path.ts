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
  const first = path.split('/')[1];
  if (!first) return path;

  for (const code of codes) {
    if (code !== first) continue;

    const rest = path.slice(first.length + 1);
    return rest.startsWith('/') ? rest : (rest ?? '') || '/';
  }

  return path;
}
