import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

export const WIKI_ROUTES = [
  '/wiki',
  '/wiki/category/modes',
  '/wiki/category/unpaged',
  '/wiki/disambiguation'
];

/** Assert the real wiki shell, not a same-size error page or unknown element. */
export async function checkWikiFixtures(origin: string) {
  for (const path of WIKI_ROUTES) {
    const response = await fetch(`${origin}${path}`, {
      headers: { accept: 'text/html' }
    });
    assert.equal(response.status, 200, `Wiki fixture ${path} must render`);
    const doc = new JSDOM(await response.text()).window.document;
    assert.ok(doc.querySelector('[data-wiki-layout]'), `${path}: wiki layout`);
    assert.ok(
      doc.querySelector('[data-wiki-article]'),
      `${path}: real article template`
    );
    assert.equal(
      doc.querySelectorAll('main h1').length,
      1,
      `${path}: one title`
    );
    assert.equal(
      doc.querySelectorAll('[data-wiki-sidebar]').length,
      0,
      `${path}: sidebar off by default`
    );
    assert.equal(
      doc.querySelectorAll('main > div > div.hidden').length,
      0,
      `${path}: no right column`
    );
    assert.ok(
      doc.querySelector('[data-wiki-page-info]'),
      `${path}: page info below article`
    );
    if (path.includes('/category/'))
      assert.ok(
        doc.querySelector('[data-wiki-category] a[href="/wiki"]'),
        `${path}: dynamic member`
      );
    if (path === '/wiki/category/modes') {
      const intro = [...doc.querySelectorAll('p')].find((node) =>
        node.textContent?.includes('Category fixture.')
      );
      const members = doc.querySelector('[data-wiki-category]')!;
      assert.ok(
        intro && intro.compareDocumentPosition(members) & 4,
        'authored category Markdown precedes its member list'
      );
    }
    if (path.endsWith('disambiguation'))
      assert.ok(
        doc.querySelector('[data-wiki-disambiguation]'),
        `${path}: disambiguation template`
      );
    if (path === '/wiki') {
      const content = doc.querySelector('main article')!;
      const lead = [...content.querySelectorAll('p')].find((node) =>
        node.textContent?.includes('and [[FAST#Part]]')
      );
      const toc = content.querySelector('[data-wiki-toc]')!;
      const heading = content.querySelector('h2#history')!;
      assert.ok(
        lead && toc && heading,
        'real lead, inline outline and authored heading render'
      );
      assert.ok(lead.compareDocumentPosition(toc) & 4, 'lead before contents');
      assert.ok(
        toc.compareDocumentPosition(heading) & 4,
        'contents before first heading'
      );
      assert.match(toc.textContent ?? '', /1\.History/);
      assert.ok(toc.querySelector('a[href="#details"]'), 'nested outline');
      assert.ok(
        toc.querySelector('a[href="#deep-detail"]'),
        'page toc.maxDepth reaches level four'
      );
      assert.equal(
        content.querySelectorAll('[data-wiki-navbox]').length,
        2,
        'explicit and partial navboxes'
      );
      assert.ok(
        content.querySelector('[data-wiki-navbox] a[href="/wiki/target"]'),
        'subcategory members populate navbox'
      );
      const info = content.querySelector('[data-wiki-page-info]')!;
      assert.ok(
        heading.compareDocumentPosition(info) & 4,
        'page info after article body'
      );
    }
    doc.defaultView?.close();
  }
}
