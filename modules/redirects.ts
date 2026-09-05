import { fileURLToPath } from 'node:url';
import type { Nuxt } from '@nuxt/schema';
import { readDuxtBuildConfig } from '../duxt-app-config';
import { duxtSourceManifest } from '../sources-resolve';
import { resolveLatestRefs } from '../sources-git';
import { readContentCache } from '../content-cache';

/**
 * `redirectFrom` in a page's frontmatter, turned into route rules.
 *
 * A moved page is the one kind of broken link a documentation site creates for
 * itself, and the fix has always lived outside the site — an nginx rule, a
 * Netlify `_redirects`, a Cloudflare list — written by whoever deploys it and
 * never by whoever moved the page. Putting it in the frontmatter puts it in the
 * same commit as the move.
 *
 * The layer is also the only thing that CAN solve it once. An old URL has to be
 * redirected under every prefix the page is served at — the repository segment,
 * the version segment and the locale segment — and only the resolved manifest
 * knows which of those exist. A consumer writing the rule by hand would have to
 * rediscover that scheme for every page.
 */
export default function duxtRedirects(_options: unknown, nuxt: Nuxt) {
  const layerDir = fileURLToPath(new URL('..', import.meta.url));

  const dirs = [
    ...nuxt.options._layers.flatMap((entry) => [
      entry.config.rootDir,
      entry.config.srcDir
    ]),
    layerDir
  ].filter(Boolean) as string[];

  const config = readDuxtBuildConfig(dirs);
  const sources = duxtSourceManifest(
    resolveLatestRefs(config?.sources ?? [{ path: 'docs' }]),
    config?.sourceOptions ?? {}
  );

  // `nitro:config` rather than `build:done`: route rules are read when Nitro is
  // configured, and Content has filled the cache by then (it parses in its own
  // `modules:done` listener, which runs earlier).
  nuxt.hook('nitro:config', (nitro) => {
    const pages = readContentCache(
      nuxt,
      sources.map((source) => source.collection)
    );

    if (!pages?.length) return;

    const prefixOf = new Map(
      sources.map((source) => [source.collection, source.prefix])
    );

    const rules = redirectRules(
      pages.map((page) => ({
        path: page.path,
        prefix: prefixOf.get(page.collection) ?? '',
        redirectFrom: Array.isArray(page.content.redirectFrom)
          ? (page.content.redirectFrom as string[])
          : []
      })),
      localeSegments(nuxt)
    );

    if (!Object.keys(rules).length) return;

    nitro.routeRules = { ...rules, ...nitro.routeRules };
  });
}

/** Every locale that appears as a URL segment; the default one does not. */
function localeSegments(nuxt: Nuxt): string[] {
  const i18n = (
    nuxt.options as {
      i18n?: {
        locales?: (string | { code: string })[];
        defaultLocale?: string;
        strategy?: string;
      };
    }
  ).i18n;

  if (!i18n?.locales?.length) return [];

  const codes = i18n.locales.map((locale) =>
    typeof locale === 'string' ? locale : locale.code
  );

  return i18n.strategy === 'prefix'
    ? codes
    : codes.filter((code) => code !== i18n.defaultLocale);
}

/**
 * The rules themselves, over data rather than over a build.
 *
 * A `redirectFrom` entry is written the way the page's own links are — relative
 * to its source, without the prefix the site happens to serve it under. So each
 * one becomes one rule per locale plus the unprefixed form, all pointing at the
 * page's real path.
 */
export function redirectRules(
  pages: { path: string; prefix: string; redirectFrom: string[] }[],
  locales: string[]
): Record<string, { redirect: { to: string; statusCode: 301 } }> {
  const rules: Record<string, { redirect: { to: string; statusCode: 301 } }> =
    {};

  for (const page of pages) {
    for (const from of page.redirectFrom) {
      if (!from.startsWith('/')) continue;

      const source = isInsidePrefix(from, page.prefix)
        ? from
        : `${page.prefix}${from}`;

      // A page redirecting to itself is a loop, not a redirect.
      if (source === page.path) continue;

      for (const locale of ['', ...locales]) {
        const at = locale ? `/${locale}${source}` : source;
        const to = locale ? `/${locale}${page.path}` : page.path;

        rules[at] ??= { redirect: { to, statusCode: 301 } };
      }
    }
  }

  return rules;
}

const isInsidePrefix = (path: string, prefix: string) =>
  Boolean(prefix) && (path === prefix || path.startsWith(`${prefix}/`));
