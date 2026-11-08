import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  duxtLayerDirectory,
  readDuxtContributions
} from '../build/config/duxt-contributions';
import { duxtManifest } from '../build/sections/sections-resolve';
import { searchSources } from '../app/utils/search-scope';

const manifest = duxtManifest([
  {
    path: 'docs',
    slug: 'guide',
    generated: [
      {
        type: 'openapi',
        path: 'api.yaml',
        label: 'API',
        versions: [{ version: 'v3' }, { version: 'v2' }]
      },
      {
        type: 'openapi',
        path: 'admin.yaml',
        label: 'Admin',
        versions: [{ version: 'v9' }, { version: 'v8' }]
      },
      { type: 'changelog', path: 'CHANGELOG.md', label: 'Releases' }
    ]
  },
  { repo: 'acme/other', path: 'other', slug: 'other', refs: ['main', 'v1'] }
]);

describe('site-wide search editions', () => {
  it('preserves documentation and each independently versioned generated declaration', () => {
    const current = manifest.find((entry) => entry.prefix === '/guide');
    expect(
      searchSources(manifest, current).map((entry) => entry.prefix)
    ).toEqual([
      '/guide',
      '/other',
      '/guide/api',
      '/guide/admin',
      '/guide/releases'
    ]);
  });
});

it('keeps the current API edition and other artefacts at their defaults', () => {
  const current = manifest.find((entry) => entry.prefix === '/guide/v2/api');
  expect(current).toBeDefined();
  expect(searchSources(manifest, current).map((entry) => entry.prefix)).toEqual(
    ['/guide/v2/api', '/guide', '/other', '/guide/admin', '/guide/releases']
  );
});

it('selects the page resolver language chain for every chosen edition', () => {
  const translated = duxtManifest([
    {
      repo: 'acme/docs',
      path: 'docs',
      locales: ['en', 'de', 'fr'],
      refs: ['main', 'v1']
    }
  ]);
  const current = translated.find(
    (entry) => entry.isDefault && entry.locale === 'de'
  );
  expect(
    searchSources(translated, current, 'de-AT', ['fr']).map(
      (entry) => entry.locale
    )
  ).toEqual(['de', 'fr', 'en']);
});

it('includes the real www Terraform, API and release sources from getting-started', async () => {
  vi.stubGlobal('defineAppConfig', <T>(config: T) => config);
  try {
    const { default: config } =
      await import('../../../apps/www/app/app.config');
    const contributions = readDuxtContributions([
      fileURLToPath(new URL('../../../apps/www', import.meta.url)),
      fileURLToPath(
        new URL('../../../apps/www/layers/build-extension', import.meta.url)
      ),
      duxtLayerDirectory
    ]);
    const sources = duxtManifest(
      config.duxt.sources,
      config.duxt.sourceOptions,
      contributions.sectionTypes
    );
    const current = sources.find((entry) => entry.collection === 'docs');
    const active = searchSources(sources, current, 'en-GB');
    expect(active.map((entry) => entry.prefix)).toEqual([
      '',
      '/wiki',
      '/page-types',
      '/extension-fixture',
      '/demo',
      '/demo/terraform',
      '/releases',
      '/extension-fixture/fixture-section',
      '/extension-fixture/inherited-layer-section',
      '/demo/openapi',
      '/demo/bruno',
      '/demo/changelog',
      '/demo/changelog-flat'
    ]);
    expect(
      active.find((entry) => entry.generated?.type === 'openapi')?.version
    ).toBe('v3.x');
  } finally {
    vi.unstubAllGlobals();
  }
});
