import { queryCollection } from '@nuxt/content/nitro';
import { splitLocalePath } from '../../app/utils/locale-path';
import { sourcesForRoute } from '../../sources-resolve';
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

  const i18n = (
    useRuntimeConfig(event).public as {
      i18n?: {
        locales?: ({ code: string } | string)[];
        defaultLocale?: string;
      };
    }
  ).i18n;
  const { path: wanted, locale } = splitLocalePath(
    path.slice(0, -'.md'.length),
    (i18n?.locales ?? []).map((entry) =>
      typeof entry === 'string' ? entry : entry.code
    )
  );
  // Nuxt i18n loads the consumer's merged Vue I18n config in its request hook.
  // Browser-language detection's fallback is a different policy.
  const fallbackLocale = event.context.nuxtI18n?.vueI18nOptions
    ?.fallbackLocale as string | string[] | undefined;
  const sources = sourcesForRoute(
    wanted,
    locale ?? i18n?.defaultLocale,
    duxt.resolvedSources ?? [],
    fallbackLocale
  );

  let page;
  for (const source of sources) {
    page = await queryCollection(
      event,
      source.collection as Parameters<typeof queryCollection>[1]
    )
      .path(wanted)
      .select('title', 'rawbody')
      .first();
    if (page) break;
  }

  // No page is not this middleware's error to raise: falling through lets the
  // app answer with its own 404, which knows how to suggest a near miss.
  if (!page) return;

  const body = (page as { rawbody?: string }).rawbody;
  if (!body) return;

  setHeader(event, 'content-type', 'text/markdown; charset=utf-8');
  return stripFrontmatter(body).trim();
});
