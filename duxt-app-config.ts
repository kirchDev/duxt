import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createJiti } from 'jiti';
import type { DuxtSource, DuxtSourcesOptions } from './sources-resolve';

/** The build-time half of `app.config`'s `duxt` key. */
export interface DuxtBuildConfig {
  /** Documentation sources — one folder, or many, in this repo or others. */
  sources?: DuxtSource[];
  /** How those sources become URL prefixes. */
  sourceOptions?: DuxtSourcesOptions;
  /** Which of the layer's locales this site serves. */
  locales?: string[];
}

/**
 * Read `duxt` out of the nearest `app.config.ts`.
 *
 * `app.config.ts` is a RUNTIME file — Nuxt compiles it into a virtual module
 * for the browser and never hands its value to the build, which is why
 * `nuxt.options.appConfig` is empty of it. But sources decide collections and
 * locales decide routes, and both are settled long before a browser exists.
 * So the file is executed here instead of read, exactly as c12 executes
 * `content.config.ts` — the same seam, in the same repository.
 *
 * This is what lets a consumer configure duxt in ONE file. Before it, the
 * source list had to live in a `duxt.sources.ts` of its own purely because two
 * loaders needed it and neither could see the other's result.
 *
 * Synchronous on purpose: `content.config.ts` is loaded synchronously by
 * Content, and an async default export there is not a thing.
 */
export function readDuxtBuildConfig(
  dirs: string[]
): DuxtBuildConfig | undefined {
  const jiti = createJiti(import.meta.url, { interopDefault: true });

  // `defineAppConfig` is a Nuxt auto-import that does not exist in plain Node.
  // It is the identity function, so a stub is the whole of it.
  const globals = globalThis as {
    defineAppConfig?: (value: unknown) => unknown;
  };
  const had = 'defineAppConfig' in globals;
  globals.defineAppConfig ??= (value: unknown) => value;

  try {
    for (const dir of dirs) {
      if (!dir) continue;

      const file = [
        join(dir, 'app', 'app.config.ts'),
        join(dir, 'app.config.ts')
      ].find((candidate) => existsSync(candidate));

      if (!file) continue;

      try {
        const loaded = jiti(file) as
          | { duxt?: DuxtBuildConfig }
          | { default?: { duxt?: DuxtBuildConfig } };

        const duxt =
          (loaded as { duxt?: DuxtBuildConfig }).duxt ??
          (loaded as { default?: { duxt?: DuxtBuildConfig } }).default?.duxt;

        if (duxt) return duxt;
      } catch (error) {
        // A consumer's app.config may touch something that only exists inside
        // the Nuxt runtime. Falling through to the layer's own defaults is the
        // behaviour without this reader at all — a warning, not a dead build.
        console.warn(
          `[duxt] could not read ${file}: ${(error as Error).message}`
        );
      }
    }
  } finally {
    if (!had) delete globals.defineAppConfig;
  }

  return undefined;
}
