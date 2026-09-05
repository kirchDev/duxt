import { fileURLToPath } from 'node:url';
import type { Nuxt } from '@nuxt/schema';
import { readDuxtBuildConfig } from '../duxt-app-config';
import { duxtSourceManifest, reservedSegments } from '../sources-resolve';
import { resolveLatestRefs } from '../sources-git';

/**
 * A window into the layer that has been hardest to debug.
 *
 * `sources` is a compact list a consumer writes; what the site actually serves
 * is a set of collections, prefixes and defaults the resolver computed from it,
 * and until now the only way to see that was to read the code that produces it.
 * Every version bug this repo had would have been obvious from this table.
 *
 * Registered through the `devtools:customTabs` hook rather than
 * `@nuxt/devtools-kit`'s `addCustomTab`, which is the same push into the same
 * array — one fewer dependency in a published layer for no loss.
 *
 * Dev only: the route it points at exposes the resolved configuration, which is
 * nobody's business in production.
 */
export default function duxtDevtools(_options: unknown, nuxt: Nuxt) {
  if (!nuxt.options.dev) return;

  const layerDir = fileURLToPath(new URL('..', import.meta.url));

  const dirs = [
    ...nuxt.options._layers.flatMap((entry) => [
      entry.config.rootDir,
      entry.config.srcDir
    ]),
    layerDir
  ].filter(Boolean) as string[];

  const config = readDuxtBuildConfig(dirs);
  const sources = duxtSourceManifest(
    resolveLatestRefs(config?.sources ?? [{ path: 'docs' }]),
    config?.sourceOptions ?? {}
  );

  const reserved = reservedSegments(sources);

  const data = {
    sources,
    reserved: Object.fromEntries(
      [...reserved].map(([collection, segments]) => [collection, [...segments]])
    )
  };

  /**
   * The data reaches the handler as a virtual module, not through
   * `runtimeConfig`.
   *
   * runtimeConfig was the first attempt and it does not arrive: a module
   * writing `nuxt.options.runtimeConfig` after Nitro has taken its copy leaves
   * the handler reading an empty object, and the tab renders "no sources
   * resolved" on a site with three. A virtual is generated in the same hook
   * that registers the route, so the two cannot come apart.
   */
  nuxt.hook('nitro:config', (nitro) => {
    nitro.virtual ||= {};
    nitro.virtual['#duxt-devtools'] =
      `export const devtools = ${JSON.stringify(data)};`;

    nitro.handlers ||= [];
    nitro.handlers.push({
      route: '/_duxt/devtools',
      method: 'get',
      handler: fileURLToPath(
        new URL('../server/routes/_duxt/devtools.get.ts', import.meta.url)
      )
    });
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
