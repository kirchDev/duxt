import { fileURLToPath } from 'node:url';
import { afterEach, expect, test, vi } from 'vitest';
import { loadNuxtConfig } from 'nuxt/kit';
import { duxtManifest } from '../../../packages/duxt/build/sections/sections-resolve';
import { searchSources } from '../../../packages/duxt/app/utils/search-scope';
import { readDuxtBuildConfig } from '../../../packages/duxt/build/config/duxt-app-config';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
afterEach(() => vi.unstubAllEnvs());

async function site(preset: string) {
  vi.stubEnv('NITRO_PRESET', preset);
  const config = await loadNuxtConfig({ cwd: rootDir });
  const directories = config._layers
    .flatMap((layer) => [layer.config.rootDir, layer.config.srcDir])
    .filter((directory): directory is string => Boolean(directory));
  const content = readDuxtBuildConfig(directories);
  expect(
    content?.sources?.find((source) => source.slug === 'demo/wiki')
  ).toMatchObject({
    path: 'apps/www/demo/wiki',
    locales: ['en-GB', { locale: 'de', path: 'apps/www/demo/wiki-de' }]
  });
  return { config, content };
}

test('Workers content excludes the internal fixtures and keeps the public wiki demo', async () => {
  const { config, content } = await site('cloudflare-module');
  expect
    .soft(content?.sources?.map((source) => source.slug))
    .toContain('demo/wiki');
  for (const slug of ['wiki', 'page-types', 'extension-fixture'])
    expect(content?.sources?.map((source) => source.slug)).not.toContain(slug);
  expect(
    config._layers.some((layer) => layer.cwd.includes('wiki-fixture'))
  ).toBe(false);
  expect(
    config._layers.some((layer) => layer.cwd.includes('build-extension'))
  ).toBe(false);
});

test('the ordinary gate build keeps both fixture layers and their sources', async () => {
  const { config, content } = await site('node-server');
  expect(content?.sources?.map((source) => source.slug)).toEqual(
    expect.arrayContaining([
      'demo/wiki',
      'wiki',
      'page-types',
      'extension-fixture'
    ])
  );
  expect(
    config._layers.some((layer) => layer.cwd.includes('wiki-fixture'))
  ).toBe(true);
  expect(
    config._layers.some((layer) => layer.cwd.includes('build-extension'))
  ).toBe(true);
});

test('the reader-facing wiki has its own search scope and display name', async () => {
  const { content } = await site('node-server');
  const manifest = duxtManifest(
    content?.sources ?? [],
    content?.sourceOptions,
    content?.sectionTypes
  );
  const current = manifest.find((source) => source.collection === 'docs');
  const active = searchSources(manifest, current, 'en-GB');
  expect(active.filter((source) => source.repo === 'demo/wiki')).toMatchObject([
    { prefix: '/demo/wiki', name: { 'en-GB': 'Lumen field guide' } }
  ]);
});
