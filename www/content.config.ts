import { defineContentConfig } from '@nuxt/content';
import { duxtSources } from '@kirchdev/duxt/sources';
import { sourceOptions, sources } from './duxt.sources';

// Content merges content.config.ts from every layer, later ones winning. This
// file therefore replaces the layer's single-source collection with the site's
// own list rather than adding to it.
export default defineContentConfig({
  collections: duxtSources(sources, sourceOptions)
});
