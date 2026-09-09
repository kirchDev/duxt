import { readFileSync } from 'node:fs';
import { defineNuxtConfig } from 'nuxt/config';

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
   * invoked for it — static delivery out of an SSR build. What is left running
   * is exactly what cannot be a file: the `.md` middleware, `/mcp`, and the
   * demo endpoint in `server/routes/`.
   *
   * Nitro crawls from `/` and follows links, so the set is whatever the site
   * actually links to. A page nobody links to is served by the Worker and is
   * still correct — just slower, and that is the right failure.
   */
  routeRules: cloudflare ? { '/**': { prerender: true } } : {},

  /**
   * The route rule above only says a page MAY be prerendered — it seeds
   * nothing. Without a starting point Nitro rendered exactly the 17 Content SQL
   * dumps it always writes and not one page, which looks like a working build
   * and is a fully dynamic site.
   *
   * So the crawler is turned on and pointed at `/`. What it reaches is what the
   * site links: every page in the sidebar, and the `.md` twin of each one,
   * because "View as Markdown" is a real link on the page.
   *
   */
  nitro: cloudflare
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
           */
          concurrency: 8
        }
      }
    : {},

  /**
   * D1, because a Worker has no filesystem.
   *
   * Content keeps its pages in SQL; the layer's `experimental.nativeSqlite`
   * covers the local case and means nothing here. The build still produces the
   * same dump — this only decides where it is restored, and Content loads it
   * into D1 on the first request after a deploy.
   */
  content: cloudflare ? { database: { type: 'd1', bindingName: 'DB' } } : {},

  /**
   * OG images are rendered at build time and never at runtime.
   *
   * `@resvg/resvg-js` is a native Node binding — it cannot run on workerd at
   * all. `zeroRuntime` strips the renderer out of the bundle entirely and
   * leaves the images the prerender pass already wrote, which is the honest
   * shape for this site: every OG image here is a function of a page, and every
   * page is prerendered above.
   */
  ogImage: cloudflare
    ? {
        zeroRuntime: true,

        // The other half of the timeout problem above. 15 seconds is a
        // sensible ceiling for one image rendered on demand; it is the wrong
        // one for hundreds rendered at once on a CI runner with two cores,
        // where the budget is spent waiting for a core rather than rendering.
        // Nothing is served from this path at runtime, so a slow render costs
        // build time and nobody's request.
        security: { renderTimeout: 60_000 }
      }
    : {},

  // Dev over a public tunnel: the HMR client otherwise dials ws://localhost,
  // which a phone on the other side of the tunnel cannot reach — the page
  // loads and then never updates. Only when the variable is set, so a normal
  // `nuxt dev` is untouched.
  vite: process.env.DUXT_TUNNEL
    ? { server: { hmr: { protocol: 'wss', clientPort: 443 } } }
    : undefined
});
