// Deliberately empty of lists. The layer's own defaults live in
// app/utils/duxt-config.ts, because Nuxt merges app.config with defu and defu
// concatenates arrays — a consumer overriding `navigation` would get the
// layer's entries appended to its own. A consumer still writes its overrides
// here; useDuxtConfig() merges them with arrays replacing rather than adding.
export default defineAppConfig({
  duxt: {}
});
