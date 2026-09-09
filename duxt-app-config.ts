import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createJiti } from 'jiti';
import type { DuxtSource, DuxtSourcesOptions } from './sources-resolve';
import type { DuxtSectionTypes } from './sections-resolve';

/** The build-time half of `app.config`'s `duxt` key. */
export interface DuxtBuildConfig {
  /** Documentation sources — one folder, or many, in this repo or others. */
  sources?: DuxtSource[];
  /** How those sources become URL prefixes. */
  sourceOptions?: DuxtSourcesOptions;
  /**
   * Types a source's `generated` sections may name, beyond the layer's own.
   *
   * The registry is open, and this is the whole of it: a map rather than a
   * registration call, because `content.config.ts` and the duxt module are
   * loaded by two different loaders and a mutable registry each of them wrote
   * into would be two registries.
   */
  sectionTypes?: DuxtSectionTypes;
  /** Which of the layer's locales this site serves. */
  locales?: string[];
  /**
   * The site's name — also what the MCP server calls itself.
   *
   * Typed structurally rather than as `DuxtText`: this file is loaded by the
   * build, outside the Nuxt runtime whose generated types carry that global.
   * Same reason `scripts/check-previews.ts` declares the preview module's
   * shape instead of importing it.
   */
  title?: string | Record<string, string>;
  /**
   * The try-it client's code samples — read here for their LANGUAGES only.
   *
   * `modules/config.ts` turns the ids into the grammar set the runtime
   * highlighter loads, so a site pays for the languages its samples use and no
   * others. The generator functions are irrelevant to the build and are left
   * alone; only `language` and `id` are looked at.
   *
   * Typed structurally rather than as `DuxtRequestSample[]` for the same reason
   * `title` is not a `DuxtText`: this file is loaded by the build, outside the
   * Nuxt runtime whose generated types carry that global.
   */
  requestSamples?: (string | { id?: string; language?: string })[];
  /**
   * Extra grammars to load into the runtime highlighter.
   *
   * For `x-codeSamples`: a hand-written sample in the OpenAPI document is
   * highlighted in the browser like a generated one, but its language cannot be
   * known here — a remote source has not been cloned yet when this runs, and
   * `parse` is synchronous, so the samples cannot be coloured at build time
   * either. A document carrying Ruby samples therefore names `ruby` here, and
   * pays for that one grammar.
   */
  sampleLanguages?: string[];
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
