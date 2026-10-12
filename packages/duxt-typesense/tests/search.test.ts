import { expect, it } from 'vitest';
import { searchTypesense } from '../search';

it('searches plaintext with a browser key and exact provenance filters while preserving localized URLs', async () => {
  let requested: URL | undefined;
  let authorization: string | null = null;
  const request: typeof fetch = async (input, init) => {
    requested = new URL(String(input));
    authorization = new Headers(init?.headers).get('X-TYPESENSE-API-KEY');
    return Response.json({
      hits: [
        {
          document: {
            id: 'stable',
            url: '/de/v1/guide#intro',
            title: 'Einführung',
            content: 'Klartext',
            source: '/',
            version: 'v1',
            locale: 'de'
          }
        }
      ]
    });
  };
  const hits = await searchTypesense(
    'Einführung',
    {
      endpoint: 'https://search.example/proxy/',
      collection: 'docs',
      searchKey: 'search-only'
    },
    [
      { source: '/', version: 'v1', locale: 'de' },
      { source: '/api', locale: 'de' }
    ],
    20,
    request
  );
  expect(authorization).toBe('search-only');
  expect(requested!.pathname).toBe('/proxy/collections/docs/documents/search');
  expect(requested!.searchParams.get('query_by')).toBe('title,content');
  expect(requested!.searchParams.get('filter_by')).toBe(
    '(source:=`/` && locale:=`de` && version:=`v1`) || (source:=`/api` && locale:=`de`)'
  );
  expect(hits[0]).toEqual({
    id: 'stable',
    url: '/de/v1/guide#intro',
    title: 'Einführung',
    content: 'Klartext',
    source: '/',
    version: 'v1',
    locale: 'de'
  });
});
