import { expect, it } from 'vitest';
import { resolveSources } from '@kirchdev/duxt/sources-resolve';
import { wikiCreateLink } from '../wiki-create';

it('prefills a source forge with a safe filename and quoted title, and omits unknown forges', () => {
  const source = resolveSources([
    { path: 'docs', origin: { repo: 'acme/wiki', ref: 'main', path: 'docs' } }
  ])[0]!;
  const link = wikiCreateLink(source, 'Guides/New page')!;
  const url = new URL(link.url);
  expect(url.pathname).toBe('/acme/wiki/new/main');
  expect(url.searchParams.get('filename')).toBe('docs/guides/new-page.md');
  expect(url.searchParams.get('value')).toContain('title: "Guides/New page"');
  expect(
    wikiCreateLink({ ...source, repositoryUrl: undefined }, 'A')
  ).toBeUndefined();
  expect(
    wikiCreateLink(
      { ...source, repositoryUrl: 'https://unknown.example/repo' },
      'A'
    )
  ).toBeUndefined();
  expect(wikiCreateLink(source, '../escape')).toBeUndefined();
});
