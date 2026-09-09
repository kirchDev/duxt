import { describe, expect, it } from 'vitest';
import { generatedTitle, generatedToc } from '../app/utils/generated-toc';

/**
 * The shape Content actually stores, which is the point of the test: a
 * non-string prop arrives under a `:`-prefixed key holding JSON, so `count` is
 * `":count"` and the whole release list is one JSON string. Reading only the
 * plain spelling is a contents column that is always empty.
 */
const releasePageWithoutTitle = {
  type: 'minimal',
  value: [['changelog-group', { ':count': '1', name: 'Features' }]]
};

const releasePage = {
  type: 'minimal',
  value: [
    ['h1', { id: 'v0-5-0' }, '0.5.0'],
    [
      'changelog-group',
      { ':count': '2', name: 'Features' },
      ['ul', {}, ['li', {}, 'a feature']]
    ],
    ['changelog-group', { ':count': '1', name: '⚠ BREAKING CHANGES' }]
  ]
};

describe('generatedToc', () => {
  it('lists the groups a release page draws from a prop', () => {
    expect(generatedToc(releasePage)).toEqual([
      { id: 'features', text: 'Features', depth: 2 },
      // The mark release-please prefixes the block with is drawn away, and the
      // anchor is still built from the file's own name — see `changelogLabel`.
      { id: 'breaking-changes', text: 'BREAKING CHANGES', depth: 2 }
    ]);
  });

  it('leaves the overview alone: its versions are the visible page', () => {
    const overview = {
      type: 'minimal',
      value: [
        ['h1', { id: 'releases' }, 'Releases'],
        [
          'changelog-releases',
          {
            ':releases': JSON.stringify([
              { version: '0.5.0', to: '/releases/v0.5.0' }
            ])
          }
        ]
      ]
    };

    expect(generatedToc(overview)).toEqual([]);
  });

  it('nests a heading written inside a group under it', () => {
    // The parser promotes a `###` under a group to `##`, so on the page it is
    // an H2 beside the group's own — but it is read INSIDE it, and the column
    // has to say so or it claims the two are siblings.
    const page = {
      type: 'minimal',
      value: [
        [
          'changelog-group',
          { name: 'Features' },
          ['h2', { id: 'migrating' }, 'Migrating']
        ]
      ]
    };

    expect(generatedToc(page)).toEqual([
      {
        id: 'features',
        text: 'Features',
        depth: 2,
        children: [{ id: 'migrating', text: 'Migrating', depth: 3 }]
      }
    ]);
  });

  it('is empty for a page whose type draws no headings at all', () => {
    // What makes the column drop out rather than render an empty box.
    expect(
      generatedToc({ type: 'minimal', value: [['open-api-operation', {}]] })
    ).toEqual([]);
    expect(generatedToc(undefined)).toEqual([]);
  });
});

describe('generatedTitle', () => {
  it('is true for a type whose parser writes its own heading', () => {
    // An endpoint wants its title beside a method chip, which no shell knows.
    expect(
      generatedTitle({
        type: 'minimal',
        value: [
          ['h1', { id: 'pets' }, 'Pets'],
          ['open-api-operation', {}]
        ]
      })
    ).toBe(true);
  });

  it('is false for a page that opens on anything else', () => {
    // What gives a release page the same header a written page has.
    expect(generatedTitle(releasePageWithoutTitle)).toBe(false);
    expect(generatedTitle(undefined)).toBe(false);
  });
});
