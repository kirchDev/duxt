/**
 * Which section-row entries belong to the part of the site the reader is in.
 *
 * `duxt.sections` is one flat list, and on a site with one source that is the
 * whole truth: every entry is a top-level part of the documentation. A site
 * with a SECOND source has two sets of top-level parts, and rendering the list
 * whole showed both everywhere — the demo API's own entries in the row above a
 * getting-started page, and the documentation's six above the demo API.
 *
 * So an entry belongs to the source whose prefix it lies under, and the row
 * shows the entries of the source the reader is in. A site that declares one
 * source has one area, every entry is inside it, and nothing changes.
 *
 * Pure, and beside the resolver's other prefix arithmetic for the same reason
 * that lives there: prefix work done inline in a component can only be checked
 * by clicking.
 */
import { isInside, sourceForPath, versionPath } from './version-paths';

/** The minimum a source has to carry to place a path or an entry. */
interface Area {
  prefix: string;
  repo?: string;
  version?: string;
  generated?: unknown;
}

/** The documentation source that owns an area, without a generated section. */
function documentationFor(source: Area | undefined, sources: Area[]) {
  if (!source?.generated) return source;

  const candidates = source.repo
    ? sources.filter(
        (other) =>
          !other.generated &&
          other.repo === source.repo &&
          (!source.version || other.version === source.version)
      )
    : sources.filter(
        (other) => !other.generated && isInside(source.prefix, other.prefix)
      );

  // A generated section belongs to the deepest documentation source it hangs
  // under. A global section has no version of its own, so its area is the
  // shallowest edition of that source instead.
  return candidates.sort((a, b) =>
    source.version || !source.repo
      ? b.prefix.length - a.prefix.length
      : a.prefix.length - b.prefix.length
  )[0];
}

/**
 * The version-neutral root of a documentation area.
 *
 * A tree published INSIDE another area's root belongs to that area: a provider
 * reference at `/demo/terraform` is a part of `/demo` in the same way the
 * generated reference beside it is, and treating it as an area of its own
 * would empty the row on its pages and hide its entry on every other one. The
 * root area `''` never adopts anything, or every source would be one area.
 */
function areaRoot(source: Area | undefined, sources: Area[]): string {
  const own = treeRoot(source, sources);
  if (!own) return own;

  const enclosing = sources
    .filter((other) => !other.generated)
    .map((other) => treeRoot(other, sources))
    .filter((root) => root && root !== own && isInside(own, root))
    .sort((a, b) => a.length - b.length)[0];

  return enclosing ?? own;
}

/**
 * The prefix a source WITHOUT a slug has before its version segment.
 *
 * Such a source carries no identity to group its editions by, so they used to
 * keep their own prefixes: `/v0.2.0` was an area apart from the root, and on a
 * site with a second area every section was filtered off the page — the row
 * vanished on every non-default edition of the documentation it belongs to.
 * The version segment is the one thing the editions of one source add to the
 * same base, so it is taken off again — but only where an edition without it
 * actually exists, so a prefix that merely ends like a version stays its own.
 */
function unversioned(source: Area, sources: Area[]): string {
  const segment = source.version ? `/${source.version}` : '';
  if (!segment || !source.prefix.endsWith(segment)) return source.prefix;

  const base = source.prefix.slice(0, -segment.length);

  return sources.some(
    (other) =>
      !other.generated &&
      !other.repo &&
      other.prefix === base &&
      other.version !== source.version
  )
    ? base
    : source.prefix;
}

/** The root of the one documentation tree a source belongs to. */
function treeRoot(source: Area | undefined, sources: Area[]): string {
  const documentation = documentationFor(source, sources);
  if (!documentation) return '';

  // A slug is the source identity and survives the version segment. All
  // versions of `/demo` are therefore one area, whose shallowest prefix is
  // the default edition.
  if (!documentation.repo) return unversioned(documentation, sources);

  return sources
    .filter((other) => !other.generated && other.repo === documentation.repo)
    .reduce(
      (root, other) =>
        other.prefix.length < root.prefix.length ? other : root,
      documentation
    ).prefix;
}

/**
 * The AREAS a site has — one per documentation tree, never per generated
 * section.
 *
 * A reference at `/demo/api` is not a part of the site beside `/demo`; it is
 * something published under it, and its own entry is what the row offers. Were
 * its prefix an area of its own, an operation page would look like a third part
 * of the site and the row would empty out on it.
 */
const areas = (sources: Area[]): string[] => [
  ...new Set(
    sources
      .filter((source) => !source.generated)
      .map((source) => areaRoot(source, sources))
  )
];

/**
 * The area a path is in — the longest documentation prefix it sits under.
 *
 * `''` for a site whose sources are all unprefixed, which is every site that
 * never asked for any of this.
 */
export function areaForPath(path: string, sources: Area[]): string {
  return areaRoot(sourceForPath(path, sources), sources);
}

/**
 * Whether two sources are editions of one documentation tree: the same slug
 * where they carry one, the same unversioned root where they do not. Two
 * slug-less sources are NOT one tree merely for both lacking a slug.
 */
function sameTree(a: Area, b: Area, sources: Area[]): boolean {
  if (a.repo || b.repo) return a.repo === b.repo;

  return unversioned(a, sources) === unversioned(b, sources);
}

/**
 * The entries of one area, in the order the site declared them.
 *
 * An entry with no `to` cannot be placed and is kept in every area: it is a
 * link the consumer wrote for a reason the layer cannot read, and dropping it
 * would make it disappear from a site that gained a second source.
 */
export function sectionsForPath<T extends { to?: string }>(
  sections: T[],
  sources: Area[],
  path: string
): T[] {
  const area = areaForPath(path, sources);
  const all = areas(sources);

  // Only when the site HAS two areas does the filter change the membership.
  // Even one area's hand-written entries may need their URL moved to the
  // reader's version, so do not return before that mapping below.
  const scoped =
    all.length < 2
      ? sections
      : sections.filter(
          (section) => !section.to || areaForPath(section.to, sources) === area
        );

  const reader = documentationFor(sourceForPath(path, sources), sources);
  if (!reader?.version) return scoped;

  return scoped.map((section) => {
    const target = section.to ? sourceForPath(section.to, sources) : undefined;

    // A consumer declares the overview once, at the default edition. It is a
    // part of every version of the same documentation source, so move it to
    // the reader's edition. Generated sections already resolve their own
    // per-version destination, and global generated sections must stay global.
    if (
      target &&
      !target.generated &&
      sameTree(target, reader, sources) &&
      target.version !== reader.version
    ) {
      return {
        ...section,
        to: versionPath(section.to!, target.prefix, reader.prefix)
      } as T;
    }

    return section;
  });
}

/**
 * WHICH ONE of an area's entries is the one being read.
 *
 * A row of siblings answers this by itself — `/guides` and `/reference` cannot
 * both prefix a path. An area whose parts nest can: `/demo/api` is inside
 * `/demo`, so marking every entry that prefixes the path lit two chips at once
 * and told the reader they were in both places.
 *
 * The longest match wins, which is the rule `sourceForPath` and `useDuxtSection`
 * already follow — the deepest thing that claims the page is the thing the page
 * is in.
 */
export function currentSection<T extends { to?: string }>(
  sections: T[],
  path: string
): T | undefined {
  return sections
    .filter((section) => section.to && isInside(path, section.to))
    .sort((a, b) => (b.to?.length ?? 0) - (a.to?.length ?? 0))[0];
}
