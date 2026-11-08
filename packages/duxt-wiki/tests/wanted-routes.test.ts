import { expect, it } from 'vitest';
import {
  collectionWantedPrefixes,
  wantedTitleQueryPattern
} from '../wanted-routes';

it('provides exact wanted utilities for generated collections too', () => {
  const sources = [
    { prefix: '/wiki' },
    { prefix: '/demo/api', generated: { type: 'openapi' } },
    { prefix: '/demo/v1/api', generated: { type: 'openapi' } },
    { prefix: '/demo/api', generated: { type: 'openapi' } }
  ];
  const prefixes = collectionWantedPrefixes(sources);
  expect(prefixes).toEqual(['/wiki', '/demo/api', '/demo/v1/api']);
  const pattern = wantedTitleQueryPattern(prefixes, ['de-DE'])!;
  expect(pattern.test('/demo/api/wanted?title=Missing')).toBe(true);
  expect(pattern.test('/de-DE/demo/v1/api/wanted?title=Missing')).toBe(true);
  expect(pattern.test('/demo/api/wanted/new?title=Missing')).toBe(false);
  expect(pattern.test('/demo/api-extra/wanted?title=Missing')).toBe(false);
});

it('exempts only exact configured utility routes and title queries, never external or ordinary links', () => {
  const pattern = wantedTitleQueryPattern(['/wiki', '/wiki/v1'], ['de-DE'])!;
  for (const href of [
    '/wiki/wanted?title=Missing%20page',
    '/wiki/v1/wanted?title=Alias',
    '/de-DE/wiki/wanted?title=Title'
  ])
    expect(pattern.test(href)).toBe(true);
  for (const href of [
    'https://evil.example/wiki/wanted?title=A',
    '//evil.example/wiki/wanted?title=A',
    '/other/wanted?title=A',
    '/fr/wiki/wanted?title=A',
    '/wiki/v2/wanted?title=A',
    '/wiki/wanted',
    '/wiki/missing',
    '/wiki/wanted?other=A',
    '/wiki/wanted?title=A&other=B',
    '/wiki/wanted-extra?title=A'
  ])
    expect(pattern.test(href)).toBe(false);
  expect(wantedTitleQueryPattern([], ['de-DE'])).toBeUndefined();
  expect(pattern.test('/wiki/wanted?title=A#missing')).toBe(false);
  expect(
    wantedTitleQueryPattern(['/wiki'], ['en', 'de'], {
      strategy: 'no_prefix'
    })!.test('/de/wiki/wanted?title=A')
  ).toBe(false);
  expect(
    wantedTitleQueryPattern(['/wiki'], ['en', 'de'], {
      defaultLocale: 'en'
    })!.test('/en/wiki/wanted?title=A')
  ).toBe(false);
  expect(
    wantedTitleQueryPattern(['/wiki'], ['en'], { strategy: 'prefix' })!.test(
      '/wiki/wanted?title=A'
    )
  ).toBe(false);
  expect(
    wantedTitleQueryPattern(['/wiki'], ['en'], {
      strategy: 'prefix_and_default'
    })!.test('/en/wiki/wanted?title=A')
  ).toBe(true);
});
