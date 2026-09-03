import { sourceOptions, sources } from '../duxt.sources';
import { duxtSourceManifest } from '../sources-resolve';

// Deliberately empty of lists apart from the manifest. The layer's own defaults
// live in app/utils/duxt-config.ts, because Nuxt merges app.config with defu and
// defu concatenates arrays — a consumer overriding `navigation` would get the
// layer's entries appended to its own. A consumer still writes its overrides
// here; useDuxtConfig() merges them with arrays replacing rather than adding.
//
// The manifest is the exception that has to be here: it is how the resolved
// source list reaches the app at all, since Content loads content.config.ts in
// a pass of its own and the app never sees the result.
export default defineAppConfig({
  duxt: {
    sources: duxtSourceManifest(sources, sourceOptions)
  }
});
