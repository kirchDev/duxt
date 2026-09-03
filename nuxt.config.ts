import { fileURLToPath } from 'node:url';
import { defineNuxtConfig } from 'nuxt/config';
import tailwindcss from '@tailwindcss/vite';

/** Resolve against this layer, not the project extending it. */
const layer = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// The layer itself. A consumer gets all of this by extending '@kirchdev/duxt',
// which resolves through package.json's `main` to this file.
export default defineNuxtConfig({
  modules: [
    '@nuxt/content',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    'shadcn-nuxt',
    '@nuxtjs/mcp-toolkit'
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
      sizeLimitKb: 512
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
