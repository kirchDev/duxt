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
import { isInside, sourceForPath } from './version-paths';

/** The minimum a source has to carry to place a path or an entry. */
interface Area {
  prefix: string;
  generated?: unknown;
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
  ...new Set(sources.filter((source) => !source.generated).map((s) => s.prefix))
];

/**
 * The area a path is in — the longest documentation prefix it sits under.
 *
 * `''` for a site whose sources are all unprefixed, which is every site that
 * never asked for any of this.
 */
export function areaForPath(path: string, sources: Area[]): string {
  return (
    sourceForPath(
      path,
      areas(sources).map((prefix) => ({ prefix }))
    )?.prefix ?? ''
  );
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

  // Only when the site HAS two areas: with one, every entry is in it, and the
  // filter is a walk over the list for an answer that cannot change.
  if (all.length < 2) return sections;

  return sections.filter(
    (section) => !section.to || areaForPath(section.to, sources) === area
  );
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
