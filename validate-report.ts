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
}

/** The manifest, as much of it as the checks read. */
export interface SourceRecord {
  collection: string;
  prefix: string;
  locale?: string;
  isDefaultLocale?: boolean;
  /**
   * Set when this collection is a GENERATED SECTION rather than a docs tree.
   *
   * Two of the checks below mean something different for one: an empty section
   * is already reported where the artefact is read, with the severity the
   * source's kind asks for, and a page split out of a changelog has no field a
   * `description` could come from. Both are properties of the artefact rather
   * than defects in it.
   */
  generated?: unknown;
}

/** Collect anchor ids and internal links out of a parsed MDC body. */
export function walk(
  node: unknown,
  anchors: Set<string>,
  links: { href: string }[]
): void {
  if (Array.isArray(node)) {
    const [tag, props] = node as [unknown, Record<string, unknown> | undefined];

    if (typeof tag === 'string' && props && typeof props === 'object') {
      if (typeof props.id === 'string') anchors.add(props.id);

      if (tag === 'a' && typeof props.href === 'string') {
        links.push({ href: props.href });
      }
    }

    for (const child of node) walk(child, anchors, links);
    return;
  }

  if (node && typeof node === 'object') {
    for (const value of Object.values(node as Record<string, unknown>)) {
      walk(value, anchors, links);
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
  //    A generated section is exempt: `sections.ts` already reports an artefact
  //    that is missing or unreadable, and it does so at the severity the
  //    source's kind asks for — an error for a local file, a warning for a
  //    remote one that may legitimately not have existed at an older tag.
  //    Repeating it here as an error would overrule that decision.
  for (const source of sources) {
    if (source.generated) continue;

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

  for (const page of pages) {
    const prefix = prefixOf.get(page.collection) ?? '';

    for (const link of page.links) {
      const { href } = link;
      if (!href.startsWith('/') && !href.startsWith('#')) continue;

      const [target, anchor] = href.split('#');
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

  return { errors, warnings, notes: translationNotes(sources, byCollection) };
}

const stripTrailingSlash = (path: string) =>
  path.length > 1 ? path.replace(/\/+$/, '') : path;

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
