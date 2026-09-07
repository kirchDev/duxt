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
