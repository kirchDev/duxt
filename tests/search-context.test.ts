import { describe, expect, it } from 'vitest';
import {
  searchContext,
  sectionLabelForPath
} from '../app/utils/search-context';

/**
 * What a palette row says about itself beyond its title.
 *
 * The screenshot on the issue showed three `Harbour` entries under "Recently
 * viewed" with nothing to tell them apart. A title is not an identity on a site
 * that serves several repositories, several versions of each, and generated
 * sections whose pages are named after operations.
 */

/** The documentation at the root, a versioned second source, its reference. */
const SOURCES = [
  { prefix: '' },
  { prefix: '/harbour', repo: 'harbour' },
  { prefix: '/harbour/v1.x', repo: 'harbour', version: 'v1.x' },
  {
    prefix: '/harbour/api',
    repo: 'harbour',
    generated: { type: 'openapi' }
  }
];

const SECTIONS = [
  { label: 'Guides', to: '/guides' },
  { label: 'Harbour', to: '/harbour' },
  { label: 'API', to: '/harbour/api' }
];

describe('searchContext', () => {
  it('names the section, the source edition and the route', () => {
    expect(searchContext('/harbour/v1.x/ports', SECTIONS, SOURCES)).toBe(
      'Harbour · harbour/v1.x · /harbour/v1.x/ports'
    );
  });

  it('leaves out what a site has not got', () => {
    // The site every consumer has before it asks for any of this: one source,
    // one version, no second repository to name. A row that printed an empty
    // slot — or a made-up "Documentation" — would be noise on every line.
    expect(searchContext('/getting-started', [], [{ prefix: '' }])).toBe(
      '/getting-started'
    );
  });

  it('tells two editions of one page apart', () => {
    // The whole point. `Harbour` three times over is what the reader saw; the
    // pages behind those rows differ by version and by route, and both now say
    // so on the row itself.
    const rows = ['/harbour/ports', '/harbour/v1.x/ports'].map((path) =>
      searchContext(path, SECTIONS, SOURCES)
    );

    expect(rows).toEqual([
      'Harbour · harbour · /harbour/ports',
      'Harbour · harbour/v1.x · /harbour/v1.x/ports'
    ]);
    expect(new Set(rows).size).toBe(rows.length);
  });

  it('says what a source is called, where it has been given a name', () => {
    // The slot used to be the URL segment, so the documentation at the root —
    // which has no segment — said nothing, and `tf` said `tf`.
    const named = [
      { prefix: '', collection: 'docs' },
      { prefix: '/harbour', repo: 'harbour', collection: 'docs_harbour' }
    ];
    const names = new Map([
      ['docs', 'duxt documentation'],
      ['docs_harbour', 'Harbour handbook']
    ]);

    expect(searchContext('/getting-started', [], named, { names })).toBe(
      'duxt documentation · /getting-started'
    );
    expect(searchContext('/harbour/ports', SECTIONS, named, { names })).toBe(
      'Harbour · Harbour handbook · /harbour/ports'
    );
  });

  it('keeps the version beside a name it has been given', () => {
    const named = [
      {
        prefix: '/harbour/v1.x',
        repo: 'harbour',
        version: 'v1.x',
        collection: 'h1'
      }
    ];

    expect(
      searchContext('/harbour/v1.x/ports', SECTIONS, named, {
        names: new Map([['h1', 'Harbour handbook']])
      })
    ).toBe('Harbour · Harbour handbook · v1.x · /harbour/v1.x/ports');
  });

  it('leaves the source out where a caption above the row already says it', () => {
    // The search list captions each run of results that share a source, so
    // repeating it per row is the repetition this line exists to remove. What
    // is the ROW's own — its section and its route — stays.
    expect(
      searchContext('/harbour/v1.x/ports', SECTIONS, SOURCES, { source: false })
    ).toBe('Harbour · /harbour/v1.x/ports');
  });

  it('reads a hit at a heading as the page it is in', () => {
    // A search hit is addressed `/page#heading`; the anchor is the row's title
    // already, and repeating it as part of the route says nothing.
    expect(
      searchContext('/harbour/api/ports#list-ports', SECTIONS, SOURCES)
    ).toBe('API · harbour · /harbour/api/ports');
  });
});

describe('sectionLabelForPath', () => {
  it('answers the deepest section that claims the route', () => {
    // `/harbour/api` is inside `/harbour`, and a first match would have called
    // every operation page part of the documentation it hangs under.
    expect(sectionLabelForPath('/harbour/api/ports', SECTIONS)).toBe('API');
  });

  it('claims nothing for a route no section covers', () => {
    // Segment-aware, so a section does not swallow a sibling that merely starts
    // with its name.
    expect(
      sectionLabelForPath('/harbour-legacy/ports', SECTIONS)
    ).toBeUndefined();
  });
});
