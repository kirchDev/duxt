import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { changelogSectionType } from '../sections-changelog';
import type { DuxtSectionOptions } from '../sections-resolve';

const parse = (artefact: string, options: DuxtSectionOptions = {}) =>
  changelogSectionType.parse(artefact, {
    label: 'Releases',
    prefix: '/releases',
    options
  });

/** The layout the type asks for, given the declaration's own options. */
const layout = (options: DuxtSectionOptions = {}) =>
  typeof changelogSectionType.layout === 'function'
    ? changelogSectionType.layout(options)
    : changelogSectionType.layout;

/** The props of the first MDC block in a page, as the renderer will read them. */
const props = (body: string) => {
  const block = /^:{3,}[a-z-]+\n---\n([\s\S]*?)\n---\n/m.exec(body);

  return block ? parseYaml(block[1]!) : undefined;
};

/** The shape release-please writes, minor and patch releases both. */
const CHANGELOG = `# Changelog

Everything that changed.

## [0.2.0](https://example.com/compare/v0.1.0...v0.2.0) (2026-02-01)

### Features

* a thing ([#12](https://example.com/12))
* a second thing

### Bug Fixes

* another thing

### [0.1.1](https://example.com/compare/v0.1.0...v0.1.1) (2026-01-15)

### Bug Fixes

* the first fix

## 0.1.0 (2026-01-01)

### Features

* the first release
`;

/**
 * A hand-kept changelog that writes its releases at the top level.
 *
 * The shape the two rendering paths have to agree on: `split` reads the
 * releases whatever level they sit at, so `flat` cannot quietly drop them.
 */
const HAND_KEPT = `# Changelog

# 1.1.0 (2026-02-01)

* a thing

# 1.0.0 (2026-01-01)

* the first release
`;

describe('the changelog type', () => {
  it('is one global history in the original language', () => {
    // The two policies the whole per-type registry exists to make parameters:
    // a changelog is not a per-version document, and it is written once by the
    // release tool in whatever language the project commits in.
    expect(changelogSectionType.versioning).toBe('global');
    expect(changelogSectionType.localisation).toBe('original');
  });

  it('gives the section an index page and one page per release', () => {
    expect(parse(CHANGELOG).map((page) => page.file)).toEqual([
      'index.md',
      '1.v0.2.0.md',
      '2.v0.1.1.md',
      '3.v0.1.0.md'
    ]);
  });

  it('orders the pages newest first', () => {
    const many = [
      '# Changelog',
      ...Array.from({ length: 12 }, (_, index) => `## 1.0.${11 - index}`)
    ].join('\n\n');

    // Zero-padded to the count, or `10` would sort before `2` and the log
    // would read out of order.
    expect(
      parse(many)
        .map((page) => page.file)
        .slice(1, 3)
    ).toEqual(['01.v1.0.11.md', '02.v1.0.10.md']);
  });

  it('prefixes a bare version so the ordering prefix is stripped', () => {
    // Content reads a file name of digits and dots as a version and stops
    // refining it, which would leave `1.` in the URL. See `segment`.
    const [, first] = parse(CHANGELOG);

    expect(first!.file).toBe('1.v0.2.0.md');
  });

  it('leaves a version that already says `v` alone', () => {
    const [, first] = parse('# Changelog\n\n## v2.0.0 (2026-03-01)\n\nnote\n');

    expect(first!.file).toBe('1.v2.0.0.md');
  });

  it('titles and dates each release from its own heading', () => {
    const [, first] = parse(CHANGELOG);

    expect(first!.body).toContain('title: "0.2.0"');
    expect(first!.body).toContain('date: "2026-02-01"');
  });

  it('omits a date the heading does not carry', () => {
    const [, first] = parse('# Changelog\n\n## 3.0.0\n\nnote\n');

    expect(first!.body).not.toContain('date:');
  });

  it('keeps one release out of the next', () => {
    const [, first] = parse(CHANGELOG);

    expect(first!.body).toContain('* a thing');
    expect(first!.body).not.toContain('* the first fix');
  });

  it('reads a patch release written one level down', () => {
    const patch = parse(CHANGELOG)[2]!;

    expect(patch.body).toContain('title: "0.1.1"');
    expect(patch.body).toContain('* the first fix');
  });
});

/**
 * The presentation half: what the pages LOOK like, which is what a type's
 * layout and its components decide.
 */
describe('the changelog rendering', () => {
  it('renders the split history in a layout of its own', () => {
    // A layout name is public surface — renaming it is a `feat!:`.
    expect(layout()).toBe('changelog');
  });

  it('draws its own page heading, because the layout draws none', () => {
    // A type that names a layout owns its page: `pages/[...slug].vue` skips the
    // docs header for it, so the `<h1>` has to come out of the parser.
    const [index, first] = parse(CHANGELOG);

    expect(index!.body).toContain('# Releases');
    expect(first!.body).toContain('# 0.2.0');
  });

  it('groups a release by the file`s own headings, taken verbatim', () => {
    const [, first] = parse(CHANGELOG);

    expect(first!.body).toContain('::changelog-group');
    expect(first!.body).toContain('name: "Features"');
    expect(first!.body).toContain('name: "Bug Fixes"');
    // The entries stay Markdown inside the block, so search, `llms-full.txt`
    // and the copy button carry them as prose rather than as props.
    expect(first!.body).toContain('* a thing ([#12](https://example.com/12))');
  });

  it('counts the entries of each group', () => {
    const [, first] = parse(CHANGELOG);

    expect(first!.body).toMatch(/name: "Features"\ncount: 2/);
    expect(first!.body).toMatch(/name: "Bug Fixes"\ncount: 1/);
  });

  it('groups a patch release written one level down', () => {
    // Its own heading was `###`, so its groups are `###` too — the level is
    // read off the body rather than assumed.
    const patch = parse(CHANGELOG)[2]!;

    expect(patch.body).toContain('name: "Bug Fixes"');
    expect(patch.body).toContain('* the first fix');
  });

  it('promotes a heading below the group level, so none skips one', () => {
    const nested = [
      '## 1.0.0',
      '',
      '### Features',
      '',
      '#### A detail',
      '',
      '* a thing',
      ''
    ].join('\n');

    // The group is the page's `<h2>`, so what was under it lands at `###`.
    expect(parse(nested)[1]!.body).toContain('### A detail');
  });

  it('leaves the prose before the first group where it is', () => {
    const noted = ['## 1.0.0', '', 'A note about this one.', ''].join('\n');

    const [, first] = parse(noted);

    expect(first!.body).toContain('A note about this one.');
    expect(first!.body).not.toContain('::changelog-group');
  });

  it('lists the releases on the index for the component to draw', () => {
    const [index] = parse(CHANGELOG);

    expect(index!.body).toContain('::changelog-releases');
    expect(props(index!.body)).toMatchObject({
      releases: [
        {
          version: '0.2.0',
          date: '2026-02-01',
          to: '/releases/v0.2.0',
          groups: [
            { name: 'Features', count: 2 },
            { name: 'Bug Fixes', count: 1 }
          ]
        },
        { version: '0.1.1', date: '2026-01-15', to: '/releases/v0.1.1' },
        { version: '0.1.0', date: '2026-01-01', to: '/releases/v0.1.0' }
      ]
    });
  });

  it('quotes a date, which a plain one would reach the page as', () => {
    // YAML resolves `2026-02-01` to a timestamp under the schema remark-mdc
    // reads props with, and a `Date` in `<time :datetime>` prints the reader's
    // own timezone rather than the release day.
    const [index] = parse(CHANGELOG);

    expect(typeof props(index!.body).releases[0].date).toBe('string');
  });

  it('keeps the preamble on the index and drops the file`s own title', () => {
    const [index] = parse(CHANGELOG);

    expect(index!.body).toContain('Everything that changed.');
    expect(index!.body).not.toContain('# Changelog');
  });

  it('reads a changelog with no releases as the index alone', () => {
    const pages = parse('# Changelog\n\nNothing released yet.\n');

    expect(pages.map((page) => page.file)).toEqual(['index.md']);
    expect(pages[0]!.body).toContain('Nothing released yet.');
  });

  it('does not read a heading inside a fenced block as a release', () => {
    const fenced = [
      '# Changelog',
      '',
      '## 1.0.0 (2026-01-01)',
      '',
      '```md',
      '## 9.9.9 (2026-01-02)',
      '```',
      ''
    ].join('\n');

    expect(parse(fenced).map((page) => page.file)).toEqual([
      'index.md',
      '1.v1.0.0.md'
    ]);
  });

  it('does not read a heading inside a fenced block as a group', () => {
    const fenced = [
      '## 1.0.0',
      '',
      '```md',
      '### a heading in an example',
      '```',
      ''
    ].join('\n');

    const [, first] = parse(fenced);

    expect(first!.body).not.toContain('::changelog-group');
    expect(first!.body).toContain('### a heading in an example');
  });

  it('reads a release the file wrote at the top level', () => {
    // A release is a release at whatever level the file put it, and this is
    // the half that already read one — which is what makes the flat page
    // dropping the same headings the asymmetry rather than the policy.
    const pages = parse(HAND_KEPT);

    expect(pages.map((page) => page.file)).toEqual([
      'index.md',
      '1.v1.1.0.md',
      '2.v1.0.0.md'
    ]);
    expect(pages[0]!.body).not.toContain('# Changelog');
  });

  it('quotes every frontmatter value, so a colon cannot end the mapping', () => {
    // The failure `tests/frontmatter-yaml.test.ts` exists over, one layer up:
    // here the frontmatter is generated rather than written.
    const [index] = changelogSectionType.parse('# Changelog\n', {
      label: 'Releases: the log',
      prefix: '/releases',
      options: {}
    });

    expect(index!.body).toContain('title: "Releases: the log"');
  });
});

/**
 * The other granularity: the file as it stands, for a project that wants it
 * shown rather than turned into a section.
 */
describe('the flat changelog', () => {
  const flat = (artefact: string) => parse(artefact, { granularity: 'flat' });

  it('is one page, whatever the file holds', () => {
    expect(flat(CHANGELOG).map((page) => page.file)).toEqual(['index.md']);
  });

  it('renders the file unchanged, releases and all', () => {
    const [only] = flat(CHANGELOG);

    expect(only!.body).toContain('## [0.2.0]');
    expect(only!.body).toContain('### Features');
    expect(only!.body).toContain('* the first release');
    expect(only!.body).not.toContain('::changelog-group');
  });

  it('is an ordinary page, so it keeps the docs chrome', () => {
    // No layout, and therefore the header, the breadcrumb, the table of
    // contents and the prev/next pair the docs shell draws — which is the
    // whole point of asking for the file as it stands.
    expect(layout({ granularity: 'flat' })).toBeUndefined();
  });

  it('draws no heading of its own, because the page draws one', () => {
    const [only] = flat(CHANGELOG);

    expect(only!.body).toContain('title: "Releases"');
    expect(only!.body).not.toContain('# Changelog');
    expect(only!.body).not.toContain('# Releases');
  });

  it('keeps every release heading the file wrote at the top level', () => {
    // The file's own title goes, because the page draws one from `title`. The
    // releases beside it are the file, and dropping them would leave the mode
    // that exists to render the file untouched printing one unbroken run of
    // bullets with no release boundaries in it at all.
    const [only] = flat(HAND_KEPT);

    expect(only!.body).not.toContain('# Changelog');
    expect(only!.body).toContain('# 1.1.0 (2026-02-01)');
    expect(only!.body).toContain('# 1.0.0 (2026-01-01)');
  });

  it('drops no heading from a file that opens on a release', () => {
    // Nothing precedes the first release, so there is no title to take: the
    // rule is the file's own title, not the first `#` in it.
    const [only] = flat('# 1.0.0 (2026-01-01)\n\n* the first release\n');

    expect(only!.body).toContain('# 1.0.0 (2026-01-01)');
  });

  it('names a granularity it does not have', () => {
    expect(() => parse(CHANGELOG, { granularity: 'timeline' })).toThrow(
      /granularity/
    );
  });
});
