import { queryCollection } from '@nuxt/content/nitro';
import { duxtDefaults, mergeDuxtConfig } from '../../app/utils/duxt-config';
import { stripFrontmatter } from '../utils/duxt-server-text';

/**
 * `…/guide/deploying.md` serves the page's Markdown source.
 *
 * What "View as Markdown" opens, and what the ChatGPT and Claude links hand
 * over — a model given the rendered HTML has to undo a layout to find a
 * heading, and one given this reads what the author wrote.
 *
 * A MIDDLEWARE, not a route. Nitro's router matches path segments, and `.md` is
 * a suffix on the last one rather than a segment of its own, so there is no
 * pattern that means "any path ending in .md". The middleware answers those and
 * hands everything else straight on.
 */
export default defineEventHandler(async (event) => {
  const path = event.path?.split('?')[0];
  if (!path?.endsWith('.md')) return;

  const appConfig = useAppConfig() as { duxt?: Partial<DuxtConfig> };
  const duxt = mergeDuxtConfig(appConfig.duxt, duxtDefaults);

  const wanted = stripLocale(path.slice(0, -'.md'.length));

  // Longest prefix first, exactly as the app resolves a route: `/app/v2` beats
  // `/app` on `/app/v2/guide`.
  const sources = [...(duxt.resolvedSources ?? [])].sort(
    (a, b) => b.prefix.length - a.prefix.length
  );

  const source =
    sources.find(
      (entry) =>
        !entry.prefix ||
        wanted === entry.prefix ||
        wanted.startsWith(`${entry.prefix}/`)
    ) ?? sources[0];

  if (!source) return;

  const page = await queryCollection(
    event,
    source.collection as Parameters<typeof queryCollection>[1]
  )
    .path(wanted)
    .select('title', 'rawbody')
    .first();

  // No page is not this middleware's error to raise: falling through lets the
  // app answer with its own 404, which knows how to suggest a near miss.
  if (!page) return;

  const body = (page as { rawbody?: string }).rawbody;
  if (!body) return;

  setHeader(event, 'content-type', 'text/markdown; charset=utf-8');
  return stripFrontmatter(body).trim();
});

/**
 * The locale segment, off.
 *
 * The browser is on `/de-DE/guide/deploying`; the page is `/guide/deploying`.
 * Same distinction `stripLocalePrefix` makes in the app, made again here
 * because Nitro has no i18n composable to ask.
 */
function stripLocale(path: string): string {
  const first = path.split('/')[1];
  if (!first) return path;

  const locales = (
    useRuntimeConfig().public as {
      i18n?: { locales?: ({ code: string } | string)[] };
    }
  ).i18n?.locales;

  const codes = (locales ?? []).map((locale) =>
    typeof locale === 'string' ? locale : locale.code
  );

  if (!codes.includes(first)) return path;

  const rest = path.slice(first.length + 1);
  return rest.startsWith('/') ? rest : rest || '/';
}
