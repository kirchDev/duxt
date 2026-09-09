import { fileURLToPath } from 'node:url';
import { defineContentConfig } from '@nuxt/content';
import { readDuxtBuildConfig } from './duxt-app-config';
import { duxtSectionTypes } from './sections-resolve';
import { duxtGeneratedCollections } from './sections';
import { duxtSources } from './sources';

/**
 * The collections, generated from the site's own `app.config.ts`.
 *
 * A consumer therefore writes NO content.config.ts and no source list file:
 * `duxt.sources` in `app.config.ts` is the only declaration, and both halves of
 * the layer read it from there — this file for the collections, the duxt module
 * for the resolved manifest the theme needs at runtime.
 *
 * Content merges `content.config.ts` from every layer with later ones winning,
 * so a consumer who needs collections this shorthand cannot express still
 * writes an own file and takes over completely.
 *
 * Two directories are tried, in order: the site being built, then this layer.
 * The fallback is the case the brief calls the most common one — a single
 * `docs/` folder, no versions, nothing configured at all.
 */
const layerDir = fileURLToPath(new URL('.', import.meta.url));
const config = readDuxtBuildConfig([process.cwd(), layerDir]);

const sources = config?.sources ?? [{ path: 'docs' }];
const options = config?.sourceOptions ?? {};
const types = duxtSectionTypes(config?.sectionTypes);

export default defineContentConfig({
  collections: {
    ...duxtSources(sources, options),
    // Off until a source declares one, so a site that generates nothing gets
    // exactly the collections it always got, under the names it always had.
    ...duxtGeneratedCollections(sources, options, types)
  }
});
