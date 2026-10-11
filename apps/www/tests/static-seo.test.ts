import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { checkStaticSeo } from '../scripts/static-seo';

const roots: string[] = [];
function site(head: string) {
  const root = mkdtempSync(join(tmpdir(), 'duxt-static-seo-'));
  roots.push(root);
  writeFileSync(join(root, 'index.html'), `<head>${head}</head>`);
  return root;
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true }))
);
it.each(['canonical', 'og:url', 'hreflang'])(
  'rejects a dev origin in deployed %s',
  (kind) => {
    const canonical = '<link href="https://duxt.app" rel="canonical">';
    const bad =
      kind === 'canonical'
        ? '<link rel="canonical" href="http://localhost:3000">'
        : kind === 'og:url'
          ? '<meta content="http://localhost:3000" property="og:url">'
          : '<link hreflang="de-DE" href="http://localhost:3000/de-DE" rel="alternate">';
    expect(
      checkStaticSeo(
        site(kind === 'canonical' ? bad : canonical + bad),
        'https://duxt.app'
      ).failures
    ).toContainEqual(expect.stringContaining('localhost:3000'));
  }
);
it('checks sitemap origins and requires the referenced locale files', () => {
  const root = site('<link rel="canonical" href="https://duxt.app">');
  mkdirSync(join(root, '__sitemap__'));
  writeFileSync(
    join(root, 'sitemap_index.xml'),
    '<sitemapindex><sitemap><loc>https://duxt.app/__sitemap__/en.xml</loc></sitemap></sitemapindex>'
  );
  expect(
    checkStaticSeo(root, 'https://duxt.app', true).failures
  ).toContainEqual(expect.stringContaining('missing'));
  writeFileSync(
    join(root, '__sitemap__/en.xml'),
    '<urlset><url><loc>http://localhost:3000/guide</loc></url></urlset>'
  );
  expect(
    checkStaticSeo(root, 'https://duxt.app', true).failures
  ).toContainEqual(expect.stringContaining('localhost:3000/guide'));
  writeFileSync(
    join(root, '__sitemap__/en.xml'),
    '<urlset><url><loc>https://duxt.app/guide</loc></url></urlset>'
  );
  expect(checkStaticSeo(root, 'https://duxt.app', true).failures).toEqual([]);
});
