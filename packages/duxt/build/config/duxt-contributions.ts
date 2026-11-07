import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import type { z } from '@nuxt/content';
import type { ZodType } from 'zod';
import type { DuxtSectionTypes } from '../sections/sections-resolve';

export interface DuxtSourceFlavorDefinition {
  /** Alter page metadata after Markdown parsing, before Content stores it. */
  normalise: (page: Record<string, unknown>, file: string) => void;
}

/** Build-only declarations in a layer's `duxt.build.ts`; never app.config. */
export interface DuxtBuildContribution {
  sectionTypes?: DuxtSectionTypes;
  sourceFlavors?: Record<string, DuxtSourceFlavorDefinition>;
  /** Content's own Zod instance is handed in so its schema converter recognises fields. */
  pageSchema?: (schema: typeof z) => Record<string, ZodType>;
}

export const duxtLayerDirectory = fileURLToPath(
  new URL('../..', import.meta.url)
);

/** Directories are highest precedence first, as Nuxt's `_layers` are. */
export function readDuxtContributions(dirs: string[]): DuxtBuildContribution {
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    moduleCache: false,
    nativeModules: ['nuxt', '@nuxt/kit']
  });
  const result: DuxtBuildContribution = {};
  for (const dir of [...new Set(dirs.filter(Boolean))].reverse()) {
    const file = join(dir, 'duxt.build.ts');
    if (!existsSync(file)) continue;
    // A missing/invalid parser must fail the build, never silently drop a collection.
    const loaded = jiti(file) as DuxtBuildContribution;
    result.sectionTypes = { ...result.sectionTypes, ...loaded.sectionTypes };
    result.sourceFlavors = { ...result.sourceFlavors, ...loaded.sourceFlavors };
    if (loaded.pageSchema) {
      const previous = result.pageSchema;
      result.pageSchema = (schema) => ({
        ...previous?.(schema),
        ...loaded.pageSchema!(schema)
      });
    }
  }
  return result;
}
