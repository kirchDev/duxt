import { describe, expect, it } from 'vitest';
import {
  areaForPath,
  currentSection,
  sectionsForPath
} from '../app/utils/section-scope';

/**
 * The section row belongs to the part of the site being read.
 *
 * One source is the case every existing site is, and the answer there has to be
 * "every entry, untouched" — a filter that changes a single-source site is a
 * filter that moves URLs nobody asked to move.
 */

/** The documentation at the root, a demo API beside it, its reference under. */
const SOURCES = [
  { prefix: '' },
  { prefix: '/demo' },
  { prefix: '/demo/api', generated: { type: 'openapi' } },
  { prefix: '/demo/v1.x/api', generated: { type: 'openapi' } }
];

const SECTIONS = [
  { label: 'Get started', to: '/getting-started' },
  { label: 'Reference', to: '/reference' },
  { label: 'Docs', to: '/demo' },
  { label: 'API', to: '/demo/api' }
];

describe('areaForPath', () => {
  it('places a page under the longest DOCUMENTATION prefix', () => {
    expect(areaForPath('/getting-started', SOURCES)).toBe('');
    expect(areaForPath('/demo', SOURCES)).toBe('/demo');
  });

  it('reads a generated section as part of the area it hangs under', () => {
    // `/demo/api` is a source too, and treating its prefix as an area of its own
    // would empty the row on every operation page — the reference is something
    // published under `/demo`, not a third part of the site.
    expect(areaForPath('/demo/api/widgets/list', SOURCES)).toBe('/demo');
  });

  it('answers the root for a site whose sources carry no prefix', () => {
    expect(areaForPath('/guides/deploying', [{ prefix: '' }])).toBe('');
  });
});

describe('sectionsForPath', () => {
  it('shows the documentation its own parts', () => {
    expect(
      sectionsForPath(SECTIONS, SOURCES, '/reference/sources').map((s) => s.to)
    ).toEqual(['/getting-started', '/reference']);
  });

  it('shows the second source its own, on its pages and under its reference', () => {
    for (const path of ['/demo', '/demo/api', '/demo/v1.x/api/widgets']) {
      expect(sectionsForPath(SECTIONS, SOURCES, path).map((s) => s.to)).toEqual(
        ['/demo', '/demo/api']
      );
    }
  });

  it('leaves a single-source site exactly as it was', () => {
    const sources = [{ prefix: '' }];
    expect(sectionsForPath(SECTIONS, sources, '/demo')).toBe(SECTIONS);
  });

  it('keeps an entry that names no destination in every area', () => {
    const sections = [...SECTIONS, { label: 'Elsewhere' }];

    expect(
      sectionsForPath(sections, SOURCES, '/demo').map((s) => s.label)
    ).toContain('Elsewhere');
  });

  it("keeps a versioned area's row and retargets its overview", () => {
    // The versioned demo source is one area. Its hand-written overview starts
    // at the default edition, whereas generated entries already resolve at the
    // reader's edition. Filtering by the raw prefix made `/demo/v2.x` a new
    // area, dropped the overview and then hid the whole section row.
    const sources = [
      { prefix: '/demo', repo: 'demo', version: 'v3.x' },
      { prefix: '/demo/v2.x', repo: 'demo', version: 'v2.x' },
      {
        prefix: '/demo/api',
        repo: 'demo',
        version: 'v3.x',
        generated: { type: 'openapi' }
      },
      {
        prefix: '/demo/v2.x/api',
        repo: 'demo',
        version: 'v2.x',
        generated: { type: 'openapi' }
      },
      {
        prefix: '/demo/changelog',
        repo: 'demo',
        generated: { type: 'changelog' }
      }
    ];
    const row = [
      { label: 'Overview', to: '/demo' },
      { label: 'Demo API', to: '/demo/v2.x/api' },
      { label: 'Demo Changelog', to: '/demo/changelog' }
    ];

    expect(areaForPath('/demo/v2.x', sources)).toBe('/demo');
    expect(areaForPath('/demo', sources)).toBe('/demo');
    expect(areaForPath('/demo/changelog', sources)).toBe('/demo');
    expect(sectionsForPath(row, sources, '/demo/v2.x')).toEqual([
      { label: 'Overview', to: '/demo/v2.x' },
      { label: 'Demo API', to: '/demo/v2.x/api' },
      { label: 'Demo Changelog', to: '/demo/changelog' }
    ]);
  });
});

describe('currentSection', () => {
  const row = [
    { label: 'Overview', to: '/demo' },
    { label: 'Demo API', to: '/demo/api' }
  ];

  it('lights the deepest entry that claims the page, and only it', () => {
    // Both prefix the path. Marking both said the reader was in two places at
    // once — which is what a row of nested parts looks like without this.
    expect(currentSection(row, '/demo/api')?.label).toBe('Demo API');
    expect(currentSection(row, '/demo/api/consignments')?.label).toBe(
      'Demo API'
    );
  });

  it('falls back to the part above where nothing deeper claims it', () => {
    expect(currentSection(row, '/demo')?.label).toBe('Overview');
    expect(currentSection(row, '/demo/versions')?.label).toBe('Overview');
  });

  it('is segment-aware, so a sibling that merely starts alike misses', () => {
    expect(currentSection(row, '/demo-old/api')).toBeUndefined();
  });

  it('answers nothing where no entry claims the page', () => {
    expect(currentSection(row, '/getting-started')).toBeUndefined();
  });
});
