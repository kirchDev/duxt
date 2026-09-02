export default defineNuxtConfig({
  modules: ['@nuxt/content'],
  compatibilityDate: '2026-09-02',

  content: {
    // better-sqlite3 is Content's default and needs node-gyp, which this box
    // does not have. libsql ships prebuilt and is a supported driver.
    database: {
      type: 'libsql',
      url: 'file:./.data/content/contents.sqlite'
    }
  }
});
