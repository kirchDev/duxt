import assert from 'node:assert/strict';

export const WIKI_DEMO_ROUTES = [
  '/demo/wiki/lumen-harbour',
  '/demo/wiki/category/beacons'
];

export const WIKI_DEMO_SHOWCASE_ROUTES = [
  ...WIKI_DEMO_ROUTES,
  '/demo/wiki/beacon-register',
  '/demo/wiki/crown',
  '/de-DE/demo/wiki',
  '/de-DE/demo/wiki/lumen-harbour'
];

/** Check the reader-facing demo through rendered output, alongside axe. */
export function assertWikiDemo(document: Document, route: string) {
  if (!WIKI_DEMO_SHOWCASE_ROUTES.includes(route)) return;
  assert.ok(
    document.querySelector('[data-wiki-layout]'),
    `${route}: wiki layout`
  );
  assert.ok(
    document.querySelector('[data-wiki-article]'),
    `${route}: wiki article`
  );
  assert.equal(
    document.querySelectorAll('main h1').length,
    1,
    `${route}: one title`
  );

  if (route === '/demo/wiki/lumen-harbour') {
    const article = document.querySelector('main article')!;
    const contents = article.querySelector('[data-wiki-toc]');
    const heading = article.querySelector('#arrival');
    assert.ok(contents, 'harbour inline contents');
    assert.ok(
      contents.querySelector('a[href="#arrival"]'),
      'harbour inline contents link'
    );
    assert.ok(
      heading && contents.compareDocumentPosition(heading) & 4,
      'contents precede the article sections'
    );
    assert.ok(
      article.querySelector('[data-infobox] img[src="/favicon.svg"]'),
      'harbour facts use the duxt logo'
    );
    assert.ok(
      article.querySelector(
        '[data-wiki-navbox] a[href="/demo/wiki/crown-light"]'
      ),
      'navbox contains the guide’s beacons'
    );
    assert.ok(
      article.querySelector(
        '[data-wiki-backlinks] a[href="/demo/wiki/beacon-ridge"]'
      ),
      'other guide articles link back to the harbour'
    );
    const citation = article.querySelector<HTMLAnchorElement>(
      'a[data-footnote-ref]'
    );
    assert.ok(citation, 'harbour prose cites a source note');
    assert.ok(
      document
        .getElementById(citation.hash.slice(1))
        ?.querySelector('a[data-footnote-backref]'),
      'source note links back to the prose'
    );
  }

  if (route === '/demo/wiki/category/beacons') {
    const category = document.querySelector('[data-wiki-category]');
    assert.ok(
      category?.querySelector('a[href="/demo/wiki/crown-light"]'),
      'beacon category lists Crown Light'
    );
    assert.ok(
      category?.querySelector('a[href="/demo/wiki/reed-light"]'),
      'beacon category lists Reed Light'
    );
  }

  if (route === '/demo/wiki/beacon-register') {
    const query = document.querySelector('[data-infobox-query]');
    assert.ok(
      query?.querySelector('tbody a[href="/demo/wiki/crown-light"]'),
      'structured query returns Crown Light'
    );
    assert.ok(
      query?.querySelector('tbody a[href="/demo/wiki/reed-light"]'),
      'structured query returns Reed Light'
    );
  }

  if (route === '/demo/wiki/crown')
    assert.ok(
      document.querySelector('[data-wiki-disambiguation]'),
      'Crown renders as disambiguation'
    );

  if (route === '/de-DE/demo/wiki') {
    assert.ok(
      document.querySelector('main a[href="/de-DE/demo/wiki/lumen-harbour"]'),
      'German introduction leads to the fallback article'
    );
    assert.ok(
      !document
        .querySelector('main [role="status"]')
        ?.textContent?.includes('Diese Seite ist noch nicht'),
      'German introduction is translated'
    );
  }

  if (route === '/de-DE/demo/wiki/lumen-harbour') {
    assert.equal(
      document.querySelector('main h1')?.textContent?.trim(),
      'Lumen Harbour'
    );
    assert.ok(
      document
        .querySelector('main [role="status"]')
        ?.textContent?.includes(
          'Diese Seite ist noch nicht in deiner Sprache verfügbar'
        ),
      'German reader sees the English fallback notice'
    );
  }
}
