import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineNuxtConfig } from 'nuxt/config';
import tailwindcss from '@tailwindcss/vite';
import { highlightLangs } from './highlight-langs';

/** Resolve against this layer, not the project extending it. */
const layer = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * The one file Nitro's tracer cannot see.
 *
 * satori shapes text with harfbuzz, which is a WebAssembly module read at
 * runtime with `fs.readFile` — not imported. Nothing in the module graph
 * mentions it, so the build copies `harfbuzzjs`'s JavaScript and leaves
 * `hb.wasm` behind, and the first request for an OG image dies with ENOENT on a
 * path inside `.output`. Naming the file explicitly is the whole fix.
 *
 * Resolved rather than hard-coded, and optional: a consumer who has replaced
 * the renderer, or pruned satori, must not have the build fail over a file
 * nothing reads.
 */
const require_ = createRequire(import.meta.url);

function harfbuzzWasm(): string | undefined {
  try {
    return join(
      dirname(require_.resolve('harfbuzzjs/package.json')),
      'hb.wasm'
    );
  } catch {
    return undefined;
  }
}

const wasm = harfbuzzWasm();

/**
 * The locales the layer ships strings for.
 *
 * Kept out of the config object so the icon client bundle below can derive the
 * country flags from it, exactly as gildstone does. `code` needs `as const`:
 * outside the literal TypeScript widens it to `string`, which no longer
 * satisfies i18n's `LocaleObject<…>`.
 *
 * THE LANGUAGE CARRIES THE STRINGS, THE REGION ONLY ITS DEVIATIONS. i18n loads
 * every file in `files` and deep-merges them in order, so `pt-BR` reads the
 * European Portuguese set and then overwrites the handful of words Brazil
 * spells differently. That is why there is no `en-GB/` or `en-US/` directory at
 * all: nothing in this vocabulary differs between them, and a directory that
 * would only duplicate `en/` is a directory that drifts from it.
 *
 * `name` is the endonym — each language written in itself, which is what a
 * language switcher must show. It lives here rather than in the message files
 * because it is the same string in every locale.
 */
const locales = [
  {
    code: 'en-GB' as const,
    language: 'en-GB',
    name: 'English (UK)',
    files: [
      'en/duxt/announcement.json',
      'en/duxt/changelog.json',
      'en/duxt/code.json',
      'en/duxt/devtools.json',
      'en/duxt/defaults.json',
      'en/duxt/error.json',
      'en/duxt/footer.json',
      'en/duxt/locale.json',
      'en/duxt/nav.json',
      'en/duxt/openapi.json',
      'en/duxt/page.json',
      'en/duxt/search.json',
      'en/duxt/shortcuts.json',
      'en/duxt/theme.json',
      'en/duxt/toc.json',
      'en/duxt/version.json'
    ]
  },
  {
    code: 'en-US' as const,
    language: 'en-US',
    name: 'English (US)',
    files: [
      'en/duxt/announcement.json',
      'en/duxt/changelog.json',
      'en/duxt/code.json',
      'en/duxt/devtools.json',
      'en/duxt/defaults.json',
      'en/duxt/error.json',
      'en/duxt/footer.json',
      'en/duxt/locale.json',
      'en/duxt/nav.json',
      'en/duxt/openapi.json',
      'en/duxt/page.json',
      'en/duxt/search.json',
      'en/duxt/shortcuts.json',
      'en/duxt/theme.json',
      'en/duxt/toc.json',
      'en/duxt/version.json'
    ]
  },
  {
    code: 'de-DE' as const,
    language: 'de-DE',
    name: 'Deutsch',
    files: [
      'de/duxt/announcement.json',
      'de/duxt/changelog.json',
      'de/duxt/code.json',
      'de/duxt/devtools.json',
      'de/duxt/defaults.json',
      'de/duxt/error.json',
      'de/duxt/footer.json',
      'de/duxt/locale.json',
      'de/duxt/nav.json',
      'de/duxt/openapi.json',
      'de/duxt/page.json',
      'de/duxt/search.json',
      'de/duxt/shortcuts.json',
      'de/duxt/theme.json',
      'de/duxt/toc.json',
      'de/duxt/version.json'
    ]
  },
  {
    code: 'es-ES' as const,
    language: 'es-ES',
    name: 'Español',
    files: [
      'es/duxt/announcement.json',
      'es/duxt/changelog.json',
      'es/duxt/code.json',
      'es/duxt/devtools.json',
      'es/duxt/defaults.json',
      'es/duxt/error.json',
      'es/duxt/footer.json',
      'es/duxt/locale.json',
      'es/duxt/nav.json',
      'es/duxt/openapi.json',
      'es/duxt/page.json',
      'es/duxt/search.json',
      'es/duxt/shortcuts.json',
      'es/duxt/theme.json',
      'es/duxt/toc.json',
      'es/duxt/version.json'
    ]
  },
  {
    code: 'fr-FR' as const,
    language: 'fr-FR',
    name: 'Français',
    files: [
      'fr/duxt/announcement.json',
      'fr/duxt/changelog.json',
      'fr/duxt/code.json',
      'fr/duxt/devtools.json',
      'fr/duxt/defaults.json',
      'fr/duxt/error.json',
      'fr/duxt/footer.json',
      'fr/duxt/locale.json',
      'fr/duxt/nav.json',
      'fr/duxt/openapi.json',
      'fr/duxt/page.json',
      'fr/duxt/search.json',
      'fr/duxt/shortcuts.json',
      'fr/duxt/theme.json',
      'fr/duxt/toc.json',
      'fr/duxt/version.json'
    ]
  },
  {
    code: 'pt-PT' as const,
    language: 'pt-PT',
    name: 'Português',
    files: [
      'pt/duxt/announcement.json',
      'pt/duxt/changelog.json',
      'pt/duxt/code.json',
      'pt/duxt/devtools.json',
      'pt/duxt/defaults.json',
      'pt/duxt/error.json',
      'pt/duxt/footer.json',
      'pt/duxt/locale.json',
      'pt/duxt/nav.json',
      'pt/duxt/openapi.json',
      'pt/duxt/page.json',
      'pt/duxt/search.json',
      'pt/duxt/shortcuts.json',
      'pt/duxt/theme.json',
      'pt/duxt/toc.json',
      'pt/duxt/version.json'
    ]
  },
  {
    code: 'pt-BR' as const,
    language: 'pt-BR',
    name: 'Português (Brasil)',
    files: [
      'pt/duxt/announcement.json',
      'pt/duxt/changelog.json',
      'pt/duxt/code.json',
      'pt/duxt/devtools.json',
      'pt/duxt/defaults.json',
      'pt/duxt/error.json',
      'pt/duxt/footer.json',
      'pt/duxt/locale.json',
      'pt/duxt/nav.json',
      'pt/duxt/openapi.json',
      'pt/duxt/page.json',
      'pt/duxt/search.json',
      'pt/duxt/shortcuts.json',
      'pt/duxt/theme.json',
      'pt/duxt/toc.json',
      'pt/duxt/version.json',
      'pt-BR/duxt/error.json',
      'pt-BR/duxt/nav.json',
      'pt-BR/duxt/page.json',
      'pt-BR/duxt/search.json',
      'pt-BR/duxt/version.json'
    ]
  }
];

// The layer itself. A consumer gets all of this by extending '@kirchdev/duxt',
// which resolves through package.json's `main` to this file.
export default defineNuxtConfig({
  modules: [
    // First: it narrows the locale list before @nuxtjs/i18n reads it, and
    // resolves the source manifest before anything queries a collection.
    layer('./modules/config.ts'),

    // Reads what Content parses and reports what the build would otherwise
    // swallow — an empty collection, a folder shadowed by a prefix, a link
    // pointing nowhere, a page with no title.
    layer('./modules/validate.ts'),

    // A devtools tab showing the resolved sources — dev only, and a no-op
    // outside it.
    layer('./modules/devtools.ts'),

    // "Last updated" and the contributor list, read off each page's own git
    // history at parse time.
    layer('./modules/git-meta.ts'),

    // `redirectFrom:` in a page's frontmatter, under every prefix the site
    // serves that page at.
    layer('./modules/redirects.ts'),

    // The downloadable archive of every local Bruno collection, written during
    // the build and served as a static asset. A no-op for a site that declares
    // no `bruno` section.
    layer('./modules/bruno.ts'),

    // The layer's one build-time extension point: every parsed page of every
    // source, version and language, handed to `duxt:search:records` so an
    // external search provider can be a layer rather than a fork. Builds
    // nothing while no consumer is listening, which is every site until one is.
    layer('./modules/search-records.ts'),

    /**
     * The SEO half, BEFORE Content on purpose.
     *
     * @nuxtjs/sitemap wires itself into Content's collections, and it says so
     * out loud when it is loaded second — "this may cause issues with the
     * integration". It does: the sitemap then lists the site's routes and not
     * one documentation page. The bundle loads its modules in its own order,
     * so the whole bundle goes here rather than three named modules.
     *
     * `@nuxtjs/seo` is an ALIAS, not a wrapper — its own documentation says it
     * "contains no logic of its own". What it buys is the four modules this
     * layer used to do by hand: schema.org from `nuxt-schema-org`, the
     * automatic canonical and og/twitter tags from `nuxt-seo-utils`, the link
     * check, and `nuxt-site-config` as the one place `site.url` is read from.
     * It also completes the shared devtools panel, which every one of these
     * modules feeds and which lists the ones that are missing.
     *
     * They all read `site.url`, which the duxt module fills in from
     * `i18n.baseUrl` so a consumer states its origin once rather than five
     * times; without one they degrade to relative output rather than inventing
     * a domain.
     */
    '@nuxtjs/seo',
    '@nuxt/image',

    '@nuxt/content',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    'shadcn-nuxt',
    '@nuxtjs/mcp-toolkit',
    '@nuxtjs/i18n'
  ],

  /**
   * NO `hooks` KEY, AND NO `serverDir`. The layer's own `server/` is found by
   * Nitro without either.
   *
   * These routes used to be pushed by hand from a `nitro:config` hook, on the
   * belief that only the consumer's server directory is scanned. The
   * production bundle disproves it: its handler list carried every one of them
   * TWICE — once lazily, in alphabetical order, from a filesystem scan of this
   * layer's `server/routes/`, and once eagerly in the order the hook pushed
   * them. The middleware too.
   *
   * So Nitro scans `server/routes/` and `server/middleware/` in EVERY layer,
   * derives the route from the file name and the method from its `.get`
   * suffix, and loads each handler on demand. A consumer's own `server/` is
   * merged rather than replaced, which is what the hook was there to protect
   * and never had to.
   *
   * Left as a comment rather than deleted: the next person to add a route here
   * will look for the place it is registered, and the answer is that there
   * isn't one.
   */

  // A real MCP server at /mcp, through the official SDK, instead of a JSON
  // endpoint someone else has to wrap. Tools live in server/mcp/tools.
  // No `name`: the module's own default is the empty string, so
  // `modules/config.ts` derives one from the site's own title instead. Left as
  // a literal here it published duxt's name from every downstream site.
  mcp: {
    description: 'The documentation this site publishes, readable by an agent.',
    instructions:
      'Call list_versions first: it gives the URL prefix that scopes one ' +
      'documentation version. Pass that prefix to list_pages for its table of ' +
      'contents or to search_docs to find a page by term, then read_page for ' +
      'one page as Markdown.'
  },

  nitro: {
    /**
     * THE MCP TOOLS CANNOT REACH THE REQUEST WITHOUT THIS.
     *
     * `@nuxtjs/mcp-toolkit` hands a tool handler the MCP SDK's
     * `RequestHandlerExtra` and nothing of H3's, so the only way into the
     * request from inside a tool is `useEvent()` — which throws
     * "Nitro request context is not available" unless Nitro wraps each request
     * in an `AsyncLocalStorage`. The toolkit's own server helpers
     * (`useMcpServer`, `useMcpSession`, `useMcpLogger`) are built on the same
     * call, so this is a prerequisite of mounting an MCP server rather than a
     * preference of duxt's.
     *
     * It is the one Nitro flag this layer imposes on a consumer, and it is
     * imposed knowingly: the alternative is four tools that answer from the
     * global `$fetch` and the default locale instead of from the request, i.e.
     * a second database-reading code path that exists only under `/mcp` and
     * that only a Worker would ever have disagreed with. A consumer who wants
     * it off writes `nitro: { experimental: { asyncContext: false } }` and
     * loses `/mcp`, nothing else.
     */
    experimental: { asyncContext: true },

    ...(wasm ? { externals: { traceInclude: [wasm] } } : {})
  },

  css: [layer('./app/assets/css/duxt.css')],

  // '@' belongs to whoever extends the layer. Imports inside the layer use
  // '@duxt' so they resolve here regardless of the consumer's own aliases.
  alias: {
    '@duxt': layer('./app')
  },

  content: {
    build: {
      markdown: {
        // Without an explicit theme Content ships no highlighter at all, and
        // every fence renders as flat text. Two themes so the switch follows
        // the site's own light/dark class rather than a media query.
        highlight: {
          theme: {
            default: 'github-light',
            dark: 'github-dark'
          },
          langs: highlightLangs
        },

        /**
         * PARSE the whole outline; decide how much of it to draw later.
         *
         * MDC's `depth` is a COUNT from `h2` over `[h2,h3,h4,h5,h6]`, and its
         * default of `2` stops at `h3` — so a page writing `toc: { maxDepth: 5 }`
         * would have asked for headings Content never put in `body.toc`, and
         * the field would be a promise the build quietly broke. Parsing all
         * five costs a few rows in a table nobody queries by depth.
         *
         * It does NOT change what a reader sees: `duxtTocLinks` cuts the tree
         * back to `duxt.toc.depth` — still `h3` — before `DuxtToc` draws it, so
         * a page that asks for nothing gets exactly the column it always had.
         *
         * `searchDepth` is deliberately left alone. It bounds how deep into the
         * node tree headings are looked for, not which levels count, so raising
         * it would change which pages have an outline at all.
         */
        toc: { depth: 5 }
      }
    },

    // Content's default driver, better-sqlite3, is a native addon compiled
    // through node-gyp. `native` is Node 24's own node:sqlite, so no driver
    // package is needed — see CLAUDE.md for the fallback if this option ever
    // goes away. It replaced `nativeSqlite: true`, which Content still honours
    // but marks deprecated; a layer is the worst place to carry a deprecation,
    // so tests/sqlite-connector.test.ts holds this block to whatever the
    // installed Content declares current.
    experimental: {
      sqliteConnector: 'native'
    }
  },

  /**
   * The sitemap lists pages, not versions of pages.
   *
   * `exclude` is filled in by the duxt module from the resolved manifest — a
   * version that is not the default carries `noindex` and a canonical pointing
   * elsewhere, so listing it here would ask a crawler to fetch exactly what the
   * page then tells it to drop. Same for an `eol` version, which is excluded
   * whether or not it is the default.
   */
  // The devtools previews in `public/` are fixtures for one reference page, not
  // pages of anybody's site. Every consumer serves them, because Nuxt serves
  // every layer's `public/` — and none of them wants ten documents titled
  // "duxt — Sources" indexed against their own domain.
  //
  // defu concatenates the list across layers, so a consumer's own `disallow`
  // is added to this rather than replacing it.
  robots: {
    disallow: ['/devtools/']
  },

  sitemap: {
    // Content pages reach the sitemap through the module's own Content
    // integration; the duxt module adds what the version rules exclude.
    //
    // Partials are the one entry written by hand: they share the pages' schema
    // (see `definePartials`), so the sitemap module treats them as pages, and
    // a block of prose meant to be included in three places is not a page a
    // crawler should be offered.
    exclude: ['/_partials/**', '/*/_partials/**']
  },

  /**
   * nuxt-seo-utils, whose defaults are written for a site that sets no head
   * tags of its own. These defaults need adjusting for this layer's rendering.
   */
  seo: {
    // MDC hydrates its Shiki <style> text from the Content payload. Rewriting
    // only the prerendered HTML makes that text differ on the client.
    minify: false,

    /**
     * A LOCALE PREFIX IS CASE-SENSITIVE. i18n routes this site's locales under
     * their own codes — `/de-DE/guides`, `/pt-BR/guides` — and lowercasing a
     * canonical would point every translated page at a URL that 404s. The
     * option exists for sites whose paths differ only in case; ours do not.
     */
    canonicalLowercase: false,

    /**
     * A title invented from the last slug segment is a title nobody wrote.
     * Every page here carries one from its frontmatter, and `modules/validate`
     * fails the build over a page that does not — so the fallback can only ever
     * mask that check.
     */
    fallbackTitle: false,

    /**
     * `app.vue` owns the title template — it appends the site's own name, which
     * is what a tab and a search result need. Letting site config inject a
     * second one leaves two templates competing over one title.
     */
    mergeWithSiteConfig: false
  },

  /**
   * The link check REPORTS, it does not fail the build: `modules/validate.ts`
   * already fails it over a link pointing nowhere, and it is the one that knows
   * about versions and locale fallbacks. Two gates over one rule means the
   * looser one decides when a build breaks, which is the wrong way round.
   *
   * What the module adds over that is the devtools panel and the live check
   * while writing, which is where a broken link is cheapest to fix.
   */
  linkChecker: {
    failOnError: false,
    excludeLinks: ['/devtools/**']
  },

  colorMode: {
    // shadcn switches on a `dark` class, not a data attribute or a media query.
    classSuffix: '',
    preference: 'system',
    fallback: 'light'
  },

  shadcn: {
    // PREFIXED, and deliberately. Without one the layer auto-imports `Button`,
    // `Input`, `Card` and a hundred more into every site that extends it —
    // ordinary words a consumer is likely to want for a component of their own,
    // and a collision resolves silently in favour of whichever Nuxt registered
    // last. `Ui` says where a component comes from at the call site and keeps
    // the plain names free for the site being built.
    prefix: 'Ui',
    componentDir: layer('./app/components/ui')
  },

  icon: {
    // SVG mode, not the default span: shadcn's Alert, Button and Sidebar all
    // style their icon slot with `>svg` selectors, which never match a span.
    mode: 'svg',

    // Inline the icons actually used into the client bundle instead of fetching
    // them per collection after hydration — no roundtrip, no icon flash.
    clientBundle: {
      // Vue and TS files, plus the MARKDOWN a docs site is made of. Without the
      // second glob an icon named only in a page's frontmatter — which is where
      // a documentation tree names most of its icons — is missing from the
      // bundle, so it is absent from the server-rendered HTML and arrives, if
      // at all, over the network after hydration. `**/*.md` reaches the pages
      // of the consumer's own repository; a source downloaded from another one
      // is cached outside the scan and still falls back to the API.
      scan: {
        globInclude: ['**/*.{vue,jsx,tsx,ts,js,mjs}', '**/*.md']
      },
      sizeLimitKb: 512,

      // The locale switcher names its flags at runtime (`flag:${code}-4x3`), so
      // the scanner above cannot see them and they would be fetched over the
      // network after hydration instead. Derived from `locales` rather than
      // listed by hand: a new locale brings its flag along by itself.
      icons: locales.map(
        (locale) => `flag:${locale.code.split('-')[1]!.toLowerCase()}-4x3`
      )
    }
  },

  /**
   * The layer's own interface, translated. NOT the Markdown — that is a
   * separate question and deliberately untouched here.
   *
   * `strategy: 'prefix_except_default'` is the load-bearing choice. duxt serves
   * `/getting-started` today, and `prefix` would move that to
   * `/en-GB/getting-started` for every consumer that has one — a breaking
   * change to the URLs docs are reached by, paid by the many single-locale
   * consumers to benefit the few multilingual ones. It is also what VitePress,
   * Starlight and Docusaurus all do. A consumer whose site has no leading
   * language writes `i18n: { strategy: 'prefix' }` and gets the symmetric
   * scheme in one line.
   *
   * The price: `defaultLocale` becomes URL-relevant. Changing it later moves
   * every page in both directions at once. Set it once, then leave it.
   *
   * `langDir` stays RELATIVE on purpose, against this layer's own i18n/
   * directory. Everything else layer-relative in this file goes through
   * `layer()`, but i18n resolves langDir per layer itself — that is what its
   * layers support is — and handing it an absolute path opts out of the
   * merging that lets a consumer override a single string.
   */
  i18n: {
    locales,
    defaultLocale: 'en-GB',
    langDir: 'locales',
    strategy: 'prefix_except_default',
    vueI18n: 'i18n.config.ts',
    detectBrowserLanguage: {
      fallbackLocale: 'en-GB',
      useCookie: true,
      cookieKey: 'duxt_locale',
      cookieSecure: true,
      // An explicit URL stays authoritative: /de-DE/guide shared into a chat
      // must still be German for whoever opens it. Only '/' follows the
      // browser's preference.
      redirectOn: 'root',
      alwaysRedirect: false
    }
  },

  vite: {
    plugins: [tailwindcss()],

    ssr: {
      // reka-ui is a dependency of the LAYER, so Nitro externalises it for SSR
      // and the server imports a different copy than the client bundle uses.
      // Its provide/inject then never matches and SSR dies with a null
      // instance. Inlining it keeps one copy on both sides.
      noExternal: ['reka-ui', 'vue-sonner']
    },

    resolve: {
      // Force singleton resolution. The layer and the project extending it can
      // each resolve their own copy of these, and reka-ui's provide/inject then
      // stops matching across the two — which only fails in a production build,
      // where dev's shared module graph is gone. gildstone carries the same
      // dedupe for the same class of bug.
      dedupe: ['vue', 'reka-ui', 'vue-sonner']
    }
  }
});
