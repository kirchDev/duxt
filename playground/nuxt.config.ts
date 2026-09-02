export default defineNuxtConfig({
  modules: ['@nuxt/content'],
  compatibilityDate: '2026-09-02',

  content: {
    // Content's default driver is better-sqlite3, a native addon that needs a
    // node-gyp toolchain. Node 24 ships node:sqlite, so the driver can be
    // dropped entirely instead of swapped for another package.
    experimental: {
      nativeSqlite: true
    }
  }
});
