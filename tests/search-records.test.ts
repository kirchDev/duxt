import { describe, expect, it } from 'vitest';
import type { CachedPage } from '../content-cache';
import type { DuxtResolvedSource } from '../sources-resolve';
import { duxtSearchRecords } from '../search-records';

/**
 * The one payload `duxt:search:records` hands a provider layer.
 *
 * Tested as data in, records out — the module half only reads Content's parse
 * cache and calls the hook, and neither of those is a rule anybody can get
 * wrong twice. Everything that IS a rule is here: which page becomes how many
 * records, what a record is addressed by, and what a provider is allowed to do
 * with the array afterwards.
 */

const source = (
  over: Partial<DuxtResolvedSource> = {}
): DuxtResolvedSource => ({
  collection: 'docs',
  prefix: '',
  isDefault: true,
  path: 'docs',
  isDefaultLocale: true,
  status: 'current',
  history: false,
  ...over
});

const page = (over: Partial<CachedPage> = {}): CachedPage => ({
  collection: 'docs',
  path: '/start',
  file: 'docs/start.md',
  content: {},
  ...over
});

const english = {
  locales: ['en-GB'],
  defaultLocale: 'en-GB',
  strategy: 'prefix_except_default' as const
};

describe('duxtSearchRecords', () => {
  it('splits a page into the page itself and one record per heading', () => {
    const records = duxtSearchRecords(
      [source()],
      [
        page({
          content: {
            title: 'Getting started',
            description: 'How to install it.',
            body: {
              type: 'minimal',
              value: [
                ['p', {}, 'An opening paragraph.'],
                ['h2', { id: 'install' }, 'Install'],
                ['p', {}, 'Run the command.'],
                ['h3', { id: 'verify' }, 'Verify'],
                ['p', {}, 'Check the output.']
              ]
            }
          }
        })
      ],
      english
    );

    expect(
      records.map(({ url, title, content }) => ({ url, title, content }))
    ).toEqual([
      {
        url: '/start',
        title: 'Getting started',
        content: 'How to install it. An opening paragraph.'
      },
      { url: '/start#install', title: 'Install', content: 'Run the command.' },
      { url: '/start#verify', title: 'Verify', content: 'Check the output.' }
    ]);
  });

  it('reads the words out of the markup and normalises the whitespace', () => {
    const [record] = duxtSearchRecords(
      [source()],
      [
        page({
          content: {
            title: 'Prose',
            body: {
              type: 'minimal',
              value: [
                [
                  'p',
                  {},
                  'A sentence with ',
                  ['strong', {}, 'bold'],
                  ' in the middle.'
                ],
                ['p', {}, '  spaced   out  \n  over lines  ']
              ]
            }
          }
        })
      ],
      english
    );

    expect(record?.content).toBe(
      'A sentence with bold in the middle. spaced out over lines'
    );
  });

  it('keeps a table, which the reader-facing index drops', () => {
    const [record] = duxtSearchRecords(
      [source()],
      [
        page({
          content: {
            title: 'Options',
            body: {
              type: 'minimal',
              value: [
                [
                  'table',
                  {},
                  ['tr', {}, ['td', {}, 'timeout'], ['td', {}, 'seconds']]
                ]
              ]
            }
          }
        })
      ],
      english
    );

    expect(record?.content).toContain('timeout');
    expect(record?.content).toContain('seconds');
  });

  it('folds a heading with no anchor into the section above it', () => {
    const records = duxtSearchRecords(
      [source()],
      [
        page({
          content: {
            title: 'Page',
            body: {
              type: 'minimal',
              value: [
                ['h2', {}, 'Unanchored'],
                ['p', {}, 'Body text.']
              ]
            }
          }
        })
      ],
      english
    );

    expect(records).toHaveLength(1);
    expect(records[0]?.url).toBe('/start');
    expect(records[0]?.content).toBe('Unanchored Body text.');
  });

  it('drops a record that carries neither a title nor any words', () => {
    const records = duxtSearchRecords(
      [source()],
      [page({ content: { body: { type: 'minimal', value: [] } } })],
      english
    );

    expect(records).toEqual([]);
  });

  it('leaves a page that opted out of search entirely unindexed', () => {
    const records = duxtSearchRecords(
      [source()],
      [
        page({
          content: {
            title: 'Internal',
            search: false,
            body: {
              type: 'minimal',
              value: [['h2', { id: 'secret' }, 'Secret']]
            }
          }
        })
      ],
      english
    );

    expect(records).toEqual([]);
  });

  describe('the coordinates a provider facets on', () => {
    it('names the root documentation with a slash and no version', () => {
      const [record] = duxtSearchRecords(
        [source()],
        [page({ content: { title: 'Start' } })],
        english
      );

      expect(record?.source).toBe('/');
      expect(record?.version).toBeUndefined();
      expect(record?.locale).toBe('en-GB');
    });

    it('names a repository segment and carries its version', () => {
      const [record] = duxtSearchRecords(
        [
          source({
            collection: 'docs_harbour_v1',
            prefix: '/harbour/v1',
            repo: 'harbour',
            version: 'v1',
            isDefault: false
          })
        ],
        [
          page({
            collection: 'docs_harbour_v1',
            path: '/harbour/v1/start',
            content: { title: 'Start' }
          })
        ],
        english
      );

      expect(record?.source).toBe('/harbour');
      expect(record?.version).toBe('v1');
      expect(record?.url).toBe('/harbour/v1/start');
    });

    it('gives a generated section an identity of its own', () => {
      const [record] = duxtSearchRecords(
        [
          source({
            collection: 'docs_api',
            prefix: '/api',
            generated: {
              type: 'openapi',
              label: 'API',
              slug: 'api',
              declaration: 0,
              navigation: 'sections',
              versioning: 'per-version',
              localisation: 'original',
              remote: false
            }
          })
        ],
        [
          page({
            collection: 'docs_api',
            path: '/api/widgets',
            content: { title: 'Widgets' }
          })
        ],
        english
      );

      // The artefact's LABEL is a display string and stays out of the payload;
      // its slug is a URL segment and is what a facet can be built on.
      expect(record?.source).toBe('/api');
      expect(JSON.stringify(record)).not.toContain('API');
    });

    it('carries no collection name into the payload', () => {
      const [record] = duxtSearchRecords(
        [source({ collection: 'docs_de_harbour' })],
        [
          page({
            collection: 'docs_de_harbour',
            content: { title: 'Start' }
          })
        ],
        english
      );

      expect(JSON.stringify(record)).not.toContain('docs_de_harbour');
    });
  });

  describe('the public URL', () => {
    it('prefixes a translated source with its locale', () => {
      const [record] = duxtSearchRecords(
        [
          source({
            collection: 'docs_de',
            locale: 'de-DE',
            isDefaultLocale: false
          })
        ],
        [
          page({
            collection: 'docs_de',
            content: { title: 'Loslegen' }
          })
        ],
        { ...english, locales: ['en-GB', 'de-DE'] }
      );

      expect(record?.url).toBe('/de-DE/start');
      expect(record?.locale).toBe('de-DE');
    });

    it('prefixes every locale where the strategy says so', () => {
      const [record] = duxtSearchRecords(
        [source()],
        [page({ content: { title: 'Start' } })],
        { ...english, strategy: 'prefix_and_default' }
      );

      expect(record?.url).toBe('/en-GB/start');
    });

    it('prefixes none where the site routes without them', () => {
      const [record] = duxtSearchRecords(
        [
          source({
            collection: 'docs_de',
            locale: 'de-DE',
            isDefaultLocale: false
          })
        ],
        [page({ collection: 'docs_de', content: { title: 'Start' } })],
        { ...english, locales: ['en-GB', 'de-DE'], strategy: 'no_prefix' }
      );

      expect(record?.url).toBe('/start');
    });

    it('routes a source written in a language at the region i18n serves', () => {
      // The shape `www/` actually has, and the one that quietly indexed
      // NOTHING: a source declares `locales: ['de']` — one folder for every
      // German region — while i18n routes `de-DE`. Matching the two codes for
      // equality dropped four translations and said so nowhere.
      const [record] = duxtSearchRecords(
        [
          source({
            collection: 'docs_de',
            locale: 'de',
            isDefaultLocale: false
          })
        ],
        [page({ collection: 'docs_de', content: { title: 'Loslegen' } })],
        { ...english, locales: ['en-GB', 'de-DE', 'pt-PT'] }
      );

      expect(record?.url).toBe('/de-DE/start');
      // The LANGUAGE the words are in, which is what a provider stems by — not
      // the region the URL happens to be routed at.
      expect(record?.locale).toBe('de');
    });

    it('addresses one region where a site routes two over one tree', () => {
      const records = duxtSearchRecords(
        [
          source({
            collection: 'docs_pt',
            locale: 'pt',
            isDefaultLocale: false
          })
        ],
        [page({ collection: 'docs_pt', content: { title: 'Começar' } })],
        { ...english, locales: ['en-GB', 'pt-PT', 'pt-BR'] }
      );

      expect(records.map((record) => record.url)).toEqual(['/pt-PT/start']);
    });

    it('indexes nothing for a language the site does not serve', () => {
      const records = duxtSearchRecords(
        [
          source({
            collection: 'docs_fr',
            locale: 'fr-FR',
            isDefaultLocale: false
          })
        ],
        [page({ collection: 'docs_fr', content: { title: 'Départ' } })],
        english
      );

      expect(records).toEqual([]);
    });
  });

  describe('the record id', () => {
    it('is a token every provider accepts as a primary key', () => {
      const records = duxtSearchRecords(
        [source()],
        [
          page({
            content: {
              title: 'Überblick',
              body: {
                type: 'minimal',
                value: [['h2', { id: 'grüße' }, '日本語']]
              }
            }
          })
        ],
        english
      );

      for (const record of records)
        expect(record.id).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('is stable across builds and unique across records', () => {
      const build = () =>
        duxtSearchRecords(
          [source()],
          [
            page({
              content: {
                title: 'Start',
                body: {
                  type: 'minimal',
                  value: [
                    ['h2', { id: 'one' }, 'One'],
                    ['h2', { id: 'two' }, 'Two']
                  ]
                }
              }
            })
          ],
          english
        );

      const first = build().map((record) => record.id);
      expect(build().map((record) => record.id)).toEqual(first);
      expect(new Set(first).size).toBe(first.length);
    });
  });

  describe('read-only', () => {
    it('refuses a consumer that rewrites a record', () => {
      const [record] = duxtSearchRecords(
        [source()],
        [page({ content: { title: 'Start' } })],
        english
      );

      expect(() => {
        (record as unknown as { title: string }).title = 'Rewritten';
      }).toThrow();
    });

    it('refuses a consumer that reorders the payload', () => {
      const records = duxtSearchRecords(
        [source()],
        [
          page({ path: '/a', content: { title: 'A' } }),
          page({ path: '/b', content: { title: 'B' } })
        ],
        english
      );

      expect(() => (records as DuxtSearchRecordArray).reverse()).toThrow();
    });
  });

  it('orders the payload by source and then by page, whatever the cache says', () => {
    const sources = [
      source(),
      source({ collection: 'docs_api', prefix: '/api' })
    ];
    const pages = [
      page({ collection: 'docs_api', path: '/api/z', content: { title: 'Z' } }),
      page({ path: '/b', content: { title: 'B' } }),
      page({ collection: 'docs_api', path: '/api/a', content: { title: 'A' } }),
      page({ path: '/a', content: { title: 'A' } })
    ];

    expect(
      duxtSearchRecords(sources, pages, english).map((record) => record.url)
    ).toEqual(['/a', '/b', '/api/a', '/api/z']);
  });
});

/** Only so the reorder above can be attempted without an `any`. */
type DuxtSearchRecordArray = { reverse(): unknown };
