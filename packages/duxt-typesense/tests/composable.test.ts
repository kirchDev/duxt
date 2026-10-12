import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useTypesenseSearch } from '../app/composables/useTypesenseSearch';
import { duxtManifest } from '../../duxt/build/sections/sections-resolve';

const state = vi.hoisted(() => ({
  sources: [] as ReturnType<typeof duxtManifest>,
  current: undefined as ReturnType<typeof duxtManifest>[number] | undefined,
  locale: 'en',
  fallback: 'en',
  defaultLocale: 'en',
  paths: {} as Record<string, string[]>
}));
afterEach(() => vi.unstubAllGlobals());
beforeEach(() =>
  Object.assign(state, {
    sources: [],
    current: undefined,
    locale: 'en',
    fallback: 'en',
    defaultLocale: 'en',
    paths: {}
  })
);

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({
    public: {
      i18n: { defaultLocale: state.defaultLocale },
      duxtTypesense: {
        endpoint: 'https://search.example',
        collection: 'docs',
        searchKey: 'browser-key'
      }
    }
  }),
  useDuxtConfig: () => ({
    title: 'Docs',
    resolvedSources: state.sources.length
      ? state.sources
      : [
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
    source: ref(
      state.current ?? {
        collection: 'old',
        prefix: '/v1',
        version: 'v1',
        locale: 'en',
        isDefault: false,
        isDefaultLocale: true
      }
    )
  }),
  useI18n: () => ({
    locale: ref(state.locale),
    fallbackLocale: ref(state.fallback),
    locales: ref(['en', 'de', 'fr'])
  }),
  queryCollection: (collection: string) => ({
    select: () => ({
      all: async () => (state.paths[collection] ?? []).map((path) => ({ path }))
    })
  })
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

it('finds an untranslated page in the reader’s fallback language without searching other editions', async () => {
  state.sources = duxtManifest(
    ['v2', 'v1'].map((version) => ({
      path: 'docs',
      locales: ['en', 'de'],
      version
    })),
    { defaultRef: 'v2' }
  );
  state.current = state.sources.find(
    (entry) => entry.version === 'v1' && entry.locale === 'de'
  );
  state.locale = 'de';
  state.fallback = 'en';
  let filter = '';
  vi.stubGlobal('fetch', async (input: string) => {
    filter = new URL(input).searchParams.get('filter_by')!;
    return Response.json({
      hits: filter.includes('locale:=`en`')
        ? [
            {
              document: {
                id: 'fallback',
                url: '/v1/only-english#intro',
                title: 'English only',
                content: 'Text',
                source: '/',
                version: 'v1',
                locale: 'en'
              }
            }
          ]
        : []
    });
  });
  expect(
    (await useTypesenseSearch().search('intro')).hits.map((hit) => hit.id)
  ).toEqual(['/v1/only-english#intro']);
  expect(filter).toContain('locale:=`de`');
  expect(filter).not.toContain('v2');
});

it('prefers translated pages and suppresses original-only matches for a translated page', async () => {
  state.sources = duxtManifest([{ path: 'docs', locales: ['en', 'de'] }]);
  state.current = state.sources.find((entry) => entry.locale === 'de');
  state.locale = 'de';
  state.paths[state.current!.collection] = ['/shared'];
  const original = {
    id: 'original',
    url: '/shared#english-only-section',
    title: 'Original',
    content: 'Text',
    source: '/',
    locale: 'en'
  };
  const translated = {
    id: 'translated',
    url: '/de/shared#intro',
    title: 'Deutsch',
    content: 'Text',
    source: '/',
    locale: 'de'
  };
  vi.stubGlobal('fetch', async (input: string) =>
    Response.json({
      hits: (new URL(input).searchParams.get('q') === 'only-original'
        ? [original]
        : [original, translated]
      ).map((document) => ({ document }))
    })
  );
  const search = useTypesenseSearch();
  expect((await search.search('shared')).hits.map((hit) => hit.id)).toEqual([
    '/de/shared#intro'
  ]);
  expect((await search.search('only-original')).hits).toEqual([]);
});

it('uses the configured default content locale for sources without an explicit locale', async () => {
  state.sources = duxtManifest([{ path: 'docs' }]);
  state.current = state.sources[0];
  state.locale = 'fr';
  state.fallback = 'fr';
  state.defaultLocale = 'fr';
  let filter = '';
  vi.stubGlobal('fetch', async (input: string) => {
    filter = new URL(input).searchParams.get('filter_by')!;
    return Response.json({
      hits: filter.includes('locale:=`fr`')
        ? [
            {
              document: {
                id: 'fr',
                url: '/guide#intro',
                title: 'Français',
                content: 'Texte',
                source: '/',
                locale: 'fr'
              }
            }
          ]
        : []
    });
  });
  expect(
    (await useTypesenseSearch().search('guide')).hits.map((hit) => hit.id)
  ).toEqual(['/guide#intro']);
  expect(filter).not.toContain('locale:=`en`');
});

it('finds visible fallback pages after more than one Typesense result page of suppressed originals', async () => {
  state.sources = duxtManifest([{ path: 'docs', locales: ['en', 'de'] }]);
  state.current = state.sources.find((entry) => entry.locale === 'de');
  state.locale = 'de';
  state.paths[state.current!.collection] = ['/shared'];
  const documents = [
    ...Array.from({ length: 260 }, (_, index) => ({
      id: `original${index}`,
      url: `/shared#section-${index}`,
      title: 'Original',
      content: 'Text',
      source: '/',
      locale: 'en'
    })),
    {
      id: 'fallback',
      url: '/missing#intro',
      title: 'Missing translation',
      content: 'Text',
      source: '/',
      locale: 'en'
    }
  ];
  vi.stubGlobal('fetch', async (input: string) => {
    const params = new URL(input).searchParams;
    const size = Number(params.get('per_page'));
    const page = Number(params.get('page') ?? 1);
    return Response.json({
      hits: documents
        .slice((page - 1) * size, page * size)
        .map((document) => ({ document }))
    });
  });
  expect(
    (await useTypesenseSearch().search('text', 20)).hits.map((hit) => hit.id)
  ).toEqual(['/missing#intro']);
});

it('keeps other sources and generated artefacts at their default editions with provenance', async () => {
  state.sources = duxtManifest([
    { path: 'docs', name: 'Handbook' },
    {
      path: 'demo/docs',
      slug: 'demo',
      name: 'Demo',
      generated: [
        {
          type: 'openapi',
          path: 'api.yaml',
          label: 'API',
          versions: [{ version: 'v3' }, { version: 'v2' }]
        },
        { type: 'changelog', path: 'CHANGELOG.md', label: 'Releases' }
      ]
    }
  ]);
  state.current = state.sources.find((entry) => entry.prefix === '');
  let filter = '';
  vi.stubGlobal('fetch', async (input: string) => {
    filter = new URL(input).searchParams.get('filter_by')!;
    return Response.json({
      hits: [
        {
          document: {
            id: 'api',
            url: '/demo/api/endpoint#body',
            title: 'Endpoint',
            content: 'JSON body',
            source: '/demo/api',
            version: 'v3',
            locale: 'en'
          }
        },
        {
          document: {
            id: 'releases',
            url: '/demo/releases/release',
            title: 'Release',
            content: 'Changes',
            source: '/demo/releases',
            locale: 'en'
          }
        }
      ]
    });
  });
  const result = await useTypesenseSearch().search('body');
  expect(filter).toContain('source:=`/demo`');
  expect(filter).toContain('version:=`v3`');
  expect(filter).not.toContain('v2');
  expect(result.hits[0]).toMatchObject({
    id: '/demo/api/endpoint#body',
    source: { name: 'Demo', artefact: 'API', version: 'v3' }
  });
  expect(result.hits[1]).toMatchObject({
    source: { name: 'Demo', artefact: 'Releases' }
  });
});
