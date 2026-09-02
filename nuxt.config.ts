import { defineNuxtConfig } from 'nuxt/config';

// The layer itself. A consumer gets all of this by extending '@kirchdev/duxt',
// which resolves through package.json's `main` to this file.
export default defineNuxtConfig({
  modules: ['@nuxt/content'],

  content: {
    // Content's default driver, better-sqlite3, is a native addon compiled
    // through node-gyp. Node 24 ships node:sqlite, so no driver package is
    // needed — see CLAUDE.md for the fallback if this flag ever goes away.
    experimental: {
      nativeSqlite: true
    }
  }
});
