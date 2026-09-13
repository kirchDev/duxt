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

it('labels hits with the source display name, its artefact and its version', async () => {
  const manifest = duxtManifest(
    [
      { path: 'docs', name: 'Handbook' },
      {
        path: 'www/demo/docs',
        slug: 'demo',
        name: { 'en-GB': 'Demo', de: 'Demonstration' },
        version: 'v3.x',
        generated: [
          { type: 'changelog', path: 'CHANGELOG.md', label: 'Releases' }
        ]
      }
    ],
    { showRepo: false, defaultRef: 'v3.x' }
  );
  const docs = manifest.find((entry) => entry.collection === 'docs')!;
  const found = vi.fn(async (collection: string) => [hit(`/${collection}#x`)]);

  vi.stubGlobal('computed', computed);
  vi.stubGlobal('useDuxtConfig', () => ({
    // Already resolved for the locale by `useDuxtConfig` in the real app.
    title: 'duxt',
    resolvedSources: manifest.map((entry) => ({
      ...entry,
      name: typeof entry.name === 'string' ? entry.name : entry.name?.['en-GB']
    }))
  }));
  vi.stubGlobal('useDuxtCollection', () => ({ source: ref(docs) }));
  vi.stubGlobal('useI18n', () => ({
    locale: ref('en-GB'),
    fallbackLocale: ref('en-GB')
  }));
  vi.stubGlobal('useSearchCollection', (collection: string) => ({
    status: ref('idle'),
    init: () => {},
    search: () => found(collection)
  }));
  vi.stubGlobal('useFuzzySearch', () => ({ search: async () => [] }));
  vi.stubGlobal('queryCollection', () => ({
    select: () => ({ all: async () => [] })
  }));

  const results = await useDuxtSearch().search('x');
  const sources = results.hits.map((entry) => entry.source);

  // The site's own documentation is NAMED, not labelled `/`.
  expect(sources[0]).toMatchObject({ name: 'Handbook' });
  expect(sources.some((entry) => entry?.name === '/')).toBe(false);
  // The demo carries its own name, and its changelog the artefact beside it.
  expect(sources.map((entry) => entry?.name)).toContain('Demo');
  expect(sources.map((entry) => entry?.artefact)).toContain('Releases');
});

/**
 * `search: false` has to survive BOTH passes.
 *
 * The exact pass and the fuzzy fallback are two different indexes over the same
 * pages — Content's FTS table and a Fuse instance — and neither carries
 * frontmatter, so the opt-out can only be applied to the hits by path. Dropping
 * it from one pass and not the other is a page that stays hidden until the
 * reader mistypes, which is the worst possible spelling of the bug.
 */
it('drops a page that opted out of search from both the exact and fuzzy passes', async () => {
  const manifest = duxtManifest([{ path: 'docs' }]);
  const docs = manifest.find((entry) => entry.collection === 'docs')!;

  const found = vi.fn(async () => [hit('/legal#terms'), hit('/guide#intro')]);
  const fuzzy = vi.fn(async () => [hit('/legal#terms'), hit('/guide#intro')]);

  vi.stubGlobal('computed', computed);
  vi.stubGlobal('useDuxtConfig', () => ({ resolvedSources: manifest }));
  vi.stubGlobal('useDuxtCollection', () => ({ source: ref(docs) }));
  vi.stubGlobal('useI18n', () => ({
    locale: ref('en'),
    fallbackLocale: ref('en')
  }));
  vi.stubGlobal('useSearchCollection', () => ({
    status: ref('idle'),
    init: () => {},
    search: () => found()
  }));
  vi.stubGlobal('useFuzzySearch', () => ({ search: () => fuzzy() }));

  const selected: string[][] = [];
  vi.stubGlobal('queryCollection', () => ({
    select: (...fields: string[]) => {
      selected.push(fields);
      return {
        all: async () => [{ path: '/guide' }, { path: '/legal', search: false }]
      };
    }
  }));

  const search = useDuxtSearch();

  // The opt-out is only readable if the field was asked for — Content returns
  // exactly the columns named, so a missed `select` is a silently ignored flag.
  const exact = await search.search('terms');
  expect(selected.every((fields) => fields.includes('search'))).toBe(true);
  expect(exact.hits.map((entry) => entry.id)).toEqual(['/guide#intro']);

  // Nothing matched exactly, so the fuzzy pass runs — and hides the same page.
  found.mockResolvedValueOnce([]);
  const approximate = await search.search('trms');
  expect(approximate.approximate).toBe(true);
  expect(approximate.hits.map((entry) => entry.id)).toEqual(['/guide#intro']);
});
