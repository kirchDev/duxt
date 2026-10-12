import { expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useTypesenseSearch } from '../app/composables/useTypesenseSearch';

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({
    public: {
      duxtTypesense: {
        endpoint: 'https://search.example',
        collection: 'docs',
        searchKey: 'browser-key'
      }
    }
  }),
  useDuxtConfig: () => ({
    title: 'Docs',
    resolvedSources: [
      {
        collection: 'old',
        prefix: '/v1',
        version: 'v1',
        locale: 'en',
        isDefault: false,
        isDefaultLocale: true
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
      collection: 'old',
      prefix: '/v1',
      version: 'v1',
      locale: 'en',
      isDefault: false,
      isDefaultLocale: true
    })
  }),
  useI18n: () => ({ locale: ref('en'), fallbackLocale: ref('en') })
}));

it('uses the reader’s selected edition and turns record URLs into navigable dialog hits', async () => {
  let requested: URL | undefined;
  vi.stubGlobal('fetch', async (input: string) => {
    requested = new URL(input);
    return Response.json({
      hits: [
        {
          document: {
            id: 'stable_hash',
            url: '/v1/guide#intro',
            title: 'Intro',
            content: 'Text',
            source: '/',
            version: 'v1',
            locale: 'en'
          }
        }
      ]
    });
  });
  try {
    const search = useTypesenseSearch();
    const result = await search.search('intro');
    expect(requested!.searchParams.get('filter_by')).toContain('version:=`v1`');
    expect(requested!.searchParams.get('filter_by')).not.toContain('v2');
    expect(result.hits[0]).toMatchObject({
      id: '/v1/guide#intro',
      title: 'Intro',
      content: 'Text',
      level: 2
    });
  } finally {
    vi.unstubAllGlobals();
  }
});
