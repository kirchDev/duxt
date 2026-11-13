import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { Nuxt } from '@nuxt/schema';
import { isContentComponent } from '../build/content/content-components';
import { contentCompatibility } from '../build/content/content-compatibility';
import { duxtRedirectTables } from './redirects';

export default function duxtContentBundles(_options: unknown, nuxt: Nuxt) {
  const config = nuxt.options.runtimeConfig as unknown as {
    duxt?: Record<string, unknown>;
  };
  const duxt = (config.duxt ??= {}) as {
    contentBundles?: {
      dir?: string;
      statusRoute?: boolean;
      pollSeconds?: number;
    };
  };
  duxt.contentBundles = {
    dir: '',
    statusRoute: false,
    pollSeconds: 30,
    ...duxt.contentBundles
  };
  nuxt.options.build.templates.push({
    filename: 'types/duxt-content-bundle.d.ts',
    write: true,
    getContents: () =>
      `declare module '#duxt/content-bundle-compat' { const artifact: { compatHash: string; availableComponents: string[] }; export default artifact; }\ndeclare module '#duxt/content-bundle-caches' { export function clearOgPayloads(): Promise<void>; }\ndeclare module '#content/dump';\n`
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
    // Bun and deno-server inherit node-server, including its node: true flag.
    if (
      nuxt.options.dev ||
      !nitro.options.node ||
      nitro.options.exportConditions?.some(
        (condition) => condition === 'bun' || condition === 'deno'
      ) ||
      nitro.options.static ||
      database?.type !== 'sqlite'
    )
      return;
    // Content keeps build-used local loaders unchanged. Extra content globals
    // resolve only after the request opts in; ordinary renders keep their surface.
    const wrapped = new WeakSet<object>();
    nuxt.hook('app:templates', (app) => {
      const template = app.templates.find(
        (entry) => entry.filename === 'content/components.ts'
      );
      if (!template?.getContents || wrapped.has(template)) return;
      wrapped.add(template);
      const original = template.getContents;
      template.getContents = (data) => {
        const used = (
          template.options as { manifest: { components: string[] } }
        ).manifest.components;
        return original({
          ...data,
          app: {
            ...data.app,
            components: data.app.components.map((component) =>
              isContentComponent(nuxt, component) &&
              !used.includes(component.pascalName)
                ? { ...component, global: true }
                : component
            )
          }
        });
      };
    });
    nuxt.options.build.templates.push({
      filename: 'duxt-content-bundle-components.ts',
      write: true,
      getContents: ({ app }) => {
        const names = [
          ...new Set(
            app.components
              .filter((component) => isContentComponent(nuxt, component))
              .map((component) => component.pascalName)
          )
        ];
        return names.length
          ? `import { ${names.map((name) => 'Lazy' + name).join(', ')} } from '#components';\nexport default [${names.map((name) => `[${JSON.stringify(name)}, Lazy${name}]`).join(', ')}] as const;`
          : 'export default [] as const;';
      }
    });
    (nuxt.options.plugins ??= []).push({
      src: fileURLToPath(
        new URL('./runtime/content-bundles/app-plugin.ts', import.meta.url)
      ),
      order: -25
    });
    const redirects = duxtRedirectTables(nuxt);
    // Also registered here: a server that answers redirects itself reads the
    // tables, even in an app that does not run the redirects module.
    nitro.options.virtual['#duxt/redirects'] ??= () =>
      `export default ${JSON.stringify(redirects)};`;
    for (const path of redirects.redirects)
      delete nitro.options.routeRules[path];
    redirects.redirectOverrides = Object.keys(nitro.options.routeRules ?? {});
    nitro.options.virtual['#duxt/content-bundle-caches'] = nitro.options
      .alias?.['#og-image-cache']
      ? "import { htmlPayloadCache } from '#og-image-cache'; export const clearOgPayloads = () => htmlPayloadCache.clear();"
      : 'export const clearOgPayloads = async () => {};';
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
