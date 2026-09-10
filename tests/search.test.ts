import { afterEach, expect, it, vi } from 'vitest';
const ref = <T>(value: T) => ({ value });
const computed = <T>(read: () => T) => ({
  get value() {
    return read();
  }
});
import { duxtManifest } from '../sections-resolve';
import { useDuxtSearch } from '../app/composables/useDuxtSearch';

const hit = (id: string, title = id) => ({
  id,
  title,
  titles: [],
  level: 1,
  content: title
});

afterEach(() => vi.unstubAllGlobals());

it('lazily searches selected artefacts in both passes with page-level translation precedence', async () => {
  const manifest = duxtManifest([
    {
      path: 'docs',
      locales: ['en', 'de'],
      generated: [
        {
          type: 'openapi',
          path: 'api.yaml',
          label: 'API',
          versions: [{ version: 'v2' }, { version: 'v1' }]
        },
        { type: 'changelog', path: 'CHANGELOG.md', label: 'Releases' }
      ]
    }
  ]);
  const docs = manifest.find(
    (entry) => !entry.generated && entry.isDefault && entry.locale === 'en'
  )!;
  const translated = manifest.find(
    (entry) => !entry.generated && entry.isDefault && entry.locale === 'de'
  )!;
  const api = manifest.find(
    (entry) => entry.generated?.type === 'openapi' && entry.isDefault
  )!;
  const releases = manifest.find(
    (entry) => entry.generated?.type === 'changelog'
  )!;
  const current = ref(translated);
  const exact = vi.fn(async (collection: string, term: string) => {
    if (term === 'typo') return [];
    if (term === 'fallback' && collection === translated.collection) return [];
    if (collection === translated.collection)
      return [hit('/start#intro', 'Deutsch')];
    if (collection === docs.collection)
      return [
        hit('/start#intro', 'English'),
        hit('/start#english-only'),
        hit('/fallback#intro')
      ];
    return [
      hit(collection === api.collection ? '/api/unique' : '/releases/unique')
    ];
  });
  const fuzzy = vi.fn(async (collection: string) =>
    exact(collection, 'normal')
  );
  const initialize = vi.fn();
  const pages = vi.fn(async (collection: string) =>
    collection === translated.collection ? [{ path: '/start' }] : []
  );
  vi.stubGlobal('computed', computed);
  vi.stubGlobal('useDuxtConfig', () => ({ resolvedSources: manifest }));
  vi.stubGlobal('useDuxtCollection', () => ({ source: current }));
  vi.stubGlobal('useI18n', () => ({
    locale: ref('de'),
    fallbackLocale: ref('en')
  }));
  vi.stubGlobal('useSearchCollection', (collection: string) => ({
    status: ref('idle'),
    init: () => initialize(collection),
    search: async (term: string, options: { limit: number }) =>
      (await exact(collection, term)).slice(0, options.limit)
  }));
  vi.stubGlobal('useFuzzySearch', (collection: string) => ({
    search: () => fuzzy(collection)
  }));
  vi.stubGlobal('queryCollection', (collection: string) => ({
    select: () => ({ all: () => pages(collection) })
  }));
  const search = useDuxtSearch();
  expect(initialize).not.toHaveBeenCalled();
  expect(pages).not.toHaveBeenCalled();
  expect(fuzzy).not.toHaveBeenCalled();
  await search.init();
  expect(initialize.mock.calls.map(([name]) => name)).toEqual([
    translated.collection,
    docs.collection,
    api.collection,
    releases.collection
  ]);
  const results = await search.search('normal');
  expect(results.hits.map((entry) => entry.id)).toEqual([
    '/start#intro',
    '/fallback#intro',
    '/api/unique',
    '/releases/unique'
  ]);
  expect(results.hits[0]?.title).toBe('Deutsch');
  expect(fuzzy).not.toHaveBeenCalled();
  const approximate = await search.search('typo');
  expect(approximate.approximate).toBe(true);
  expect(approximate.hits).toEqual(results.hits);
  expect(fuzzy.mock.calls.map(([name]) => name)).toEqual([
    translated.collection,
    docs.collection,
    api.collection,
    releases.collection
  ]);
  const limited = await search.search('fallback', 1);
  expect(limited.hits[0]?.id).toBe('/fallback#intro');
  current.value = manifest.find(
    (entry) => entry.generated?.type === 'openapi' && !entry.isDefault
  )!;
  exact.mockClear();
  await search.search('normal');
  expect(exact.mock.calls[0]?.[0]).toBe(current.value.collection);
  expect(exact.mock.calls.map(([name]) => name)).toContain(
    translated.collection
  );
  expect(exact.mock.calls.map(([name]) => name)).not.toContain(api.collection);
});
