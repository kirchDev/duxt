import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const ownedFolders = [
  'build/openapi/',
  'build/bruno/',
  'build/tfplugindocs/',
  'app/integrations/',
  'app/components/integrations/'
];
// Existing runtime implementations retain their auto-import names until package extraction.
// These are individual integration files, never whole generic utility/type directories.
const ownedRuntime = new Set([
  'app/components/DuxtBrunoEntries.vue',
  'app/components/DuxtOpenApiCallbacks.vue',
  'app/components/DuxtOpenApiClient.vue',
  'app/components/DuxtOpenApiMedia.vue',
  'app/components/DuxtOpenApiMethod.vue',
  'app/components/DuxtOpenApiParameters.vue',
  'app/components/DuxtOpenApiResponses.vue',
  'app/components/DuxtOpenApiSchema.vue',
  'app/components/DuxtOpenApiSecurity.vue',
  'app/components/content/BrunoOverview.vue',
  'app/components/content/BrunoRequest.vue',
  'app/components/content/BrunoRequests.vue',
  'app/components/content/OpenApiOperation.vue',
  'app/components/content/OpenApiOperations.vue',
  'app/components/content/OpenApiOverview.vue',
  'app/components/DuxtJsonEditor.vue',
  'app/composables/useDuxtRequest.ts',
  'app/utils/openapi.ts',
  'app/utils/request-samples.ts',
  'app/layouts/reference.vue'
]);
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? files(path)
      : /\.(ts|vue)$/.test(entry.name)
        ? [path]
        : [];
  });
}
it('keeps core free of integration imports and named dispatch', () => {
  const core = ['app', 'build', 'modules', 'server']
    .flatMap((dir) => files(join(root, dir)))
    .map((path) => ({
      path: relative(root, path),
      source: readFileSync(path, 'utf8')
    }))
    .filter(
      ({ path }) =>
        !ownedFolders.some((folder) => path.startsWith(folder)) &&
        !ownedRuntime.has(path)
    );
  expect(core.length).toBeGreaterThan(150);
  const offenders = core.flatMap(({ path, source }) => {
    const code = source
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    return /openapi|bruno|tfplugindocs/i.test(code) ? [path] : [];
  });
  expect(offenders).toEqual([]);
  const registrationEdge =
    'app/utils/duxt-config.ts -> app/integrations/defaults.ts';
  const edges = core.flatMap(({ path, source }) =>
    [
      ...source.matchAll(
        /(?:from|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g
      )
    ].flatMap((match) => {
      const specifier = match[1]!;
      const target = specifier.startsWith('.')
        ? relative(root, resolve(root, dirname(path), specifier))
        : specifier.startsWith('@duxt/')
          ? `app/${specifier.slice(6)}`
          : '';
      return ownedFolders.some((folder) => target.startsWith(folder))
        ? [`${path} -> ${target.replace(/\.ts$/, '')}.ts`]
        : [];
    })
  );
  // The aggregate is the explicit built-in registration boundary; no generic
  // caller may reach an owned implementation through a neutral alias instead.
  expect(edges).toEqual([registrationEdge]);
});
