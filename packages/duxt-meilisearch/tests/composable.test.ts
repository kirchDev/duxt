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
        ...edition,
        collection: 'spanish',
        locale: 'es',
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
  useI18n: () => ({
    locale: ref('de'),
    fallbackLocale: ref(['es', 'fr']),
    locales: ref(['de-DE', 'es-ES', 'fr-FR'])
  }),
  queryCollection: (collection: string) => ({
    select: () => ({
      all: async () =>
        collection === 'german'
          ? [{ path: '/v1/shared' }]
          : collection === 'spanish'
            ? [{ path: '/v1/shared' }, { path: '/v1/spanish-only' }]
            : [
                { path: '/v1/shared' },
                { path: '/v1/spanish-only' },
                { path: '/v1/only-original' }
              ]
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

it('excludes covered pages separately for every fallback language in the selected edition', async () => {
  let filter = '';
  vi.stubGlobal('fetch', async (_input: string, init: RequestInit) => {
    filter = JSON.parse(String(init.body)).filter;
    return Response.json({ hits: [] });
  });
  try {
    await useMeilisearchSearch().search('only-original-text');
    expect(filter).toBe(
      '(source = "/" AND locale = "de" AND version = "v1") OR ' +
        '(source = "/" AND locale = "es" AND version = "v1" AND page NOT IN ["/v1/shared","/de-DE/v1/shared","/es-ES/v1/shared","/fr-FR/v1/shared"]) OR ' +
        '(source = "/" AND locale = "fr" AND version = "v1" AND page NOT IN ["/v1/shared","/de-DE/v1/shared","/es-ES/v1/shared","/fr-FR/v1/shared","/v1/spanish-only","/de-DE/v1/spanish-only","/es-ES/v1/spanish-only","/fr-FR/v1/spanish-only"])'
    );
  } finally {
    vi.unstubAllGlobals();
  }
});

it('returns no results with a warning on service failure, and skips empty queries', async () => {
  const fetcher = vi.fn(async () => new Response(null, { status: 503 }));
  vi.stubGlobal('fetch', fetcher);
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const search = useMeilisearchSearch();
    expect(await search.search('  ')).toEqual({ hits: [], approximate: false });
    expect(fetcher).not.toHaveBeenCalled();
    expect(await search.search('needle')).toEqual({
      hits: [],
      approximate: false
    });
    expect(warning).toHaveBeenCalledWith(
      '[duxt-meilisearch] Search unavailable'
    );
  } finally {
    warning.mockRestore();
    vi.unstubAllGlobals();
  }
});

it.each([
  { language: 'fr', prefix: '' },
  { language: 'es', prefix: '/es-ES' }
])(
  'returns fallback matches beyond 1000 covered originals in $language',
  async ({ language, prefix }) => {
    const ranked = [
      ...Array.from({ length: 1000 }, (_, index) => ({
        id: `hidden_${index}`,
        url: `${prefix}/v1/shared#section-${index}`,
        title: 'needle',
        content: 'Original text with no matching translation',
        source: '/',
        version: 'v1',
        locale: language
      })),
      {
        id: 'visible',
        url: `${prefix}/v1/only-original#answer`,
        title: 'Fallback',
        content: 'needle',
        source: '/',
        version: 'v1',
        locale: language
      }
    ];
    vi.stubGlobal('fetch', async (_input: string, init: RequestInit) => {
      const { filter, limit } = JSON.parse(String(init.body));
      // Meilisearch applies filters before ranking/pagination, whose default
      // maxTotalHits stops at 1000. The preferred page itself need not match.
      const excluded = [
        ...filter.matchAll(/page NOT IN (\[[^\]]*\])/g)
      ].flatMap((match: RegExpMatchArray) => JSON.parse(match[1]!));
      return Response.json({
        hits: ranked
          .filter((record) => !excluded.includes(record.url.split('#')[0]))
          .slice(0, Math.min(limit, 1000))
      });
    });
    try {
      const result = await useMeilisearchSearch().search('needle', 1);
      expect(result.hits.map((hit) => hit.id)).toEqual([
        `${prefix}/v1/only-original#answer`
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  }
);
