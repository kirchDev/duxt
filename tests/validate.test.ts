import { describe, expect, it } from 'vitest';
import { report } from '../modules/validate';

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
