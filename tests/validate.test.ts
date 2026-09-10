import { describe, expect, it } from 'vitest';
import { report } from '../validate-report';

const page = (over: Partial<Parameters<typeof report>[1][number]>) => ({
  collection: 'docs',
  path: '/guide',
  file: 'docs/guide.md',
  title: 'Guide',
  description: 'A guide.',
  anchors: new Set<string>(),
  links: [] as { href: string }[],
  ...over
});

describe('report', () => {
  it('fails a collection with nothing in it', () => {
    // The symptom without this: an empty sidebar and a 404 on every page of
    // one version, with a green build.
    const { errors } = report([{ collection: 'docs_v1', prefix: '/v1' }], []);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/docs_v1/);
  });

  it('fails a folder shadowed by a version prefix', () => {
    const sources = [
      { collection: 'docs', prefix: '' },
      { collection: 'docs_v1', prefix: '/v1' }
    ];

    const { errors } = report(sources, [
      page({ path: '/v1/thing', file: 'docs/v1/thing.md' }),
      page({ collection: 'docs_v1', path: '/v1/guide' })
    ]);

    expect(errors.some((error) => error.includes('v1'))).toBe(true);
  });

  it('warns, not fails, about a page with no description', () => {
    const { errors, warnings } = report(
      [{ collection: 'docs', prefix: '' }],
      [page({ description: undefined })]
    );

    expect(errors).toEqual([]);
    expect(warnings[0]).toMatch(/description/);
  });

  it('warns about a link no page serves', () => {
    const { warnings } = report(
      [{ collection: 'docs', prefix: '' }],
      [page({ links: [{ href: '/nowhere' }] })]
    );

    expect(warnings[0]).toMatch(/\/nowhere/);
  });

  it('resolves a link against its own source prefix', () => {
    // What the Markdown says is `/guide`; what the site serves is `/duxt/guide`,
    // because this source carries a prefix the author never saw.
    const { warnings } = report(
      [{ collection: 'docs_duxt', prefix: '/duxt' }],
      [
        page({
          collection: 'docs_duxt',
          path: '/duxt/reference',
          links: [{ href: '/guide' }]
        }),
        page({ collection: 'docs_duxt', path: '/duxt/guide' })
      ]
    );

    expect(warnings).toEqual([]);
  });

  it('warns about an anchor the target page has not got', () => {
    const { warnings } = report(
      [{ collection: 'docs', prefix: '' }],
      [
        page({ links: [{ href: '/other#missing' }] }),
        page({ path: '/other', anchors: new Set(['present']) })
      ]
    );

    expect(warnings[0]).toMatch(/missing/);
  });

  /**
   * A heading's id is its text — `icônes` — and a link to it arrives
   * percent-encoded. Compared as written, every accented anchor on the site was
   * reported as missing, and the fix the report asked for was to point the link
   * at a heading that was already there.
   */
  it('reads a percent-encoded anchor as the heading it names', () => {
    const { warnings } = report(
      [{ collection: 'docs', prefix: '' }],
      [
        page({ links: [{ href: '/other#ic%C3%B4nes' }] }),
        page({ path: '/other', anchors: new Set(['icônes']) })
      ]
    );

    expect(warnings).toEqual([]);
  });

  it('reports one that is encoded and still absent', () => {
    const { warnings } = report(
      [{ collection: 'docs', prefix: '' }],
      [
        page({ links: [{ href: '/other#ic%C3%B4nes' }] }),
        page({ path: '/other', anchors: new Set(['icones']) })
      ]
    );

    expect(warnings[0]).toMatch(/icônes/);
  });
});

describe('links on a translated site', () => {
  const sources = [
    { collection: 'docs', prefix: '', isDefaultLocale: true, locale: 'en' },
    { collection: 'docs_de', prefix: '', isDefaultLocale: false, locale: 'de' }
  ];

  it('checks an anchor against the linking page own language', () => {
    // Anchors come from heading TEXT, so a German page has German anchors.
    // Resolving by path alone picks whichever language was parsed last and
    // reports every correct link on one of the two.
    const { warnings } = report(sources, [
      page({
        collection: 'docs',
        path: '/concepts/localisation',
        file: 'docs/localisation.md',
        anchors: new Set(['paths-and-links'])
      }),
      page({
        collection: 'docs_de',
        path: '/concepts/localisation',
        file: 'docs/de/localisation.md',
        anchors: new Set(['pfade-und-links'])
      }),
      page({
        collection: 'docs_de',
        path: '/guide',
        file: 'docs/de/guide.md',
        links: [{ href: '/concepts/localisation#pfade-und-links' }]
      })
    ]);

    expect(warnings).toEqual([]);
  });

  it('still reports an anchor no language has', () => {
    const { warnings } = report(sources, [
      page({
        collection: 'docs',
        path: '/concepts/localisation',
        file: 'docs/localisation.md',
        anchors: new Set(['paths-and-links'])
      }),
      page({
        collection: 'docs_de',
        path: '/concepts/localisation',
        file: 'docs/de/localisation.md',
        anchors: new Set(['pfade-und-links'])
      }),
      page({
        collection: 'docs_de',
        path: '/guide',
        file: 'docs/de/guide.md',
        links: [{ href: '/concepts/localisation#gibt-es-nicht' }]
      })
    ]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/gibt-es-nicht/);
  });

  it('falls back to the original for a page a language does not carry', () => {
    // What the site itself does — so a link to an untranslated page is not a
    // broken link, and must not be reported as one.
    const { warnings } = report(sources, [
      page({
        collection: 'docs',
        path: '/only-english',
        file: 'docs/only-english.md',
        anchors: new Set(['setup'])
      }),
      page({
        collection: 'docs_de',
        path: '/guide',
        file: 'docs/de/guide.md',
        links: [{ href: '/only-english#setup' }]
      })
    ]);

    expect(warnings).toEqual([]);
  });
});

describe('the translation report', () => {
  const sources = [
    { collection: 'docs', prefix: '', isDefaultLocale: true, locale: 'en' },
    { collection: 'docs_de', prefix: '', isDefaultLocale: false, locale: 'de' }
  ];

  it('says nothing at all on a site with one language', () => {
    const { notes } = report([{ collection: 'docs', prefix: '' }], [page({})]);

    expect(notes).toEqual([]);
  });

  it('counts what a language carries and names what it does not', () => {
    const { notes } = report(sources, [
      page({ collection: 'docs', path: '/a', file: 'docs/a.md' }),
      page({ collection: 'docs', path: '/b', file: 'docs/b.md' }),
      page({ collection: 'docs_de', path: '/a', file: 'docs/de/a.md' })
    ]);

    expect(notes[0]).toBe('de: 1/2 pages');
    expect(notes[1]).toMatch(/docs\/b\.md.*no de translation/);
  });

  it('reports a translation the original has moved past', () => {
    // The OpenCode case: the files are all there, and none of them has moved
    // since the workflow was switched off.
    const { notes } = report(sources, [
      page({
        collection: 'docs',
        path: '/a',
        file: 'docs/a.md',
        lastUpdated: '2026-09-01T00:00:00Z'
      }),
      page({
        collection: 'docs_de',
        path: '/a',
        file: 'docs/de/a.md',
        lastUpdated: '2026-06-01T00:00:00Z'
      })
    ]);

    expect(notes[0]).toBe('de: 1/1 pages, 1 behind the original');
    expect(notes[1]).toMatch(/docs\/de\/a\.md.*has not moved/);
  });

  it('says nothing about staleness with no history to read', () => {
    // A source without `history: true` has no dates at all, and guessing from
    // their absence would report every page of every language as stale.
    const { notes } = report(sources, [
      page({ collection: 'docs', path: '/a', file: 'docs/a.md' }),
      page({ collection: 'docs_de', path: '/a', file: 'docs/de/a.md' })
    ]);

    expect(notes).toEqual(['de: 1/1 pages']);
  });
});

/**
 * The command blocks, whose two faults are both silent without this.
 *
 * A dropped tab looks like a site that offers three managers, and a mistyped verb
 * looks like four working commands. Neither shows up in a diff, a lint or a build.
 */
describe('report — package manager commands', () => {
  const sources = [{ collection: 'docs', prefix: '' }];

  it('says which manager cannot express a command', () => {
    const { warnings } = report(sources, [page({ commands: ['outdated'] })]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/no equivalent in yarn/);
    expect(warnings[0]).toMatch(/docs\/guide\.md/);
  });

  it('names a verb it does not translate', () => {
    const { warnings } = report(sources, [
      page({ commands: ['outdatd --long'] })
    ]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/"outdatd"/);
    expect(warnings[0]).toMatch(/shows it as written/);
  });

  it('says nothing about a command every manager has', () => {
    const { warnings } = report(sources, [
      page({ commands: ['add -D pkg', 'run build', 'dlx create-nuxt'] })
    ]);

    expect(warnings).toEqual([]);
  });
});

describe('report — generated sections', () => {
  const section = (
    over: Partial<Parameters<typeof report>[0][number]> = {},
    generated: Partial<
      NonNullable<Parameters<typeof report>[0][number]['generated']>
    > = {}
  ) => ({
    collection: 'releases',
    prefix: '/releases',
    path: 'CHANGELOG.md',
    ...over,
    generated: {
      type: 'changelog',
      label: 'Releases',
      ...generated
    }
  });

  it('never fails the build over one', () => {
    // Everything a LOCAL artefact can get wrong has already thrown while the
    // config was loading. What reaches this report is a remote artefact or a
    // page that rendered with something missing — neither is an error.
    const { errors, warnings } = report([section()], []);

    expect(errors).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('says a declared artefact was not there, and where it looked', () => {
    const { warnings } = report(
      [
        section(
          { repository: 'acme/sdk', ref: 'v1.9' },
          { remote: true, report: { pages: 0, warnings: [], missing: true } }
        )
      ],
      []
    );

    expect(warnings[0]).toMatch(/acme\/sdk@v1\.9/);
    expect(warnings[0]).toMatch(/not built/);
  });

  it('says an artefact the type could read nothing in', () => {
    const { warnings } = report(
      [section({}, { report: { pages: 0, warnings: [] } })],
      []
    );

    expect(warnings[0]).toMatch(/holds nothing the "changelog" type can read/);
  });

  it('reports what the type warned about, naming the artefact', () => {
    const { warnings } = report(
      [
        section(
          { path: 'openapi.yaml', collection: 'reference' },
          {
            type: 'openapi',
            report: {
              pages: 3,
              warnings: ['the reference "#/x" points at nothing.']
            }
          }
        )
      ],
      [page({ collection: 'reference', path: '/reference/one' })]
    );

    expect(warnings).toEqual([
      'the generated section "Releases" ("openapi.yaml"): the reference ' +
        '"#/x" points at nothing.'
    ]);
  });

  it('quotes the artefact only where it is in this checkout', () => {
    // The Checks panel turns the first quoted `.md` in a finding into an editor
    // link, and a remote CHANGELOG.md resolved against the local root links to
    // nothing.
    const { warnings } = report(
      [
        section(
          { repository: 'acme/sdk' },
          { remote: true, report: { pages: 1, warnings: ['something.'] } }
        )
      ],
      [page({ collection: 'releases', path: '/releases/one' })]
    );

    expect(warnings[0]).not.toMatch(/"CHANGELOG\.md"/);
    expect(warnings[0]).toMatch(/CHANGELOG\.md/);
  });

  it('falls back to the page count when nobody read the artefact', () => {
    // A remote artefact sits wherever Content's hash-cached checkout put it, so
    // the manifest a module holds carries no report for it at all. The empty
    // collection is still visible; only the reason for it is not.
    const { warnings } = report(
      [section({ repository: 'acme/sdk' }, { remote: true })],
      []
    );

    expect(warnings[0]).toMatch(/produced no pages/);
    expect(warnings[0]).toMatch(/acme\/sdk/);
  });

  it('says nothing about a section that is serving its pages', () => {
    const { errors, warnings } = report(
      [section({}, { report: { pages: 2, warnings: [] } })],
      [page({ collection: 'releases', path: '/releases/one' })]
    );

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('reports pages that were produced but are not being served', () => {
    // Content dropping a collection is the failure this whole file exists for,
    // and a generated one used to be exempt from the rule that caught it.
    const { warnings } = report(
      [section({}, { report: { pages: 4, warnings: [] } })],
      []
    );

    expect(warnings[0]).toMatch(/Content dropped it/);
  });

  it('does not ask a generated page for a description', () => {
    const { warnings } = report(
      [section({}, { report: { pages: 1, warnings: [] } })],
      [
        page({
          collection: 'releases',
          path: '/releases/one',
          description: undefined
        })
      ]
    );

    expect(warnings).toEqual([]);
  });
});
