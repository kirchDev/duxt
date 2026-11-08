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

it('does not propose a Markdown file under a generated artifact even with a writable GitHub branch', () => {
  const source = resolveSources([
    { path: 'docs', origin: { repo: 'acme/wiki', ref: 'main', path: 'docs' } }
  ])[0]!;
  expect(wikiCreateLink(source, 'New page')?.url).toContain(
    '/acme/wiki/new/main?'
  );
  expect(
    wikiCreateLink(
      {
        ...source,
        path: 'api/openapi.yaml',
        originPath: undefined,
        generated: {
          type: 'openapi',
          label: 'API',
          slug: 'api',
          declaration: 0,
          navigation: 'sections',
          versioning: 'per-version',
          localisation: 'per-locale',
          remote: false
        }
      },
      'Missing operation'
    )
  ).toBeUndefined();
});
