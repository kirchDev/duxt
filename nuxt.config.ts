import { fileURLToPath } from 'node:url';
import { defineNuxtConfig } from 'nuxt/config';
import tailwindcss from '@tailwindcss/vite';

/** Resolve against this layer, not the project extending it. */
const layer = (path: string) => fileURLToPath(new URL(path, import.meta.url));

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
      'en/duxt/code.json',
      'en/duxt/defaults.json',
      'en/duxt/error.json',
      'en/duxt/locale.json',
      'en/duxt/nav.json',
      'en/duxt/search.json',
      'en/duxt/theme.json',
      'en/duxt/toc.json'
    ]
  },
  {
    code: 'en-US' as const,
    language: 'en-US',
    name: 'English (US)',
    files: [
      'en/duxt/code.json',
      'en/duxt/defaults.json',
      'en/duxt/error.json',
      'en/duxt/locale.json',
      'en/duxt/nav.json',
      'en/duxt/search.json',
      'en/duxt/theme.json',
      'en/duxt/toc.json'
    ]
  },
  {
    code: 'de-DE' as const,
    language: 'de-DE',
    name: 'Deutsch',
    files: [
      'de/duxt/code.json',
      'de/duxt/defaults.json',
      'de/duxt/error.json',
      'de/duxt/locale.json',
      'de/duxt/nav.json',
      'de/duxt/search.json',
      'de/duxt/theme.json',
      'de/duxt/toc.json'
    ]
  },
  {
    code: 'es-ES' as const,
    language: 'es-ES',
    name: 'Español',
    files: [
      'es/duxt/code.json',
      'es/duxt/defaults.json',
      'es/duxt/error.json',
      'es/duxt/locale.json',
      'es/duxt/nav.json',
      'es/duxt/search.json',
      'es/duxt/theme.json',
      'es/duxt/toc.json'
    ]
  },
  {
    code: 'fr-FR' as const,
    language: 'fr-FR',
    name: 'Français',
    files: [
      'fr/duxt/code.json',
      'fr/duxt/defaults.json',
      'fr/duxt/error.json',
      'fr/duxt/locale.json',
      'fr/duxt/nav.json',
      'fr/duxt/search.json',
      'fr/duxt/theme.json',
      'fr/duxt/toc.json'
    ]
  },
  {
    code: 'pt-PT' as const,
    language: 'pt-PT',
    name: 'Português',
    files: [
      'pt/duxt/code.json',
      'pt/duxt/defaults.json',
      'pt/duxt/error.json',
      'pt/duxt/locale.json',
      'pt/duxt/nav.json',
      'pt/duxt/search.json',
      'pt/duxt/theme.json',
      'pt/duxt/toc.json'
    ]
  },
  {
    code: 'pt-BR' as const,
    language: 'pt-BR',
    name: 'Português (Brasil)',
    files: [
      'pt/duxt/code.json',
      'pt/duxt/defaults.json',
      'pt/duxt/error.json',
      'pt/duxt/locale.json',
      'pt/duxt/nav.json',
      'pt/duxt/search.json',
      'pt/duxt/theme.json',
      'pt/duxt/toc.json',
      'pt-BR/duxt/defaults.json',
      'pt-BR/duxt/error.json',
      'pt-BR/duxt/nav.json',
      'pt-BR/duxt/search.json'
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
    '@nuxt/content',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    'shadcn-nuxt',
    '@nuxtjs/mcp-toolkit',
    '@nuxtjs/i18n'
  ],

  /**
   * Register the layer's own server routes.
   *
   * `serverDir` is not layer-aware: Nuxt takes the consumer's, so setting it
   * here either did nothing or replaced the consumer's `server/`. The symptom
   * was llms.txt answering with the site's 404 page, because no handler was
   * registered and the catch-all route took it.
   *
   * A nitro hook is layer-safe and composes — the consumer keeps its own
   * `server/` untouched — and needs no @nuxt/kit dependency to do it.
   */
  hooks: {
    'nitro:config': (nitro) => {
      nitro.handlers ||= [];
      nitro.handlers.push({
        route: '/llms.txt',
        method: 'get',
        handler: layer('./server/routes/llms.txt.get.ts')
      });
    }
  },

  // A real MCP server at /mcp, through the official SDK, instead of a JSON
  // endpoint someone else has to wrap. Tools live in server/mcp/tools.
  mcp: {
    name: 'duxt documentation',
    description: 'The documentation this site publishes, readable by an agent.',
    instructions:
      'Call list_pages for the table of contents, search_docs to find a page by ' +
      'term, and read_page for the full text of one page.'
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
          langs: [
            'bash',
            'css',
            'diff',
            'html',
            'json',
            'js',
            'jsonc',
            'md',
            'mdc',
            'php',
            'sh',
            'ts',
            'vue',
            'yaml'
          ]
        }
      }
    },

    // Content's default driver, better-sqlite3, is a native addon compiled
    // through node-gyp. Node 24 ships node:sqlite, so no driver package is
    // needed — see CLAUDE.md for the fallback if this flag ever goes away.
    experimental: {
      nativeSqlite: true
    }
  },

  colorMode: {
    // shadcn switches on a `dark` class, not a data attribute or a media query.
    classSuffix: '',
    preference: 'system',
    fallback: 'light'
  },

  shadcn: {
    prefix: '',
    componentDir: layer('./app/components/ui')
  },

  icon: {
    // SVG mode, not the default span: shadcn's Alert, Button and Sidebar all
    // style their icon slot with `>svg` selectors, which never match a span.
    mode: 'svg',

    // Inline the icons actually used into the client bundle instead of fetching
    // them per collection after hydration — no roundtrip, no icon flash.
    clientBundle: {
      scan: true,
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
