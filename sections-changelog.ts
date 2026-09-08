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
 * TWO GRANULARITIES, and `split` is the default. Split turns each release into
 * a page of its own — a deep link, a search hit, a feed item and an `llms.txt`
 * entry per release — under a generated overview; `flat` renders the file as
 * the one page it was written as, for a project that just wants it shown. The
 * cost of two rendering paths was weighed and accepted, and the difference runs
 * further than the page count: a flat changelog is an ORDINARY docs page and
 * keeps the docs chrome, which is why `layout` is answered per declaration.
 *
 * Pure text in, files out. What the split history LOOKS like — the timeline,
 * the group badges, the filters — belongs to `layouts/changelog.vue` and the
 * two components this file writes calls to.
 */
import { stringify as stringifyYaml } from 'yaml';
import type {
  DuxtSectionContext,
  DuxtSectionOptions,
  DuxtSectionPage,
  DuxtSectionType
} from './sections-resolve';
import { slugify } from './sources-resolve';

/**
 * The names this type binds — PUBLIC SURFACE, so renaming one is a `feat!:`.
 *
 * A layout and two MDC components, because that is the whole of what a
 * consumer can override: dropping a `ChangelogGroup.vue` of their own into
 * `app/components/content/` replaces the layer's, exactly as it does for a
 * callout, and a `layouts/changelog.vue` replaces the chrome around it.
 */
export const DUXT_CHANGELOG_LAYOUT = 'changelog';
export const DUXT_CHANGELOG_RELEASES = 'changelog-releases';
export const DUXT_CHANGELOG_GROUP = 'changelog-group';

/** A heading, at any level. */
const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*$/;

/** A fence opening or closing a code block, so a `#` inside one is text. */
const FENCE = /^\s*(```|~~~)/;

/** An inline link, reduced to the text it shows. */
const LINK = /\[([^\]]*)\]\([^)]*\)/g;

/** What is left of a release heading once its link is gone: version, date. */
const RELEASE = /^(v?\d[\w.+-]*)(?:[ \t]+\((\d{4}-\d{2}-\d{2})\))?$/;

/** A list item at the top level of a group — one entry of the release. */
const ENTRY = /^(?:[-*+]|\d+[.)])[ \t]+\S/;

/** How the file is turned into pages. */
const GRANULARITIES = ['split', 'flat'] as const;

/**
 * The options this type reads, and the whole of what it answers to.
 *
 * Named rather than ignored, for the same reason an unknown VALUE is: a
 * misspelled `granularty: 'flat'` is one character from the key that works, the
 * site silently gets the default instead of what it configured, and nothing
 * downstream ever mentions it again. `options` is opaque to the scaffold on
 * purpose — `DuxtGeneratedSection.options` carries the bag rather than reading
 * it — so the type that reads a key is the only place left that can say a key
 * is not one it knows.
 */
const OPTIONS = ['granularity'] as const;

type Granularity = (typeof GRANULARITIES)[number];

interface Release {
  /** The version exactly as the changelog wrote it. */
  version: string;
  /** The release date, when the heading carried one. */
  date?: string;
  /** The lines under the heading, up to the next release. */
  body: string[];
}

/** One `###` block of a release, named by its own heading. */
interface Group {
  /** The heading, VERBATIM — see `groupsOf`. */
  name: string;
  /** How many entries it lists, for the badge on the overview. */
  count: number;
  /** The lines under it. */
  lines: string[];
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
  /**
   * A layout of its own for the split history, and none for the flat file.
   *
   * The split history is a timeline: the releases in the sidebar, a page per
   * release, no table of contents over four bullet points. The flat file is a
   * long ordinary page, and the docs chrome is exactly what it wants — a
   * contents column listing the releases most of all. Same type, two products,
   * so the question is answered from the declaration's own options.
   */
  layout: (options) =>
    granularityOf(options) === 'split' ? DUXT_CHANGELOG_LAYOUT : undefined,
  icon: 'lucide:tag'
};

/**
 * The granularity this declaration asked for, and the declaration checked.
 *
 * Named rather than ignored, for the reason an unknown type is: a misspelled
 * `granularity: 'splitt'` that silently means `split` is a site quietly not
 * getting what it configured, and this build is the last place that can say so.
 * A misspelled KEY is that same failure one character away, and is named in the
 * same words — see `OPTIONS`.
 */
function granularityOf(options: DuxtSectionOptions): Granularity {
  // Here rather than beside the caller because this is the ONE place the type
  // reads its options at all: both the layout question and the parser come
  // through it, so a section that is never built still names the typo.
  const unknown = Object.keys(options).find(
    (key) => !OPTIONS.includes(key as (typeof OPTIONS)[number])
  );

  if (unknown) {
    throw new Error(
      `duxt: a changelog section names the option "${unknown}", which is not ` +
        `one of ${OPTIONS.map((name) => `"${name}"`).join(' or ')}.`
    );
  }

  const value = options.granularity ?? 'split';

  if (!GRANULARITIES.includes(value as Granularity)) {
    throw new Error(
      `duxt: a changelog section asks for the granularity ` +
        `"${String(value)}", which is not one of ` +
        `${GRANULARITIES.map((name) => `"${name}"`).join(' or ')}.`
    );
  }

  return value as Granularity;
}

function parseChangelog(
  artefact: string,
  context: DuxtSectionContext
): DuxtSectionPage[] {
  const lines = artefact.split(/\r?\n/);

  if (granularityOf(context.options) === 'flat') return [flat(lines, context)];

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

/**
 * The file as it stands, as one page.
 *
 * Nothing is rewritten but the title: the file's own `# Changelog` goes,
 * because the docs page draws its heading from `title` and a second `<h1>` in
 * the body is both a duplicate and an axe finding. Every release heading stays
 * exactly where the release tool put it — which is what "unchanged" has to
 * mean, or the mode is not the escape hatch it exists to be.
 */
function flat(lines: string[], context: DuxtSectionContext): DuxtSectionPage {
  return {
    file: 'index.md',
    body: [
      frontmatter({ title: context.label }),
      '',
      ...trim(withoutTitle(lines)),
      ''
    ].join('\n')
  };
}

/** Every heading outside a fenced code block, with the line it sits on. */
function headingsOf(
  lines: string[]
): { line: number; level: number; text: string }[] {
  const headings: { line: number; level: number; text: string }[] = [];

  scan(lines, (line, number, fenced) => {
    if (fenced) return;

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

/**
 * Every line, with whether it sits inside a fenced block.
 *
 * One walk, three readers: the heading list, the entry count and the promotion
 * pass all have to agree about what is code and what is content, and three
 * copies of the fence rule is three places for them to stop agreeing. A fence
 * closes only on its own kind, so a ``` inside a ~~~ block is content rather
 * than the end of it.
 */
function scan(
  lines: string[],
  visit: (line: string, number: number, fenced: boolean) => void
): void {
  let fence: string | undefined;

  lines.forEach((line, number) => {
    const opened = FENCE.exec(line);

    if (opened) {
      if (!fence) fence = opened[1];
      else if (fence === opened[1]) fence = undefined;

      visit(line, number, true);
      return;
    }

    visit(line, number, Boolean(fence));
  });
}

/** Is this heading a release, and which one? */
function release(text: string): { version: string; date?: string } | undefined {
  const match = RELEASE.exec(text.replace(LINK, '$1').trim());
  if (!match) return undefined;

  return { version: match[1]!, date: match[2] };
}

/**
 * A release body, split into the groups its own headings name.
 *
 * THE GROUPS ARE THE FILE'S HEADINGS, TAKEN VERBATIM. No fixed taxonomy and no
 * mapping: release-please writes "Features" and "Bug Fixes", changesets and
 * Keep a Changelog write their own, and every one of them writes them in the
 * language the project is kept in. A hard-wired list would fail silently on the
 * first heading it did not know — which is the failure mode this repository
 * least wants, and the reason the filters on the overview are built from
 * whatever came out of the file.
 *
 * The LEVEL comes off the body rather than being assumed: release-please writes
 * a patch release at `###` and its groups at `###` as well, so "the shallowest
 * heading in this release" is the only rule that reads both.
 */
function groupsOf(lines: string[]): { intro: string[]; groups: Group[] } {
  const headings = headingsOf(lines);
  if (!headings.length) return { intro: lines, groups: [] };

  const level = Math.min(...headings.map((heading) => heading.level));
  const starts = headings.filter((heading) => heading.level === level);

  return {
    intro: trim(lines.slice(0, starts[0]!.line)),
    groups: starts.map((heading, index) => {
      const end = starts[index + 1]?.line ?? lines.length;
      const body = trim(lines.slice(heading.line + 1, end));

      return {
        name: heading.text.trim(),
        count: entries(body),
        lines: body
      };
    })
  };
}

/** How many entries a group lists — its top-level list items. */
function entries(lines: string[]): number {
  let count = 0;

  scan(lines, (line, _number, fenced) => {
    if (!fenced && ENTRY.test(line)) count += 1;
  });

  return count;
}

/**
 * The section's own page: the preamble, then the releases as a timeline.
 *
 * The release LIST travels as props rather than as a Markdown list, the way
 * `sections-openapi.ts` hands its tags over: what the component needs is the
 * date and the groups beside each version, and a bullet list carrying that
 * would be a data structure spelled as prose. The entries themselves stay on
 * the release pages — repeating them here would put the whole changelog twice
 * into the search index, `llms-full.txt` and the feed.
 */
function index(
  preamble: string[],
  releases: Release[],
  context: DuxtSectionContext
): DuxtSectionPage {
  const body = trim(withoutTitle(preamble));

  const props = {
    releases: releases.map((entry) => ({
      version: entry.version,
      date: entry.date,
      to: `${context.prefix}/${segment(entry.version)}`,
      groups: groupsOf(trim(entry.body)).groups.map((group) => ({
        name: group.name,
        count: group.count
      }))
    }))
  };

  return {
    file: 'index.md',
    body: [
      frontmatter({ title: context.label }),
      '',
      // NO `<h1>` OF ITS OWN. The page draws the docs header — breadcrumb,
      // title, description, the copy control beside it — for exactly the
      // generated pages whose body opens on no heading, and a release history
      // is one: its pages have a title and a trail like any other page, and the
      // only reason they ever drew their own was that the layout drew none.
      ...(body.length ? [...body, ''] : []),
      ...(releases.length
        ? [component(DUXT_CHANGELOG_RELEASES, props), '']
        : [])
    ].join('\n')
  };
}

/** One release, as a page: the version as its heading, then its groups. */
function page(entry: Release, order: string): DuxtSectionPage {
  const { intro, groups } = groupsOf(trim(entry.body));

  return {
    file: `${order}.${segment(entry.version)}.md`,
    body: [
      frontmatter({ title: entry.version, date: entry.date }),
      '',
      // The version is the page's title, and the page draws it — see `index`.
      ...(intro.length ? [...promote(intro), ''] : []),
      ...groups.flatMap((group) => [
        // The entries stay MARKDOWN, in the component's slot: they are the
        // release, and what a reader searches for, what `llms-full.txt` carries
        // and what the copy button hands a model is prose either way. Only the
        // name and the count — which the badge and the filters need as data —
        // travel as props.
        component(
          DUXT_CHANGELOG_GROUP,
          { name: group.name, count: group.count },
          promote(group.lines).join('\n')
        ),
        ''
      ])
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
 * own that release is the `<h1>`, and the groups it was split into are the
 * `<h2>`s their component draws — so what was written under a group has to come
 * up one level too, or it skips one: a broken outline for a screen reader, and
 * an axe `heading-order` failure on the built page.
 */
function promote(lines: string[]): string[] {
  const promoted: string[] = [];

  scan(lines, (line, _number, fenced) => {
    const match = fenced ? undefined : HEADING.exec(line);

    promoted.push(
      match && match[1]!.length >= 3
        ? `${'#'.repeat(match[1]!.length - 1)} ${match[2]}`
        : line
    );
  });

  return promoted;
}

/**
 * The lines without the file's own title.
 *
 * A page draws its `<h1>` from `title`, so the `# Changelog` at the top of the
 * file is a second one — in the docs shell and in a layout of its own alike.
 *
 * THE FIRST ONE ONLY, and only ahead of the first release. Dropping every `#`
 * reads correctly on the file release-please writes, where there is exactly
 * one — and is silent content loss on a hand-kept changelog that puts its
 * releases at the top level: every release heading would go, and `flat`, the
 * mode that exists to render the file untouched, would print one unbroken run
 * of bullets with no release boundaries in it. `split` reads that same file
 * release by release, which is what makes the general rule an asymmetry rather
 * than a policy.
 */
function withoutTitle(lines: string[]): string[] {
  const title = titleOf(lines);
  if (title === undefined) return lines;

  return [...lines.slice(0, title), ...lines.slice(title + 1)];
}

/**
 * The line the file's own title sits on, where it has one.
 *
 * A heading is the title when it is the first `#` in the file and no release
 * came before it — a file that opens on a release has no title to take, and
 * `index()` reads the same rule scoped to the preamble it is handed, where
 * "before the first release" is the whole of what it holds. A heading inside a
 * fenced block is text, which `headingsOf` already settles.
 */
function titleOf(lines: string[]): number | undefined {
  for (const heading of headingsOf(lines)) {
    if (release(heading.text)) return undefined;
    if (heading.level === 1) return heading.line;
  }

  return undefined;
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
 * An MDC block component with YAML props and Markdown inside it.
 *
 * The fence LENGTH is computed rather than fixed, exactly as in
 * `sections-openapi.ts`: a release note containing a `::callout` would
 * otherwise close the component early and spill its props into the page.
 *
 * EVERY STRING IS QUOTED, and that is the same defence the frontmatter helper
 * below makes for the same reason one level up. A plain `2026-02-01` is a
 * timestamp under the schema the props are read back with, so an unquoted date
 * reaches the component as a `Date` and `<time :datetime>` prints the reader's
 * own timezone rather than the day the release was cut.
 */
function component(
  name: string,
  props: Record<string, unknown>,
  slot?: string
): string {
  const body = slot?.trim() ?? '';

  const longest = Math.max(
    2,
    ...body.split('\n').map((line) => /^\s*(:+)/.exec(line)?.[1]?.length ?? 0)
  );

  const fence = ':'.repeat(Math.max(3, longest + 1));

  return [
    `${fence}${name}`,
    '---',
    stringifyYaml(props, {
      defaultStringType: 'QUOTE_DOUBLE',
      defaultKeyType: 'PLAIN',
      lineWidth: 0
    }).trimEnd(),
    '---',
    ...(body ? [body] : []),
    fence
  ].join('\n');
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
