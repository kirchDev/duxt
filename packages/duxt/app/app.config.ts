// The layer ships NO app.config values.
//
// Its defaults live in app/utils/duxt-config.ts, because Nuxt merges app.config
// with defu and defu concatenates arrays — a consumer overriding `navigation`
// would get the layer's entries appended to its own. `useDuxtConfig()` merges
// them itself, replacing arrays rather than adding to them.
//
// The resolved source manifest used to be the one exception that had to sit
// here. It no longer does: the duxt module resolves it from the site's own
// `app.config.ts` and writes it back as `resolvedSources`.
export default defineAppConfig({
  duxt: {}
});
