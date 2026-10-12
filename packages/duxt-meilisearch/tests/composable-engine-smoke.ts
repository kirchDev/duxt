/** Actual composable and HTTP ranking in an explicitly disposable engine. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncMeilisearch } from '../sync.ts';
import { searchMeilisearch } from '../search.ts';

const host = process.env.MEILISEARCH_HOST;
const syncKey = process.env.MEILISEARCH_SYNC_KEY;
const searchKey = process.env.MEILISEARCH_SEARCH_KEY;
if (
  !host ||
  !syncKey ||
  !searchKey ||
  process.env.DUXT_MEILI_FIXTURE !== 'true'
)
  throw new Error('Explicit disposable fixture configuration is required');
const options = { host, index: 'docs', searchKey };
const needle = 'Precedenceuniquesentinel';
const base = { source: '/', version: 'v1', locale: 'fr' };
const suppressed = ['fr', 'es'].flatMap((language) =>
  Array.from({ length: 1000 }, (_, index) => ({
    ...base,
    locale: language,
    id: `suppressed_${language}_${index}`,
    url: `${language === 'es' ? '/es-ES' : ''}/v1/shared#section-${index}`,
    title: needle,
    content: 'Original text whose preferred translation does not match'
  }))
);
const visible = [
  {
    ...base,
    id: 'visible_fr',
    url: '/v1/only-original#answer',
    title: 'French fallback',
    content: needle
  },
  {
    ...base,
    id: 'visible_es',
    locale: 'es',
    url: '/es-ES/v1/spanish-only#answer',
    title: 'Spanish fallback',
    content: needle
  }
];
await syncMeilisearch(
  Object.freeze(
    [
      ...suppressed,
      ...visible,
      {
        ...base,
        id: 'preferred_de',
        locale: 'de',
        url: '/de-DE/v1/shared#preferred',
        title: 'Translateduniquesentinel',
        content: 'The preferred language can match independently'
      },
      {
        ...base,
        id: 'covered_by_es',
        url: '/v1/spanish-only#answer',
        title: 'Spanishcovereduniquesentinel',
        content: 'Only original text matches'
      },
      {
        ...base,
        id: 'another_source',
        source: '/api',
        url: '/api/only-original#answer',
        title: 'Apiuniquesentinel',
        content: 'Another source with no translation'
      },
      {
        ...base,
        id: 'wrong_edition',
        version: 'v2',
        url: '/v2/only-original#answer',
        title: needle,
        content: 'Unselected edition'
      }
    ].map(Object.freeze)
  ),
  {
    host,
    index: 'docs',
    syncKey,
    taskKey: process.env.MEILISEARCH_TASK_KEY,
    enabled: true,
    deployment: 'production',
    taskTimeoutMs: 30_000
  }
);
const first = await searchMeilisearch(
  needle,
  options,
  [{ source: '/', version: 'v1', locale: 'fr' }],
  1000
);
assert.equal(first.length, 1000);
assert(first.every((record) => record.id.startsWith('suppressed_')));
const beyondWindow = await fetch(`${host}/indexes/docs/search`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${searchKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    q: needle,
    filter: 'source = "/" AND locale = "fr" AND version = "v1"',
    offset: 1000,
    limit: 1
  }),
  signal: AbortSignal.timeout(30_000)
});
assert.equal(beyondWindow.status, 200);
assert.deepEqual((await beyondWindow.json()).hits, []);
assert.deepEqual(
  await searchMeilisearch('French fallback', options, [
    { source: '/', version: 'v1', locale: 'fr' }
  ]),
  [visible[0]]
);

const directory = mkdtempSync(join(tmpdir(), 'meilisearch-composable-'));
try {
  const imports = join(directory, 'nuxt-runtime.ts');
  // Only the Nuxt runtime/inventory boundary is supplied. The provider's real
  // composable, source resolver, HTTP client and the engine execute unchanged.
  writeFileSync(
    imports,
    `
export const useRuntimeConfig=()=>globalThis.meiliFixture.runtime;
export const useDuxtConfig=()=>globalThis.meiliFixture.duxt;
export const useDuxtCollection=()=>({source:{value:globalThis.meiliFixture.sources[0]}});
export const useI18n=()=>({locale:{value:'de-DE'},fallbackLocale:{value:['es','fr']},locales:{value:['de-DE','es-ES','fr-FR']}});
export const queryCollection=(collection)=>({select:()=>({all:async()=>collection==='german'?[{path:'/v1/shared'}]:collection==='spanish'?[{path:'/v1/shared'},{path:'/v1/spanish-only'}]:[]})});
`
  );
  const edition = { prefix: '/v1', version: 'v1', isDefault: true };
  const sources = [
    { ...edition, collection: 'german', locale: 'de', isDefaultLocale: false },
    { ...edition, collection: 'spanish', locale: 'es', isDefaultLocale: false },
    {
      ...edition,
      collection: 'original',
      locale: undefined,
      isDefaultLocale: true
    },
    {
      prefix: '/v2',
      version: 'v2',
      collection: 'obsolete',
      locale: undefined,
      isDefaultLocale: true,
      isDefault: false
    },
    {
      prefix: '/api',
      version: 'v1',
      repo: 'api',
      collection: 'api',
      locale: undefined,
      isDefaultLocale: true,
      isDefault: true
    }
  ];
  Object.assign(globalThis, {
    meiliFixture: {
      sources,
      duxt: { title: 'Docs', resolvedSources: sources },
      runtime: {
        public: { i18n: { defaultLocale: 'fr' }, duxtMeilisearch: options }
      }
    }
  });
  const { createJiti } = createRequire(import.meta.url)('jiti');
  const jiti = createJiti(import.meta.url, {
    alias: {
      '#imports': imports,
      '@duxt': fileURLToPath(new URL('../../duxt/app', import.meta.url))
    },
    fsCache: false
  });
  const { useMeilisearchSearch } = await jiti.import(
    fileURLToPath(
      new URL('../app/composables/useMeilisearchSearch.ts', import.meta.url)
    )
  );
  const search = useMeilisearchSearch();
  const result = await search.search(needle, 2);
  assert.deepEqual(
    result.hits.map((hit: { id: string }) => hit.id).sort(),
    visible.map((record) => record.url).sort()
  );
  assert.equal((await search.search(needle, 1)).hits.length, 1);
  assert.deepEqual(
    (await search.search('Translateduniquesentinel')).hits.map(
      (hit: { id: string }) => hit.id
    ),
    ['/de-DE/v1/shared#preferred']
  );
  assert.deepEqual(
    (await search.search('Spanishcovereduniquesentinel')).hits,
    []
  );
  assert.deepEqual(
    (await search.search('Apiuniquesentinel')).hits.map(
      (hit: { id: string }) => hit.id
    ),
    ['/api/only-original#answer']
  );
  console.log(
    JSON.stringify({
      realComposable: true,
      realEngine: true,
      rankedHiddenCandidates: suppressed.length,
      defaultPaginationWindow: 1000,
      visibleFallbacks: result.hits.map((hit: { id: string }) => hit.id),
      arbitraryDefaultLocale: 'fr',
      regionalLocaleMapping: true,
      threeLanguagePagePreference: true,
      originalOnlyQuerySuppression: true,
      sourceEditionFilters: true,
      visibleLimit: true
    })
  );
} finally {
  Reflect.deleteProperty(globalThis, 'meiliFixture');
  rmSync(directory, { recursive: true, force: true });
}
