import { describe, expect, it } from 'vitest';
import { changelogSectionType } from '../sections-changelog';

const context = { label: 'Releases', prefix: '/releases' };

const parse = (artefact: string) =>
  changelogSectionType.parse(artefact, context);

/** The shape release-please writes, minor and patch releases both. */
const CHANGELOG = `# Changelog

Everything that changed.

## [0.2.0](https://example.com/compare/v0.1.0...v0.2.0) (2026-02-01)

### Features

* a thing ([#12](https://example.com/12))

### Bug Fixes

* another thing

### [0.1.1](https://example.com/compare/v0.1.0...v0.1.1) (2026-01-15)

### Bug Fixes

* the first fix

## 0.1.0 (2026-01-01)

### Features

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

  it('promotes the release body so the headings do not skip a level', () => {
    // The release itself is the page's `<h1>`; an `###` under it is a broken
    // outline and an axe `heading-order` failure.
    const [, first] = parse(CHANGELOG);

    expect(first!.body).toContain('## Features');
    expect(first!.body).toContain('## Bug Fixes');
    expect(first!.body).not.toContain('### ');
  });

  it('reads a patch release written one level down', () => {
    const patch = parse(CHANGELOG)[2]!;

    expect(patch.body).toContain('title: "0.1.1"');
    expect(patch.body).toContain('* the first fix');
    // Its own body was `###` too, so it lands at the same level as a minor's.
    expect(patch.body).toContain('## Bug Fixes');
  });

  it('keeps one release out of the next', () => {
    const [, first] = parse(CHANGELOG);

    expect(first!.body).toContain('* a thing');
    expect(first!.body).not.toContain('* the first fix');
  });

  it('gives the index the section label and the preamble', () => {
    const [index] = parse(CHANGELOG);

    expect(index!.body).toContain('title: "Releases"');
    expect(index!.body).toContain('Everything that changed.');
    // The file's own `# Changelog`: the page draws its heading from `title`,
    // and a second h1 in the body is a duplicate and an axe finding.
    expect(index!.body).not.toContain('# Changelog');
  });

  it('lists the releases on the index, under the section prefix', () => {
    const [index] = parse(CHANGELOG);

    expect(index!.body).toContain('- [0.2.0](/releases/v0.2.0) — 2026-02-01');
    expect(index!.body).toContain('- [0.1.0](/releases/v0.1.0) — 2026-01-01');
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

  it('leaves a heading inside a fenced block unpromoted', () => {
    const fenced = [
      '## 1.0.0',
      '',
      '```md',
      '### a heading in an example',
      '```',
      ''
    ].join('\n');

    expect(parse(fenced)[1]!.body).toContain('### a heading in an example');
  });

  it('quotes every frontmatter value, so a colon cannot end the mapping', () => {
    // The failure `tests/frontmatter-yaml.test.ts` exists over, one layer up:
    // here the frontmatter is generated rather than written.
    const [index] = changelogSectionType.parse('# Changelog\n', {
      label: 'Releases: the log',
      prefix: '/releases'
    });

    expect(index!.body).toContain('title: "Releases: the log"');
  });
});
