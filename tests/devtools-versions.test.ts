import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { duxtManifest } from '../sections-resolve';
import {
  renderSources,
  renderVersions
} from '../server/devtools/render/sources';

/**
 * The two source panels, over a site that publishes a generated section per
 * version and per language.
 *
 * Rendered rather than reasoned about: both failures below were legible only in
 * the output — a heading that said `v2` twice, and a figure that counted rows.
 */
const manifest = () =>
  duxtManifest(
    [
      {
        path: 'docs',
        repo: 'acme/sdk',
        locales: ['en', 'de'],
        refs: [
          { branch: 'main', label: 'v2' },
          { tag: 'v1.9.4', label: 'v1.9' }
        ],
        generated: [
          {
            type: 'openapi',
            path: 'openapi.yaml',
            label: 'API',
            locales: { de: 'openapi.de.yaml' }
          }
        ]
      }
    ],
    { defaultLocale: 'en' }
  );

/** Every collection's paths, with one endpoint missing from the German v1.9. */
const served = () => {
  const pages = new Map<string, string[]>();

  for (const source of manifest()) {
    pages.set(
      source.collection,
      source.generated
        ? ['/pets', '/stores'].map((path) => `${source.prefix}${path}`)
        : ['', '/guide'].map((path) => `${source.prefix}${path}` || '/')
    );
  }

  pages.set('docs_de_v1_9_api', ['/v1.9/api/pets']);

  return pages;
};

/**
 * The `<th>` texts of one table.
 *
 * PARSED, NOT MATCHED. Two regexes stood here — one to find the cells, one to
 * strip the markup inside them — and the second is the shape CodeQL reads as an
 * incomplete sanitizer, correctly in general and wrongly here: this reads a
 * string the renderer beside it produced, in a test, and nothing it returns is
 * ever rendered. A parser answers the same question without the argument, and
 * survives an attribute order or a newline inside the tag, which the pattern
 * did not.
 *
 * The `<table>` wrapper is load-bearing: `renderVersions` returns fragments,
 * and the HTML parser drops a `<th>` that has no table above it — leaving an
 * empty list, and an assertion over nothing passes.
 */
const headings = (html: string) =>
  [
    ...new JSDOM(`<table>${html}</table>`).window.document.querySelectorAll(
      'th[scope="col"]'
    )
  ].map((th) => th.textContent!.trim());

describe('the versions matrix with a generated section', () => {
  it('gives each declaration a grid of its own', () => {
    // One grid holding the docs tree and the reference drew a column per
    // COLLECTION rather than per version — `v2 | v1.9 | v2 | v1.9`, with
    // nothing saying which pair was the reference.
    const html = renderVersions(manifest(), served());

    for (const table of html.split('<h2>').slice(1)) {
      const columns = headings(table).slice(1);

      expect(columns).toEqual([...new Set(columns)]);
    }
  });

  it('never marks a page missing that was never meant to be there', () => {
    // A docs page and an endpoint page share no path, so a grid holding both
    // filled every cross-quadrant cell with the `·` that means MISSING.
    const html = renderVersions(manifest(), served());
    const grids = html.split('<h2>').slice(1);

    const docs = grids.find((grid) => grid.includes('/guide'))!;

    expect(docs).not.toContain('/pets');
  });

  it('names the section the grid belongs to', () => {
    expect(renderVersions(manifest(), served())).toContain('>API<');
  });

  it('still shows the language a page is missing from', () => {
    // The point of the panel: the German v1.9 reference is one endpoint short,
    // and the fallback is the gap between two columns.
    const grids = renderVersions(manifest(), served()).split('<h2>').slice(1);
    const reference = grids.filter((grid) => grid.includes('/stores'));

    expect(reference.some((grid) => grid.includes('mark no'))).toBe(true);
  });
});

describe('the sources summary', () => {
  it('counts versions, not the collections carrying one', () => {
    // Two versions in two languages with a reference beside them is eight
    // collections and two versions. The figure said eight.
    const html = renderSources(manifest());

    expect(html).toContain('<b>2</b><span>versions</span>');
    expect(html).toContain('<b>8</b><span>collections</span>');
  });

  it('counts the generated sections', () => {
    expect(renderSources(manifest())).toContain(
      '<b>4</b><span>generated sections</span>'
    );
  });
});
