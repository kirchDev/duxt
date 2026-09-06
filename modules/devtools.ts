import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Nuxt } from '@nuxt/schema';

/**
 * A window into the layer that has been hardest to debug.
 *
 * `sources` is a compact list a consumer writes; what the site actually serves
 * is a set of collections, prefixes, redirects, message catalogues and a
 * download cache that the build computed from it, and until now the only way to
 * see any of that was to read the code that produces it. Every version bug this
 * repo had would have been obvious from one of these panels.
 *
 * Registered through the `devtools:customTabs` hook rather than
 * `@nuxt/devtools-kit`'s `addCustomTab`, which is the same push into the same
 * array — one fewer dependency in a published layer for no loss.
 *
 * Dev only: the panels expose the resolved configuration, the file system paths
 * behind it and a button that deletes a cache directory. None of that is
 * anybody's business in production, and returning here means the route is never
 * registered rather than registered and guarded.
 */
export default function duxtDevtools(_options: unknown, nuxt: Nuxt) {
  if (!nuxt.options.dev) return;

  const layerDir = fileURLToPath(new URL('..', import.meta.url));

  /**
   * Paths only — no resolved data.
   *
   * The first version put the whole resolved manifest in here, and it went
   * stale the moment anyone edited `app.config.ts`: a virtual module is
   * generated once, so the tab kept describing the previous build while the
   * site served the new one. What a request handler genuinely cannot work out
   * for itself is where things are on disk, so that is all this carries; the
   * panels read everything else from the running app config.
   */
  const context = {
    rootDir: nuxt.options.rootDir,
    layerDir,
    dataDir: join(nuxt.options.rootDir, '.data/content'),
    appConfigFile: appConfigOf(nuxt),
    locales: localeCodes(nuxt),
    defaultLocale: (nuxt.options as { i18n?: { defaultLocale?: string } }).i18n
      ?.defaultLocale
  };

  // The handler lives OUTSIDE `server/routes/`, so this is the only thing that
  // registers it. Nitro scans a layer's route directory in every build, which
  // made the early return above a comfort rather than a guard: the tab was in
  // the production bundle until the file moved.
  nuxt.hook('nitro:config', (nitro) => {
    nitro.virtual ||= {};
    nitro.virtual['#duxt-devtools'] =
      `export const devtools = ${JSON.stringify(context)};`;

    const handler = fileURLToPath(
      new URL('../server/devtools/handler.ts', import.meta.url)
    );

    nitro.handlers ||= [];

    // Both spellings: the bare path is the tab's own URL, and `/**` carries the
    // panel. Matching only the wildcard leaves the tab itself a 404.
    for (const route of ['/_duxt/devtools', '/_duxt/devtools/**']) {
      nitro.handlers.push({ route, handler });
    }
  });

  nuxt.hook(
    'devtools:customTabs' as never,
    ((tabs: unknown[]) => {
      tabs.push({
        name: 'duxt',
        title: 'duxt',
        icon: 'lucide:book-open-text',
        view: {
          type: 'iframe',
          src: '/_duxt/devtools'
        }
      });
    }) as never
  );
}

/** The consumer's `app.config.ts`, so a panel can say where to go and edit it. */
function appConfigOf(nuxt: Nuxt): string | undefined {
  const dirs = nuxt.options._layers.flatMap((entry) => [
    entry.config.rootDir,
    entry.config.srcDir
  ]);

  for (const dir of dirs) {
    if (!dir) continue;

    const file = [
      join(dir, 'app', 'app.config.ts'),
      join(dir, 'app.config.ts')
    ].find((candidate) => existsSync(candidate));

    if (file) return file;
  }

  return undefined;
}

/** The locale segments a URL may carry, for the path debugger to strip. */
function localeCodes(nuxt: Nuxt): string[] {
  const locales = (
    nuxt.options as {
      i18n?: { locales?: (string | { code: string })[] };
    }
  ).i18n?.locales;

  return (locales ?? []).map((locale) =>
    typeof locale === 'string' ? locale : locale.code
  );
}
