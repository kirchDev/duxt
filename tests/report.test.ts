import { describe, expect, it } from 'vitest';
import type { DuxtReport } from '../report';
import { duxtReportMarkdown, runDuxtReportCli } from '../report';

const source = (over: Partial<DuxtReport['sources'][number]> = {}) =>
  ({
    collection: 'docs',
    prefix: '',
    path: 'docs',
    isDefault: true,
    isDefaultLocale: true,
    status: 'current',
    history: true,
    ...over
  }) as DuxtReport['sources'][number];

const page = (
  over: Partial<NonNullable<DuxtReport['pages']>[number]> = {}
) => ({
  collection: 'docs',
  path: '/guide',
  file: 'docs/guide.md',
  title: 'Guide',
  description: 'A guide.',
  anchors: new Set<string>(),
  links: [] as { href: string }[],
  ...over
});

const data = (over: Partial<DuxtReport> = {}): DuxtReport => ({
  rootDir: '/srv/site',
  sources: [source()],
  pages: [page()],
  findings: { errors: [], warnings: [], notes: [] },
  redirects: [],
  locales: [],
  ...over
});

describe('duxtReportMarkdown', () => {
  it('counts pages per collection', () => {
    const markdown = duxtReportMarkdown(
      data({
        sources: [source(), source({ collection: 'docs_de', locale: 'de' })],
        pages: [
          page(),
          page({ path: '/install' }),
          page({ collection: 'docs_de' })
        ]
      })
    );

    expect(markdown).toContain('| `docs` | docs | ');
    expect(
      markdown.split('\n').find((line) => line.includes('`docs_de`'))
    ).toMatch(/\| 1 \|$/);
  });

  it('prints a ref without inventing a kind for it', () => {
    // A source that names its origin without saying branch or tag reaches the
    // manifest with a `ref` and no `refKind`.
    const markdown = duxtReportMarkdown(
      data({ sources: [source({ ref: 'main' })] })
    );

    expect(markdown).toContain('| main |');
    expect(markdown).not.toContain('undefined');
  });

  it('says a site has not been parsed rather than reporting it empty', () => {
    // Running the checks over no pages would report every collection as empty,
    // which is an error about the site rather than about the cache.
    const markdown = duxtReportMarkdown(data({ pages: undefined }));

    expect(markdown).toContain('no parse cache found');
    expect(markdown).toContain('| ? |');
  });

  it('says so when there is nothing to report', () => {
    expect(duxtReportMarkdown(data())).toContain('None.');
  });

  it('indents a translation note under the language it belongs to', () => {
    const markdown = duxtReportMarkdown(
      data({
        findings: {
          errors: [],
          warnings: [],
          notes: ['de: 6/8 pages', '  "docs/guide.md" has no de translation.']
        }
      })
    );

    expect(markdown).toContain('\n- de: 6/8 pages');
    expect(markdown).toContain('\n  - "docs/guide.md" has no de translation.');
  });

  it('lists the redirects it computed', () => {
    const markdown = duxtReportMarkdown(
      data({ redirects: [{ from: '/old', to: '/new' }] })
    );

    expect(markdown).toContain('| `/old` | `/new` |');
  });
});

describe('the command', () => {
  it('says one language where the site names none', () => {
    // A site without `locales` is written in one language and reaches the
    // report with an empty list rather than a list of one.
    expect(duxtReportMarkdown(data())).toMatch(/1 language$/m);
  });

  it('says how many where it names several', () => {
    expect(duxtReportMarkdown(data({ locales: ['en', 'de', 'fr'] }))).toContain(
      '3 languages'
    );
  });

  it('counts in the number the figure asks for', () => {
    // `1 collections, 0 versions, 1 languages` is the kind of wrongness a
    // reader stops trusting the rest of a report over.
    expect(duxtReportMarkdown(data())).toContain('- 1 collection, 0 versions,');
  });

  it('exits 1 on an error and 0 on a warning', () => {
    // Warnings are what somebody else's repository going stale looks like, and
    // a gate that cannot survive that is a gate that gets switched off.
    const warned = data({
      findings: { errors: [], warnings: ['something'], notes: [] }
    });
    const failed = data({
      findings: { errors: ['something'], warnings: [], notes: [] }
    });

    expect(runDuxtReportCli([], warned).exitCode).toBe(0);
    expect(runDuxtReportCli([], failed).exitCode).toBe(1);
  });

  it('serialises the anchor set --json can otherwise not carry', () => {
    // A Set stringifies as `{}`, which is a silently empty anchor list rather
    // than an error.
    const parsed = JSON.parse(
      runDuxtReportCli(
        ['--json'],
        data({ pages: [page({ anchors: new Set(['install']) })] })
      ).output
    ) as { pages: { anchors: string[] }[] };

    expect(parsed.pages[0]!.anchors).toEqual(['install']);
  });
});
