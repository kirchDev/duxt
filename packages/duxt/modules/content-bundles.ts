import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { Nuxt } from '@nuxt/schema';
import { contentCompatibility } from '../build/content/content-compatibility';

export default function duxtContentBundles(_options: unknown, nuxt: Nuxt) {
  const config = nuxt.options.runtimeConfig as unknown as {
    duxt?: Record<string, unknown>;
  };
  const duxt = (config.duxt ??= {}) as {
    contentBundles?: { dir?: string; statusRoute?: boolean };
  };
  duxt.contentBundles = { dir: '', statusRoute: false, ...duxt.contentBundles };
  nuxt.options.build.templates.push({
    filename: 'types/duxt-content-bundle.d.ts',
    write: true,
    getContents: () =>
      `declare module '#duxt/content-bundle-compat' { const artifact: { compatHash: string; availableComponents: string[] }; export default artifact; }\ndeclare module '#content/dump';\n`
  });
  nuxt.hook('prepare:types', ({ references }) => {
    references.push({
      path: join(nuxt.options.buildDir, 'types/duxt-content-bundle.d.ts')
    });
  });
  nuxt.hook('nitro:init', (nitro) => {
    const database = (
      nuxt.options.runtimeConfig.content as
        | { database?: { type?: string } }
        | undefined
    )?.database;
    if (
      nuxt.options.dev ||
      !nitro.options.node ||
      nitro.options.static ||
      database?.type !== 'sqlite'
    )
      return;
    nitro.options.virtual['#duxt/content-bundle-compat'] = async () => {
      const { artifact } = await contentCompatibility(nuxt);
      return 'export default ' + JSON.stringify(artifact) + ';';
    };
    nitro.options.plugins.push(
      fileURLToPath(
        new URL('./runtime/content-bundles/plugin.ts', import.meta.url)
      )
    );
  });
}
