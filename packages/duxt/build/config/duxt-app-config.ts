import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, isAbsolute, join } from 'node:path';
import { createJiti } from 'jiti';
import { tryUseNuxt, loadNuxtConfig } from 'nuxt/kit';
import {
  duxtLayerDirectory,
  readDuxtContributions
} from './duxt-contributions';
import type { DuxtBuildContribution } from './duxt-contributions';
import type {
  DuxtSource,
  DuxtSourcesOptions
} from '../sources/sources-resolve';
import type { DuxtSectionTypes } from '../sections/sections-resolve';

/** The build-time half of `app.config`'s `duxt` key. */
export interface DuxtBuildConfig extends DuxtBuildContribution {
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
  /**
   * The landing page — read here for the LANGUAGES of its code demos only.
   *
   * They are highlighted by the same runtime highlighter as the samples, so
   * `modules/config.ts` adds each named language to its grammar set. Typed
   * structurally for the reason `requestSamples` is.
   */
  landing?: {
    showcase?: { demo?: { files?: { language?: string }[] } }[];
  };
}

/**
 * Merge `duxt` from every layer, then its build-only contribution.
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
  // NO MODULE CACHE. `nuxi dev` restarts Nuxt inside the same process when a
  // config file changes, and jiti's default hands every later read the module
  // it loaded first — so an edited `app.config.ts` kept building collections
  // from the options the dev server started with, until the process was killed.
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    moduleCache: false,
    nativeModules: ['nuxt', '@nuxt/kit']
  });

  // `defineAppConfig` is a Nuxt auto-import that does not exist in plain Node.
  // It is the identity function, so a stub is the whole of it.
  const globals = globalThis as {
    defineAppConfig?: (value: unknown) => unknown;
  };
  const had = 'defineAppConfig' in globals;
  globals.defineAppConfig ??= (value: unknown) => value;

  const directories = [...new Set([...dirs, duxtLayerDirectory])];
  let result: DuxtBuildConfig = {};
  try {
    for (const dir of [...directories].reverse()) {
      if (!dir) continue;

      const file = [
        join(dir, 'app', 'app.config.ts'),
        join(dir, 'app.config.ts')
      ].find((candidate) => existsSync(candidate));

      if (file)
        try {
          const loaded = jiti(file) as
            | { duxt?: DuxtBuildConfig }
            | { default?: { duxt?: DuxtBuildConfig } };

          const duxt =
            (loaded as { duxt?: DuxtBuildConfig }).duxt ??
            (loaded as { default?: { duxt?: DuxtBuildConfig } }).default?.duxt;

          if (duxt) result = mergeConfig(result, duxt);
        } catch (error) {
          // A consumer's app.config may touch something that only exists inside
          // the Nuxt runtime. Falling through to the layer's own defaults is the
          // behaviour without this reader at all — a warning, not a dead build.
          console.warn(
            `[duxt] could not read ${file}: ${(error as Error).message}`
          );
        }
      const contribution = readDuxtContributions([dir]);
      const previous = result.pageSchema;
      result = mergeConfig(result, contribution);
      if (contribution.pageSchema && previous) {
        result.pageSchema = (schema) => ({
          ...previous(schema),
          ...contribution.pageSchema!(schema)
        });
      }
    }
  } finally {
    if (!had) delete globals.defineAppConfig;
  }

  return result;
}

/** Arrays replace; objects merge by key; parser functions remain executable. */
function mergeConfig<T extends object>(base: T, override: Partial<T>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const previous = result[key];
      const object =
        previous && typeof previous === 'object' && !Array.isArray(previous)
          ? previous
          : {};
      result[key] =
        key === 'sectionTypes' || key === 'sourceFlavors'
          ? { ...object, ...value }
          : mergeConfig(object, value);
    } else result[key] = value;
  }
  return result as T;
}

/** Content's c12 loader shares Nuxt's context, even from another cwd. */
export function duxtBuildDirectories(fallback: string[]): string[] {
  return (
    (tryUseNuxt()
      ?.options._layers.flatMap((entry) => [
        entry.config.rootDir,
        entry.config.srcDir
      ])
      .filter(Boolean) as string[] | undefined) ?? fallback
  );
}

const layerReceipt = (rootDir: string) =>
  join(rootDir, '.data/duxt/build-layers.json');

function layerIdentity(dir: string): string {
  const hash = createHash('sha256');
  for (const name of [
    'nuxt.config.ts',
    'nuxt.config.mts',
    'nuxt.config.js',
    'nuxt.config.mjs',
    'package.json',
    '.nuxtrc'
  ]) {
    const file = join(dir, name);
    hash.update(name).update('\0');
    if (existsSync(file)) hash.update(readFileSync(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

/** Only active Nuxt writes this receipt, without claiming a second process. */
export function rememberDuxtBuildDirectories(
  rootDir: string,
  dirs: string[]
): void {
  const root = realpathSync(rootDir);
  const layers = [
    ...new Set(
      dirs.filter((dir) => existsSync(dir)).map((dir) => realpathSync(dir))
    )
  ].map((dir) => ({ dir, identity: layerIdentity(dir) }));
  const file = layerReceipt(root);
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify({ version: 1, root, layers }));
  renameSync(temporary, file);
}

function preparedDirectories(rootDir: string): string[] | undefined {
  try {
    const root = realpathSync(rootDir);
    const receipt = JSON.parse(readFileSync(layerReceipt(root), 'utf8')) as {
      version?: number;
      root?: string;
      layers?: { dir?: string; identity?: string }[];
    };
    if (
      receipt.version !== 1 ||
      receipt.root !== root ||
      !Array.isArray(receipt.layers) ||
      !receipt.layers.length
    )
      return;
    const directories: string[] = [];
    for (const layer of receipt.layers) {
      if (
        typeof layer.dir !== 'string' ||
        !isAbsolute(layer.dir) ||
        realpathSync(layer.dir) !== layer.dir ||
        layer.identity !== layerIdentity(layer.dir)
      )
        return;
      directories.push(layer.dir);
    }
    return directories.includes(root) ? directories : undefined;
  } catch {
    return undefined;
  }
}

/** Reports use their prepared cache; fresh cache-key discovery uses Nuxt itself. */
export async function readDuxtSiteBuildConfig(
  rootDir: string,
  options: { prepared?: boolean } = {}
): Promise<DuxtBuildConfig | undefined> {
  const active = tryUseNuxt();
  if (active?.options.rootDir === rootDir)
    return readDuxtBuildConfig(duxtBuildDirectories([rootDir]));
  const prepared = preparedDirectories(rootDir);
  if (prepared) return readDuxtBuildConfig(prepared);
  if (options.prepared)
    throw new Error(
      `duxt: build-layer metadata is missing or stale for ${rootDir}. Run pnpm exec nuxt prepare or build this site before running duxt report.`
    );
  const nuxt = await loadNuxtConfig({ cwd: rootDir });
  return readDuxtBuildConfig(
    nuxt._layers
      .flatMap((entry) => [entry.config.rootDir, entry.config.srcDir])
      .filter(Boolean) as string[]
  );
}
