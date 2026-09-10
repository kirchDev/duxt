/**
 * The checks themselves, over data rather than over a build.
 *
 * Split from `modules/validate.ts` for the reason `sources-resolve.ts` is split
 * from `sources.ts`: the module half imports `node:url`, `@nuxt/schema` and the
 * jiti-backed config reader, none of which belong in a bundle. This half is
 * plain data in, findings out — so a test can run it, and so the devtools panel
 * can run the SAME checks against the pages the site is actually serving,
 * rather than reprinting a build log that has already scrolled away.
 */
import { reservedSegments } from './sources-resolve';
import { packageCommandIssues } from './app/utils/package-command';

export interface PageRecord {
  collection: string;
  path: string;
  file: string;
  title?: string;
  description?: string;
  anchors: Set<string>;
  links: { href: string }[];
  /**
   * When the file last changed, as `git-meta` read it off the history.
   *
   * Absent for a source that did not ask for its history, and for one whose
   * clone could not be deepened — which is why the staleness half of the
   * translation report is skipped rather than guessed when it is missing.
   */
  lastUpdated?: string;
  /**
   * The `command` of every `::package-managers` block on the page.
   *
   * Read off the parsed body rather than the source, because that is where the
   * prop has already been resolved — see `walk`.
   */
  commands?: string[];
}

/** The manifest, as much of it as the checks read. */
export interface SourceRecord {
  collection: string;
  prefix: string;
  locale?: string;
  isDefaultLocale?: boolean;
  /** The artefact a generated section was read from, for its findings. */
  path?: string;
  /** Where that artefact lives, for a finding that has to name it. */
  repository?: string;
  repositoryUrl?: string;
  ref?: string;
  /**
   * Set when this collection is a GENERATED SECTION rather than a docs tree.
   *
   * Checked DIFFERENTLY rather than skipped. An empty section is a finding
   * about the artefact and not about a docs folder, so it is worded and graded
   * from `report` instead of from the collection rule; a page split out of a
   * changelog has no field a `description` could come from, so it is not asked
   * for one; and what the type could not read is a finding no other check could
   * ever have produced.
   */
  generated?: GeneratedRecord;
}

/** What a generated section carries into the checks. */
export interface GeneratedRecord {
  type: string;
  label: string;
  remote?: boolean;
  report?: {
    pages: number;
    warnings: string[];
    missing?: boolean;
  };
}

/** What one pass over a parsed MDC body picks up. */
export interface Collected {
  anchors: Set<string>;
  links: { href: string }[];
  commands: string[];
}

/**
 * Collect anchor ids, internal links and command blocks out of a parsed MDC
 * body.
 *
 * ONE ACCUMULATOR rather than a parameter per kind: the third thing to collect
 * is the point at which a positional list stops reading as a signature and
 * starts reading as an argument order to get wrong.
 */
export function walk(node: unknown, into: Collected): void {
  if (Array.isArray(node)) {
    const [tag, props] = node as [unknown, Record<string, unknown> | undefined];

    if (typeof tag === 'string' && props && typeof props === 'object') {
      if (typeof props.id === 'string') into.anchors.add(props.id);

      if (tag === 'a' && typeof props.href === 'string') {
        into.links.push({ href: props.href });
      }

      if (tag === 'package-managers' && typeof props.command === 'string') {
        into.commands.push(props.command);
      }
    }

    for (const child of node) walk(child, into);
    return;
  }

  if (node && typeof node === 'object') {
    for (const value of Object.values(node as Record<string, unknown>)) {
      walk(value, into);
    }
  }
}

export function report(
  sources: SourceRecord[],
  pages: PageRecord[]
): { errors: string[]; warnings: string[]; notes: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const byCollection = new Map<string, PageRecord[]>();
  for (const page of pages) {
    const list = byCollection.get(page.collection) ?? [];
    list.push(page);
    byCollection.set(page.collection, list);
  }

  // 1. A collection with nothing in it. The symptom is an empty sidebar and a
  //    404 on every page of one version — never a message.
  //
  //    A GENERATED SECTION answers the same question from its own artefact, at
  //    its own severity and in its own words — see `sectionFindings`. It used
  //    to be skipped here and reported by a `console.warn` where the file is
  //    read, which put half of this layer's findings in a channel that has
  //    scrolled away by the time anyone looks at the other half.
  for (const source of sources) {
    if (source.generated) {
      warnings.push(
        ...sectionFindings(source, byCollection.get(source.collection)?.length)
      );
      continue;
    }

    if (!byCollection.get(source.collection)?.length) {
      errors.push(
        `collection "${source.collection}" (serving "${source.prefix || '/'}") ` +
          "contains no pages. Check the source's `path` and `refs`."
      );
    }
  }

  // 2. A docs folder named like a repository or a version segment. The prefix
  //    wins, so the folder is simply unreachable.
  const reserved = reservedSegments(sources as never);

  for (const source of sources) {
    const claimed = reserved.get(source.collection);
    if (!claimed?.size) continue;

    for (const page of byCollection.get(source.collection) ?? []) {
      const rest = source.prefix
        ? page.path.slice(source.prefix.length)
        : page.path;
      const segment = rest.split('/')[1];

      if (segment && claimed.has(segment)) {
        errors.push(
          `"${page.file}" sits in a folder called "${segment}", which is ` +
            `already a repository or version segment under "${source.prefix || '/'}". ` +
            'Rename the folder, or give the source a `slug`.'
        );
      }
    }
  }

  // 3. Frontmatter. Neither field breaks a page; both quietly degrade the
  //    table of contents, the OG image and llms.txt.
  //
  //    A generated page is asked for a title and not for a description: the
  //    title is the type's to produce and a missing one is a bug in the parser,
  //    where a description would have to be invented — a changelog entry has no
  //    field that could carry one.
  const isGenerated = new Set(
    sources.filter((source) => source.generated).map((s) => s.collection)
  );

  for (const page of pages) {
    const missing = [
      !page.title && 'title',
      !page.description && !isGenerated.has(page.collection) && 'description'
    ].filter(Boolean);

    if (missing.length) {
      warnings.push(`"${page.file}" has no ${missing.join(' and no ')}.`);
    }
  }

  // 4. Links. Internal ones only — an external URL is not this build's to
  //    verify, and checking it would put the network in the build.
  //
  //    Resolved exactly as `ProseA` resolves them at render time: an absolute
  //    path written in a page is relative to that page's OWN source, so it is
  //    tried under the source's prefix first and bare second. Checking only the
  //    bare form reports every correct link on a prefixed site.
  //
  //    PER LANGUAGE, and that is not a refinement. Every language of one source
  //    serves IDENTICAL content paths — the locale lives in front of the URL,
  //    not in the content tree — so a map keyed by path alone holds one page per
  //    path and whichever language was parsed last wins. Anchors are derived
  //    from heading TEXT, so that map would check a German link against English
  //    headings and report every correct anchor on a translated site. A link is
  //    therefore resolved in the linking page's OWN collection first, and in the
  //    untranslated original second — which is where the site itself falls back
  //    when a language does not carry the page.
  const known = new Map<string, PageRecord[]>();
  for (const page of pages) {
    const list = known.get(page.path) ?? [];
    list.push(page);
    known.set(page.path, list);
  }

  const prefixOf = new Map(
    sources.map((source) => [source.collection, source.prefix])
  );
  const originals = new Set(
    sources
      .filter((source) => !source.locale || source.isDefaultLocale)
      .map((source) => source.collection)
  );

  const resolve = (path: string, from: PageRecord) => {
    const candidates = known.get(stripTrailingSlash(path));
    if (!candidates) return undefined;

    return (
      candidates.find((page) => page.collection === from.collection) ??
      candidates.find((page) => originals.has(page.collection)) ??
      candidates[0]
    );
  };

  /** A percent-encoded fragment, or the fragment itself where it is not one. */
  const decodeAnchor = (fragment: string) => {
    try {
      return decodeURIComponent(fragment);
    } catch {
      // A stray `%` is a link nobody can follow either way, and the anchor
      // check is not the place to say so.
      return fragment;
    }
  };

  for (const page of pages) {
    const prefix = prefixOf.get(page.collection) ?? '';

    for (const link of page.links) {
      const { href } = link;
      if (!href.startsWith('/') && !href.startsWith('#')) continue;

      const [target, fragment] = href.split('#');

      // DECODED, because the two halves are written in different alphabets. A
      // heading's id is the text as it stands — `icônes` — while the link
      // arrives percent-encoded, so comparing them as written reported every
      // accented anchor on the site as missing and told the author to point at
      // a heading that was already there.
      const anchor = fragment && decodeAnchor(fragment);
      const destination = target
        ? (resolve(`${prefix}${target}`, page) ?? resolve(target, page))
        : page;

      if (target && !destination) {
        warnings.push(
          `"${page.file}" links to "${href}", which no page serves.`
        );
        continue;
      }

      if (anchor && destination && !destination.anchors.has(anchor)) {
        warnings.push(
          `"${page.file}" links to "${href}", but that page has no "${anchor}" heading.`
        );
      }
    }
  }

  commandWarnings(pages, warnings);

  return { errors, warnings, notes: translationNotes(sources, byCollection) };
}

/**
 * What a `::package-managers` block asks for that a manager cannot say.
 *
 * NEITHER FAULT FAILS ANYTHING, and both are otherwise invisible. A manager with
 * no equivalent silently loses its tab, so a page written as
 * `command="outdated"` shows three tabs where the site offers four and nothing
 * anywhere says why. An unknown verb is printed as written for all four, which is
 * usually right and occasionally a typo — `outdatd` renders four plausible
 * commands that none of them accept.
 *
 * Warnings rather than errors, because both are legitimate: a command only three
 * managers have is a fine thing to document, and this table will always be behind
 * some manager's newest subcommand.
 */
function commandWarnings(pages: PageRecord[], warnings: string[]): void {
  for (const page of pages) {
    for (const command of page.commands ?? []) {
      const { unknownVerb, unavailable } = packageCommandIssues(command);

      if (unknownVerb) {
        warnings.push(
          `"${page.file}": "${command}" starts with "${unknownVerb}", which duxt ` +
            'does not translate — every manager shows it as written.'
        );
      }

      if (unavailable.length) {
        warnings.push(
          `"${page.file}": "${command}" has no equivalent in ` +
            `${unavailable.join(' and ')}, so that tab is not drawn.`
        );
      }
    }
  }
}

const stripTrailingSlash = (path: string) =>
  path.length > 1 ? path.replace(/\/+$/, '') : path;

/** The repository and ref an artefact was looked for in. */
const sectionOrigin = (source: SourceRecord) =>
  `${source.repository ?? source.repositoryUrl ?? 'the source'}${
    source.ref ? `@${source.ref}` : ''
  }`;

/**
 * What reading one generated section's artefact had to say.
 *
 * WARNINGS, all of them, and the severity is not a compromise. Everything a
 * local artefact can get wrong — a path that is not there, a file the type
 * cannot read at all, an option it does not know — has already thrown while the
 * config was loading, long before this report exists: the site's own
 * configuration is a mistake the build must not carry. What is left to report
 * here is therefore either a REMOTE artefact, which may legitimately have gone
 * stale between releases and is not this build's to reject, or a page that
 * rendered with something missing from it. Neither is an error.
 *
 * `report` absent is not "nothing to report" — it is "nobody read the artefact
 * on this side". A remote one is read where Content put the checkout, which is
 * a directory only the config loader knows, so the manifest a module holds
 * carries no report for it at all. The page count answers for that case, and
 * says less because less is known: a section serving nothing is still visible
 * from the collection, only the reason for it is not.
 */
function sectionFindings(
  source: SourceRecord,
  pages: number | undefined
): string[] {
  const meta = source.generated!;
  const report = meta.report;
  const where = `the generated section "${meta.label}"`;
  const findings: string[] = [];

  // Quoted only where the file is actually in this checkout. The Checks panel
  // turns the first quoted `.md` in a finding into an editor link, and a remote
  // `CHANGELOG.md` resolved against the local root is a link to nothing.
  const artefact = meta.remote ? source.path : `"${source.path}"`;

  if (report?.missing) {
    findings.push(
      `${where} declares ${artefact}, which ${sectionOrigin(source)} does not ` +
        'have. The section is not built.'
    );
  } else if (report && !report.pages) {
    findings.push(
      `${where} holds nothing the "${meta.type}" type can read in ` +
        `${artefact}, so it has no pages.`
    );
  } else if (!pages) {
    findings.push(
      report
        ? `${where} produced ${report.pages} pages out of ${artefact}, but the ` +
            `collection "${source.collection}" serves none — Content dropped it.`
        : `${where} produced no pages out of ${artefact} in ` +
            `${sectionOrigin(source)}. Either the artefact is not there at that ` +
            `ref, or it holds nothing the "${meta.type}" type can read.`
    );
  }

  // Prefixed with the section, never with a page: a generated page's name is
  // this layer's own invention, so pointing at one would send a reader to a
  // file that does not exist. The artefact is the thing to open.
  for (const warning of report?.warnings ?? []) {
    findings.push(`${where} (${artefact}): ${warning}`);
  }

  return findings;
}

/**
 * What each language carries, and what has stood still.
 *
 * Notes rather than warnings: an untranslated page is not a defect, it is a
 * state — and one nothing else in this layer ever says out loud. The layer
 * knows, per page, which languages carry it and when each file last changed;
 * without a report that knowledge sits in the manifest and reaches nobody.
 *
 * OpenCode is the cautionary case, and the reason this is a build report rather
 * than a dashboard: seventeen languages, an agent that kept them in sync, the
 * workflow switched off, and nothing anywhere saying the translations had
 * stopped moving. A line per language in every build is what makes that
 * visible on the day it happens instead of a year later.
 *
 * Two findings, and the second is skipped rather than guessed when the data is
 * missing: a page the original has and a translation does not, and a
 * translation whose file has not moved since the original's did. `lastUpdated`
 * comes from `git-meta`, which a source without `history: true` never gets.
 */
function translationNotes(
  sources: SourceRecord[],
  byCollection: Map<string, PageRecord[]>
): string[] {
  const notes: string[] = [];

  // Grouped by PREFIX, because that is what a translation shares with its
  // original — the locale is never part of a content path.
  const byPrefix = new Map<string, SourceRecord[]>();
  for (const source of sources) {
    const list = byPrefix.get(source.prefix) ?? [];
    list.push(source);
    byPrefix.set(source.prefix, list);
  }

  for (const [prefix, group] of byPrefix) {
    const original = group.find(
      (source) => !source.locale || source.isDefaultLocale
    );
    const translations = group.filter((source) => source !== original);

    if (!original || !translations.length) continue;

    const base = byCollection.get(original.collection) ?? [];
    const dates = new Map(
      base.map((page) => [page.path, page.lastUpdated] as const)
    );

    for (const translation of translations) {
      const pages = byCollection.get(translation.collection) ?? [];
      const have = new Map(pages.map((page) => [page.path, page] as const));

      const missing = base.filter((page) => !have.has(page.path));

      const stale = pages.filter((page) => {
        const source = dates.get(page.path);
        return (
          source &&
          page.lastUpdated &&
          Date.parse(page.lastUpdated) < Date.parse(source)
        );
      });

      const where = prefix ? ` under "${prefix}"` : '';

      notes.push(
        `${translation.locale}${where}: ${have.size}/${base.length} pages` +
          (stale.length ? `, ${stale.length} behind the original` : '')
      );

      // Named, not just counted — a figure says a translation has drifted and
      // a file name says where to start. Capped, because a language nobody has
      // begun would otherwise print the whole tree.
      for (const page of [...missing, ...stale].slice(0, NAMED)) {
        notes.push(
          missing.includes(page)
            ? `  "${page.file}" has no ${translation.locale} translation.`
            : `  "${page.file}" has not moved since the original changed.`
        );
      }

      const rest = missing.length + stale.length - NAMED;
      if (rest > 0) notes.push(`  … and ${rest} more.`);
    }
  }

  return notes;
}

/** How many files a language names before the report starts counting instead. */
const NAMED = 10;
