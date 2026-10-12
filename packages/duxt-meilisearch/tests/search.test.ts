import { expect, it } from 'vitest';
import { searchMeilisearch } from '../search';

it('uses only the browser key and exact escaped provenance filters, preserving normalized records', async () => {
  const record = {
    id: 'hash',
    url: '/de/v1/page#title',
    title: 'Einführung',
    content: 'Klartext',
    source: '/',
    version: 'v1',
    locale: 'de'
  };
  let requestBody: unknown;
  const fetcher: typeof fetch = async (input, init) => {
    expect(String(input)).toBe(
      'https://search.example/proxy/indexes/docs/search'
    );
    expect(new Headers(init?.headers).get('Authorization')).toBe(
      'Bearer public-only'
    );
    expect(init?.credentials).toBe('omit');
    requestBody = JSON.parse(String(init?.body));
    return Response.json({ hits: [record] });
  };
  const hits = await searchMeilisearch(
    'Einführung',
    {
      host: 'https://search.example/proxy/',
      index: 'docs',
      searchKey: 'public-only'
    },
    [
      { source: '/', version: 'v1', locale: 'de' },
      { source: '/api" OR source = "bad', locale: 'en' }
    ],
    20,
    fetcher
  );
  expect(requestBody).toEqual({
    q: 'Einführung',
    limit: 20,
    filter:
      '(source = "/" AND locale = "de" AND version = "v1") OR (source = "/api\\" OR source = \\"bad" AND locale = "en" AND version NOT EXISTS)'
  });
  expect(hits).toEqual([record]);
});
