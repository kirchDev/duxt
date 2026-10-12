import { expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useMeilisearchSearch } from '../app/composables/useMeilisearchSearch';

const edition = { prefix: '/v1', version: 'v1', isDefault: false };
vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({
    public: {
      i18n: { defaultLocale: 'fr' },
      duxtMeilisearch: {
        host: 'https://search.example',
        index: 'docs',
        searchKey: 'browser-key'
      }
    }
  }),
  useDuxtConfig: () => ({
    title: 'Docs',
    resolvedSources: [
      {
        ...edition,
        collection: 'english',
        locale: undefined,
        isDefaultLocale: true
      },
      {
        ...edition,
        collection: 'german',
        locale: 'de',
        isDefaultLocale: false
      },
      {
        collection: 'current',
        prefix: '/v2',
        version: 'v2',
        locale: 'en',
        isDefault: true,
        isDefaultLocale: true
      }
    ]
  }),
  useDuxtCollection: () => ({
    source: ref({
      ...edition,
      collection: 'german',
      locale: 'de',
      isDefaultLocale: false
    })
  }),
  useI18n: () => ({ locale: ref('de'), fallbackLocale: ref('fr') }),
  queryCollection: (collection: string) => ({
    select: () => ({
      all: async () =>
        collection === 'german'
          ? [{ path: '/v1/shared' }]
          : [{ path: '/v1/shared' }, { path: '/v1/only-original' }]
    })
  })
}));

it('searches selected editions across the language fallback chain, prefers translated pages and keeps missing-page originals', async () => {
  let filter = '';
  vi.stubGlobal('fetch', async (_input: string, init: RequestInit) => {
    filter = JSON.parse(String(init.body)).filter;
    return Response.json({
      hits: [
        {
          id: 'original',
          url: '/v1/shared#intro',
          title: 'Original',
          content: 'Text',
          source: '/',
          version: 'v1',
          locale: 'fr'
        },
        {
          id: 'translated',
          url: '/de/v1/shared#intro',
          title: 'Übersetzung',
          content: 'Text',
          source: '/',
          version: 'v1',
          locale: 'de'
        },
        {
          id: 'fallback',
          url: '/v1/only-original#intro',
          title: 'Fallback',
          content: 'Text',
          source: '/',
          version: 'v1',
          locale: 'fr'
        }
      ]
    });
  });
  try {
    const search = useMeilisearchSearch();
    const result = await search.search('intro');
    expect(filter).toContain('version = "v1"');
    expect(filter).not.toContain('v2');
    expect(filter).toContain('locale = "de"');
    expect(filter).toContain('locale = "fr"');
    expect(result.hits.map((hit) => hit.id)).toEqual([
      '/de/v1/shared#intro',
      '/v1/only-original#intro'
    ]);
    expect(result.hits[0]).toMatchObject({ title: 'Übersetzung', level: 2 });
  } finally {
    vi.unstubAllGlobals();
  }
});
