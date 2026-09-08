/**
 * The `changelog` type: a release log, published as pages.
 *
 * The first type in the registry, and the reason the registry is not
 * generalisation without a user: a scaffold with nothing plugged into it is
 * never touched by the build, which is where this repository's real failures
 * have always shown up.
 *
 * What it reads is the file release-please writes — `## [0.2.0](compare) (date)`
 * for a release, `### [0.2.1](compare) (date)` for a patch — and it is
 * deliberately tolerant beyond that: a heading is a release when it begins with
 * something that looks like a version, so a hand-kept `## 1.4.0` or a
 * Keep-a-Changelog file reads too.
 *
 * Pure text in, files out. Everything about how the result LOOKS — grouping,
 * filters, the layout — belongs to the type's layout rather than here.
 */
import type {
  DuxtSectionContext,
  DuxtSectionPage,
  DuxtSectionType
} from './sections-resolve';
import { slugify } from './sources-resolve';

/** A heading, at any level. */
const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*$/;

/** A fence opening or closing a code block, so a `#` inside one is text. */
const FENCE = /^\s*(```|~~~)/;

/** An inline link, reduced to the text it shows. */
const LINK = /\[([^\]]*)\]\([^)]*\)/g;

/** What is left of a release heading once its link is gone: version, date. */
const RELEASE = /^(v?\d[\w.+-]*)(?:[ \t]+\((\d{4}-\d{2}-\d{2})\))?$/;

interface Release {
  /** The version exactly as the changelog wrote it. */
  version: string;
  /** The release date, when the heading carried one. */
  date?: string;
  /** The lines under the heading, up to the next release. */
  body: string[];
}

export const changelogSectionType: DuxtSectionType = {
  parse: parseChangelog,
  /**
   * ONE GLOBAL HISTORY, read from the default version.
   *
   * A changelog is not a per-version document that happens to mention other
   * versions — it is the list OF the versions, and building one copy per
   * version would publish the same file under three URLs, each of them missing
   * the releases that came after it.
   */
  versioning: 'global',
  /**
   * The original, in every language.
   *
   * A release log is written once, by the release tool, in whatever language
   * the project commits in. A localised site therefore serves the original and
   * says so with the translation banner it already draws for an untranslated
   * page — which is the honest answer, and needs no new component.
   */
  localisation: 'original',
  icon: 'lucide:tag'
};

function parseChangelog(
  artefact: string,
  context: DuxtSectionContext
): DuxtSectionPage[] {
  const lines = artefact.split(/\r?\n/);
  const headings = headingsOf(lines);

  const starts = headings.filter((heading) => release(heading.text));
  const releases: Release[] = starts.map((heading, index) => {
    const parsed = release(heading.text)!;
    const end = starts[index + 1]?.line ?? lines.length;

    return {
      version: parsed.version,
      date: parsed.date,
      body: lines.slice(heading.line + 1, end)
    };
  });

  const preamble = lines.slice(0, starts[0]?.line ?? lines.length);

  // Zero-padded to the number of releases, so ten of them still sort the way
  // they read. Content strips the prefix from the URL, which is what makes an
  // ordering scheme affordable at all — see `DuxtSectionPage.file`.
  const width = String(releases.length).length;

  return [
    index(preamble, releases, context),
    ...releases.map((entry, position) =>
      page(entry, String(position + 1).padStart(width, '0'))
    )
  ];
}

/** Every heading outside a fenced code block, with the line it sits on. */
function headingsOf(
  lines: string[]
): { line: number; level: number; text: string }[] {
  const headings: { line: number; level: number; text: string }[] = [];
  let fence: string | undefined;

  lines.forEach((line, number) => {
    const fenced = FENCE.exec(line);

    if (fenced) {
      // A fence closes only on its own kind, so a ``` inside a ~~~ block is
      // content rather than the end of it.
      if (!fence) fence = fenced[1];
      else if (fence === fenced[1]) fence = undefined;
      return;
    }

    if (fence) return;

    const match = HEADING.exec(line);
    if (match) {
      headings.push({
        line: number,
        level: match[1]!.length,
        text: match[2]!
      });
    }
  });

  return headings;
}

/** Is this heading a release, and which one? */
function release(text: string): { version: string; date?: string } | undefined {
  const match = RELEASE.exec(text.replace(LINK, '$1').trim());
  if (!match) return undefined;

  return { version: match[1]!, date: match[2] };
}

/**
 * The section's own page, at the prefix the navbar entry points at.
 *
 * Its body is whatever the changelog says before its first release — the
 * preamble release-please leaves at the top — followed by the releases as
 * links, so the section is navigable before anything renders it specially.
 */
function index(
  preamble: string[],
  releases: Release[],
  context: DuxtSectionContext
): DuxtSectionPage {
  const body = trim(
    preamble
      // The file's own title. The page draws its heading from `title`, and a
      // second h1 in the body is both a duplicate and an axe finding.
      .filter((line) => !/^#[ \t]/.test(line))
      .join('\n')
      .split('\n')
  );

  const list = releases.map(
    (entry) =>
      `- [${entry.version}](${context.prefix}/${segment(entry.version)})` +
      (entry.date ? ` — ${entry.date}` : '')
  );

  return {
    file: 'index.md',
    body: [
      frontmatter({ title: context.label }),
      '',
      ...(body.length ? [...body, ''] : []),
      ...list
    ].join('\n')
  };
}

function page(entry: Release, order: string): DuxtSectionPage {
  return {
    file: `${order}.${segment(entry.version)}.md`,
    body: [
      frontmatter({ title: entry.version, date: entry.date }),
      '',
      ...promote(trim(entry.body))
    ].join('\n')
  };
}

/**
 * The URL segment one release is served at.
 *
 * A `v` is added to a bare number, and that is not decoration: Content reads a
 * file name made only of digits and dots as a version and stops refining it —
 * which would leave the `NN.` ordering prefix in the URL, so `01.0.2.0.md`
 * would serve `/releases/01.0.2.0`. With the `v` the prefix is stripped as it
 * is everywhere else in this repository, and the segment matches the tag the
 * release was cut as (`include-v-in-tag`).
 */
function segment(version: string): string {
  return slugify(/^\d/.test(version) ? `v${version}` : version);
}

/**
 * Every heading below the second level, one level up.
 *
 * A release body starts at `###` — release-please puts "Features" and "Bug
 * Fixes" there, under the `##` the release itself occupies. On a page of its
 * own that release is the `<h1>` the theme draws from `title`, so an `###`
 * under it skips a level: a broken outline for a screen reader, and an axe
 * `heading-order` failure on the built page.
 */
function promote(lines: string[]): string[] {
  let fence: string | undefined;

  return lines.map((line) => {
    const fenced = FENCE.exec(line);

    if (fenced) {
      if (!fence) fence = fenced[1];
      else if (fence === fenced[1]) fence = undefined;
      return line;
    }

    if (fence) return line;

    const match = HEADING.exec(line);
    if (!match || match[1]!.length < 3) return line;

    return `${'#'.repeat(match[1]!.length - 1)} ${match[2]}`;
  });
}

/** The lines with the blank ones at either end dropped. */
function trim(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;

  while (start < end && !lines[start]!.trim()) start += 1;
  while (end > start && !lines[end - 1]!.trim()) end -= 1;

  return lines.slice(start, end);
}

/**
 * A frontmatter block YAML can read back.
 *
 * Every value is written as a JSON string, which is also a YAML double-quoted
 * scalar — so a release title carrying a colon cannot end the mapping early,
 * which is the exact failure `tests/frontmatter-yaml.test.ts` exists over.
 */
function frontmatter(fields: Record<string, string | undefined>): string {
  return [
    '---',
    ...Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`),
    '---'
  ].join('\n');
}
