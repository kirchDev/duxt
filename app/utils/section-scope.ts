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

/** The version-neutral root of a documentation area. */
function areaRoot(source: Area | undefined, sources: Area[]): string {
  const documentation = documentationFor(source, sources);
  if (!documentation) return '';

  // A slug is the source identity and survives the version segment. All
  // versions of `/demo` are therefore one area, whose shallowest prefix is
  // the default edition. Sources without an identity retain their own prefix.
  if (!documentation.repo) return documentation.prefix;

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
      target.repo === reader.repo &&
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
