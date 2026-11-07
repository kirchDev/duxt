import { fileURLToPath } from 'node:url';
import { defineContentConfig, z } from '@nuxt/content';
import {
  duxtBuildDirectories,
  readDuxtBuildConfig
} from './build/config/duxt-app-config';
import { duxtSectionTypes } from './build/sections/sections-resolve';
import { duxtGeneratedCollections } from './build/sections/sections';
import { duxtSources, pageSchema } from './build/sources/sources';

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
 * The reader obtains the active Nuxt layer list even through Content's c12
 * loader. Build-only contributions merge from low to high precedence; the
 * site wins. Without a source declaration, a single `docs/` folder is enough.
 */
const layerDir = fileURLToPath(new URL('.', import.meta.url));
const config = readDuxtBuildConfig(
  duxtBuildDirectories([process.cwd(), layerDir])
);

const sources = config?.sources ?? [{ path: 'docs' }];
const options = config?.sourceOptions ?? {};
const types = duxtSectionTypes(config?.sectionTypes);
const schema = pageSchema.extend(config?.pageSchema?.(z) ?? {});

export default defineContentConfig({
  collections: {
    ...duxtSources(sources, options, schema),
    // Off until a source declares one, so a site that generates nothing gets
    // exactly the collections it always got, under the names it always had.
    ...duxtGeneratedCollections(sources, options, types, schema)
  }
});
