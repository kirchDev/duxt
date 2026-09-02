import { fileURLToPath } from 'node:url';
import { defineNuxtConfig } from 'nuxt/config';
import tailwindcss from '@tailwindcss/vite';

/** Resolve against this layer, not the project extending it. */
const layer = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// The layer itself. A consumer gets all of this by extending '@kirchdev/duxt',
// which resolves through package.json's `main` to this file.
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/icon', '@nuxtjs/color-mode', 'shadcn-nuxt'],

  css: [layer('./app/assets/css/duxt.css')],

  // '@' belongs to whoever extends the layer. Imports inside the layer use
  // '@duxt' so they resolve here regardless of the consumer's own aliases.
  alias: {
    '@duxt': layer('./app')
  },

  content: {
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
    mode: 'svg'
  },

  vite: {
    plugins: [tailwindcss()]
  }
});
