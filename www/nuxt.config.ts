import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineNuxtConfig } from 'nuxt/config';
import { fileURLToPath } from 'node:url';
import { claimNuxtProcess } from '../scripts/nuxt-process-guard.ts';
import { prerenderConcurrency } from '../scripts/prerender-bench.ts';
import {
  duxtOgImageBuildCache,
  duxtOgImageFingerprint,
  duxtOgImageRendererVersions
} from '@kirchdev/duxt/og-image-cache';

/** This site's own directory — what every path below resolves against. */
const siteDir = fileURLToPath(new URL('.', import.meta.url));

claimNuxtProcess(siteDir, process.argv.slice(2).join(' ') || 'Nuxt');

/**
 * The version this site documents, read rather than typed.
 *
 * duxt's own `package.json`, one directory up — the file release-please bumps.
 * A number written into `app.config.ts` would be a second copy of it, wrong
 * from the first release onwards, which is the mistake the layer default
 * `version: 'v0.0.0'` made for every site that extended it.
 *
 * It goes through `appConfig` here rather than `app.config.ts` because that
 * file is a RUNTIME module — it is compiled for the browser and cannot read a
 * file. `nuxt.config.ts` is build code, so it can. The generated template
 * merges `appConfig` BEHIND `app.config.ts`, so this stands only as long as no
 * human writes a `version` there, which is the right way round.
 *
 * The `v` is added here: `package.json` holds `0.0.0`, and every place duxt
 * shows a version prefixes it — `DuxtFooter` does the same.
 */
const version = (() => {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    ) as { version?: string };

    return pkg.version ? `v${pkg.version}` : undefined;
  } catch {
    // Absent rather than guessed: the badge and the hero pill both draw
    // nothing without it, which beats a number nobody can trace.
    return undefined;
  }
})();

/**
 * Is this build headed for Cloudflare Workers?
 *
 * Keyed off `NITRO_PRESET` rather than an invented variable of its own: nitro
 * already reads that one, so the switch that decides the output and the switch
 * that decides the config below cannot disagree.
 *
 * Everything it guards is a Workers fact, and every one of them would be wrong
 * locally — which is why `pnpm build:app`, the gate's SSR check, still builds
 * the ordinary Node server. `pnpm --filter www deploy` sets the variable.
 */
const cloudflare = (process.env.NITRO_PRESET ?? '').startsWith('cloudflare');

/**
 * Which Content database adapter this build targets.
 *
 * Unset — every ordinary build, `pnpm build:app` included — leaves Content on
 * its own default, and this variable does not exist as far as the site is
 * concerned. It is set only by the adapter matrix
 * (`.github/workflows/adapters.yml`), which builds this same site against
 * `libsql` and `postgresql` and then probes the endpoints that read the
 * database at runtime. That is the whole mechanism behind the compatibility table in
 * `docs/2.concepts/11.databases.md`: the table says "verified in CI" only for
 * the adapters this switch is exercised with.
 *
 * It deliberately does NOT cover `d1`, which is the `cloudflare` branch below
 * and is not something a Node build can be pointed at.
 */
const adapter = process.env.DUXT_CONTENT_ADAPTER;

/**
 * Routes to prerender instead of crawling the site, comma-separated.
 *
 * A STATIC BUILD IS THE ONLY PLACE SOME OF THIS CODE EXISTS. `@nuxt/image`
 * resolves its provider from the preset — `ipxStatic` when nitro is static,
 * `ipx` on a Node server, nothing at all on a Worker — so a claim about what a
 * generated site writes to disk can only be settled by generating one. That is
 * the gap this lever closes: `ProseImg` registers its zoom dialog's variants
 * with the prerender crawler, and nothing but a static `.output/public` can say
 * whether those files are actually there.
 *
 * It exists because the whole site is not a tractable thing to generate for one
 * question. `www` is seven locales over 38 collections, every page of which
 * renders an OG image through satori during the crawl — the run that produced
 * `prerender.concurrency: 8` below. Narrowing the crawl to the routes under
 * examination turns an hours-long build into a minute and changes nothing about
 * which code path runs.
 *
 * It narrows the crawl and does nothing else — which preset is built stays
 * `NITRO_PRESET`'s to say, so the same lever serves the static question above
 * and a Node build that wants one page rendered.
 *
 * A verification lever, not a deployment setting: the Cloudflare branch ignores
 * it, because a deploy must crawl the whole site.
 *
 *     NITRO_PRESET=static DUXT_PRERENDER_ROUTES=/demo/images pnpm --filter www build
 */
const prerenderRoutes = (process.env.DUXT_PRERENDER_ROUTES ?? '')
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);

/**
 * The runtime database for a non-default adapter.
 *
 * `postgresql` and a remote `libsql` both need a URL, and both take it from the
 * environment rather than from a literal — a connection string is per-machine
 * and, for Turso, carries a token. A `libsql` URL that is missing falls back to
 * a local `file:` database, which is the form that needs no server and is what
 * makes the libsql leg of the matrix runnable on a bare runner.
 */
const adapterDatabase = () => {
  if (adapter === 'postgresql' || adapter === 'postgres') {
    const url = process.env.DUXT_CONTENT_DATABASE_URL;

    if (!url) {
      throw new Error(
        'DUXT_CONTENT_ADAPTER=postgresql needs DUXT_CONTENT_DATABASE_URL — ' +
          'PostgreSQL has no local-file form to fall back to.'
      );
    }

    return { type: 'postgresql' as const, url };
  }

  if (adapter === 'libsql') {
    /**
     * AN ABSOLUTE PATH, AND IT HAS TO BE.
     *
     * A `file:` URL is opened relative to the SERVER's working directory, not
     * to the build's, and libsql creates the database but not the directory
     * above it. `file:.data/content/libsql.db` therefore looked right and died
     * with `Unable to open connection … : 14` (SQLITE_CANTOPEN) the moment the
     * server was started from anywhere but `www/`. The temp directory is the
     * one place guaranteed to exist and be writable on both.
     */
    return {
      type: 'libsql' as const,
      url:
        process.env.DUXT_CONTENT_DATABASE_URL ||
        `file:${join(tmpdir(), 'duxt-content-libsql.db')}`,
      ...(process.env.DUXT_CONTENT_DATABASE_TOKEN
        ? { authToken: process.env.DUXT_CONTENT_DATABASE_TOKEN }
        : {})
    };
  }

  throw new Error(
    `DUXT_CONTENT_ADAPTER=${adapter} is not one of libsql, postgresql.`
  );
};

/**
 * OG images are rendered at build time and never at runtime.
 *
 * `@resvg/resvg-js` is a native Node binding — it cannot run on workerd at
 * all. `zeroRuntime` strips the renderer out of the bundle entirely and leaves
 * the images the prerender pass already wrote, which is the honest shape for
 * this site: every OG image here is a function of a page, and every page is
 * prerendered below.
 *
 * The render budget is the other half of the timeout problem the prerender
 * concurrency comment describes. 15 seconds is a sensible ceiling for one image
 * rendered on demand; it is the wrong one for hundreds rendered at once on a CI
 * runner with two cores, where the budget is spent waiting for a core rather
 * than rendering. Nothing is served from this path at runtime, so a slow render
 * costs build time and nobody's request.
 */
const ogImage = cloudflare
  ? { zeroRuntime: true, security: { renderTimeout: 60_000 } }
  : {};

/**
 * WHERE THE RENDERED IMAGES SURVIVE A BUILD.
 *
 * One deploy rendered 1,053 of them and spent 158 seconds in the prerender
 * pass doing it, almost all of it redrawing images no page had changed.
 * nuxt-og-image can keep them — it keys each one by the page's own options, the
 * template's source and its own version — and does nothing with that until a
 * directory is named and that directory outlives the runner.
 *
 * NOT INSIDE THE CLOUDFLARE BRANCH, though only that build renders anything.
 * The switch above is about where the site is going; this is about not doing
 * work twice, which is as true of a local `build:cf` as it is of the deploy.
 *
 * The call also EMPTIES the directory when the inputs its key cannot see have
 * moved — the fonts, the renderer options, the renderer packages themselves.
 * That is the half that makes the cache safe rather than merely fast.
 */
const ogImageCache = duxtOgImageBuildCache({
  rootDir: siteDir,
  fingerprint: duxtOgImageFingerprint({
    options: ogImage,
    dependencies: duxtOgImageRendererVersions(siteDir)
  })
});

// Consumes the layer exactly as a downstream repo does. Modules, the Content
// driver and the theme all arrive with the extend.
export default defineNuxtConfig({
  // By name, not by path: this is what a consumer writes, so the package's
  // exports map and files allowlist are exercised by the development site.
  extends: ['@kirchdev/duxt'],
  compatibilityDate: '2026-09-02',

  appConfig: { duxt: { version } },

  /**
   * The origin, stated once.
   *
   * `i18n.baseUrl` is the one place a Nuxt site already has to name its domain,
   * and the layer's own module reads it to fill in `site.url` — which is what
   * the sitemap, the canonical links, robots.txt and the absolute OG image URLs
   * are all built from. Without it the sitemap does not degrade: it fails the
   * prerender outright with "You must provide a site URL".
   */
  i18n: { baseUrl: 'https://duxt.app' },

  /**
   * THE SAME ORIGIN AGAIN, AND IT IS NOT A DUPLICATE. `@nuxtjs/i18n` copies its
   * `baseUrl` into this key with `defu`, which keeps whatever is already there
   * — and something in the SEO chain seeds it first, so the module option
   * above never reaches the runtime. What the runtime then has is an empty
   * string, which falls back to the request's own origin, and every page
   * rendered at build time is rendered against `localhost:3000`: nuxt-site-config
   * pushes that over the site url, and the prerendered HTML ships
   * `<link rel="canonical" href="http://localhost:3000">`.
   *
   * A site that is served rather than prerendered never shows this — the
   * fallback resolves to the real host — which is exactly why it survived
   * until the first prerendered build.
   */
  runtimeConfig: { public: { i18n: { baseUrl: 'https://duxt.app' } } },

  // Appended to the layer's own entry, never replacing it: Nuxt concatenates
  // `css` with the extending app's last, which is exactly the order these
  // overrides need — same specificity, later wins.
  css: ['~/assets/css/brand.css'],

  // This site's own branding, not the layer's. The layer stays unbranded on
  // purpose — a consumer extending it wants their own mark in the tab, so the
  // icons live here in the consuming site rather than in the published package.
  //
  // The SVG carries the whole job: one file, sharp at every size, and its own
  // `prefers-color-scheme` rule inside so the mark lightens against a dark tab
  // strip. The PNG exists only because iOS ignores SVG icons.
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
    }
  },

  /**
   * PRERENDER EVERYTHING THAT CAN BE PRERENDERED.
   *
   * The point of this deployment: a page rendered at build time is written to
   * `.output/public` and served by the assets binding, so the Worker is never
   * invoked for it — static delivery out of an SSR build.
   *
   * WHICH ROUTES END UP ON WHICH SIDE IS STATED ONCE, IN
   * `scripts/check-routes.ts`, AND NOT RESTATED HERE. Two lists of "the dynamic
   * routes" lived in this file and in `wrangler.jsonc`, they named different
   * sets, and between them `llms-full.txt` and `rss.xml` went unaccounted for.
   * The table there answers asset-or-Worker, D1-or-not and the fallback for
   * each route, and `pnpm check:routes` proves it against the artifact this
   * build produces.
   *
   * The short of it: documentation pages are files, and `llms.txt`,
   * `llms-full.txt`, `rss.xml`, every `…/page.md`, `/mcp` and `POST
   * /demo/echo` are not — nor are `robots.txt`, `/mcp/deeplink`,
   * `/mcp/badge.svg` and the sitemap's `style.xsl` and
   * `nuxt-content-urls.json`. A page nobody links to is served by the Worker
   * and is still correct — just slower, and that is the right failure.
   *
   * That is a summary and not a list to count: the table classifies every
   * handler the build registers, and a new one with no row there fails the
   * check rather than quietly joining this sentence.
   */
  routeRules: cloudflare ? { '/**': { prerender: true } } : {},

  /**
   * The route rule above only says a page MAY be prerendered — it seeds
   * nothing. Without a starting point Nitro rendered exactly the 17 Content SQL
   * dumps it always writes and not one page, which looks like a working build
   * and is a fully dynamic site.
   *
   * So the crawler is turned on and pointed at `/`. What it reaches is every
   * page in the sidebar — and ONLY pages. Nitro follows a discovered link only
   * when its extension is `""` or `.json`, so the `.md` twin beside each page,
   * the `llms.txt` the landing page's tabs and every page's head link, and the
   * feed are all skipped however prominently they are linked. That is not a defect to work around: each of
   * them is a function of the content rather than of the build, and the Worker
   * is where they belong. `scripts/check-routes.ts` is where that is written
   * down and checked.
   */
  nitro:
    !cloudflare && prerenderRoutes.length
      ? // The named routes and nothing else — see `DUXT_PRERENDER_ROUTES` above.
        { prerender: { crawlLinks: false, routes: prerenderRoutes } }
      : cloudflare
        ? {
            prerender: {
              crawlLinks: true,
              routes: ['/'],

              /*
               * A BROKEN LINK COSTS ONE PAGE, NOT THE DEPLOY.
               *
               * Nuxt's default is to exit the build on the first prerender error,
               * and crawling every link finds every dead one by construction: this
               * site currently reaches `/demo/api/shipments` and its two
               * operations — unversioned paths the versioned demo section links to
               * and nothing serves — 42 times across the locales.
               *
               * That wants fixing where the links are generated, and it is not
               * worth a documentation site that cannot ship until it is. Such a
               * page is left to the Worker, which answers it exactly as it would
               * have anyway. Every one of them is still printed, so the list does
               * not go quiet.
               */
              failOnError: false,

              /*
               * NITRO'S DEFAULT IS FOUR PER CORE, AND THIS SITE CANNOT PAY IT.
               * Every page renders an OG image through satori during the crawl,
               * and at the default width hundreds of renders contend for one
               * process until they blow through the renderer's 15-second budget:
               * 335 pages came out of one build with `createImage timeout` and
               * therefore no image at all — silently, because a missing OG image
               * fails nothing.
               *
               * MEASURED, NOT ASSUMED, AND NOT YET FINISHED: eight brought that
               * build's 335 down to 140. It is the right direction and not the
               * whole fix, and the other lever is the renderer's budget below —
               * the combination has not been measured on a green build yet.
               *
               * THE NUMBER IS OVERRIDABLE SO THAT IT CAN BE MEASURED RATHER
               * THAN ARGUED OVER. `DUXT_PRERENDER_CONCURRENCY` is set by
               * `.github/workflows/prerender-bench.yml` and by nothing else:
               * every ordinary build, this repository's deploy included, leaves
               * it unset and prerenders at the default. The reader is
               * deliberately strict — a bad spelling that fell back to 8 would
               * build at 8 and be RECORDED as 12, which is worse than having no
               * benchmark at all.
               */
              concurrency: prerenderConcurrency(
                process.env.DUXT_PRERENDER_CONCURRENCY
              )
            }
          }
        : {},

  /**
   * D1, because a Worker has no filesystem.
   *
   * Content keeps its pages in SQL; the layer's `experimental.sqliteConnector`
   * covers the local case and means nothing here. The build still produces the
   * same dump — this only decides where it is restored, and Content loads it
   * into D1 on the first request after a deploy.
   */
  content: cloudflare
    ? { database: { type: 'd1', bindingName: 'DB' } }
    : adapter
      ? { database: adapterDatabase() }
      : {},

  /**
   * OG images are rendered at build time and never at runtime, and KEPT.
   *
   * `ogImage` above is what decides how they look; `buildCache` is what decides
   * whether a build has to render them again. The base carries a digest of
   * every rendering input nuxt-og-image's own cache key leaves out, so a font
   * or a renderer option that moves empties the directory rather than serving
   * a thousand images of the previous design — see `og-image-cache.ts`.
   */
  ogImage: { ...ogImage, buildCache: { base: ogImageCache.base } },

  // Dev over a public tunnel: the HMR client otherwise dials ws://localhost,
  // which a phone on the other side of the tunnel cannot reach — the page
  // loads and then never updates. Only when the variable is set, so a normal
  // `nuxt dev` is untouched.
  vite: process.env.DUXT_TUNNEL
    ? { server: { hmr: { protocol: 'wss', clientPort: 443 } } }
    : undefined
});
