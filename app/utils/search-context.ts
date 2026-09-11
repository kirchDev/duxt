/**
 * What a Command-K row says about itself beyond its title.
 *
 * A title is an identity on a site with one source, one version and one
 * language. It is not one here: three `Harbour` entries under "Recently viewed"
 * were three different pages, and the palette gave the reader no way to tell
 * which was which. The same holds for a search hit — two versions of a page
 * carry the same heading, and the ranking that put them side by side is exactly
 * what makes them impossible to tell apart.
 *
 * So every row carries one compact line: `section · source/version · route`,
 * with the parts a site does not have left out. Built from what the page,
 * section and version models already know — there is no second index here, and
 * nothing about ranking changes.
 */
import { asText } from './duxt-text';
import { currentSection } from './section-scope';
import { sourceForPath } from './version-paths';

/** Between the parts. A middle dot, not a slash: the route holds slashes. */
const SEPARATOR = ' · ';

/** The minimum a section entry has to carry to be named. */
interface Labelled {
  label?: DuxtText;
  to?: string;
}

/** The minimum a source has to carry to place a route and name its edition. */
interface Edition {
  prefix: string;
  repo?: string;
  version?: string;
}

/**
 * The section a route belongs to.
 *
 * `currentSection`, not a `startsWith` of its own: the longest match wins and
 * the comparison is segment-aware, so `/harbour/api` is the API rather than the
 * documentation it hangs under, and `/guides-old` is not inside `/guides`.
 */
export function sectionLabelForPath(
  path: string,
  sections: readonly Labelled[]
): string | undefined {
  return asText(currentSection([...sections], path)?.label);
}

/** `section · source/version · route`, minus whatever the site has not got. */
export function searchContext(
  path: string,
  sections: readonly Labelled[],
  sources: readonly Edition[]
): string {
  const route = path.split('#')[0] ?? '';
  const source = sourceForPath(route, [...sources]);

  return [
    sectionLabelForPath(route, sections),
    [source?.repo, source?.version].filter(Boolean).join('/'),
    route
  ]
    .filter((part) => part && part.trim())
    .join(SEPARATOR);
}
