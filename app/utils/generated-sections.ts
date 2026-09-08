/**
 * What the app does with a generated section.
 *
 * A section is an ordinary collection at a prefix of its own, so almost nothing
 * in the theme has to know it exists — the collection lookup, the search, the
 * breadcrumb and the navigation tree all work off the manifest and were not
 * touched. Two things do not follow from the collection, and they are here:
 * WHERE its navbar entry goes, and WHICH LAYOUT its pages render in.
 *
 * Pure, and beside the resolver's other path arithmetic for the same reason:
 * every version bug this layer has had came from prefix work done inline in a
 * component, where it could only be checked by clicking.
 */
// Named rather than auto-imported: a test runs this file outside Nuxt, where
// nothing fills the auto-imports in.
import { sourceForPath } from './version-paths';

/**
 * The config with each generated section's navbar entry in place.
 *
 * Appended here rather than written into `appConfig` by the build, and that is
 * not a detail: the generated template merges `appConfig` BEHIND every
 * `app.config.ts`, and `mergeDuxtConfig` replaces an array rather than
 * appending to it — so a consumer naming `sections` at all would have replaced
 * the entry the build had just added, and the section would be unreachable on
 * exactly the sites that configure the most.
 *
 * A section already listed by hand is left alone, so a consumer who wants it
 * somewhere else in the row simply writes it there.
 *
 * ONE DECLARATION IS ONE ENTRY, whatever it resolved to. A section is a
 * collection per version and per locale, so `per-version` and `per-locale`
 * reach here as several manifest entries for the same declared section — and
 * the row is "the top-level parts of the documentation", not a list of the
 * versions of one. So the entry is resolved against the section the reader is
 * currently in, exactly as `DuxtVersion` and `useDuxtVersion` resolve theirs,
 * with a de-dupe by `to` underneath it: two entries pointing at one URL are one
 * link twice, and under `DuxtHeader`'s label key, one Vue key twice.
 */
export function withGeneratedSections(
  config: DuxtConfig,
  path = '/'
): DuxtConfig {
  const sources = config.resolvedSources ?? [];
  const generated = sources.filter((source) => source.generated);

  if (!generated.length) return config;

  const base = readerBase(path, sources);

  const entriesFor = (
    placement: DuxtSectionPlacementInput,
    existing: DuxtLink[]
  ) => {
    // Seeded from what the consumer wrote and UPDATED as entries are added, so
    // the de-dupe holds among the generated entries as well as against the
    // hand-written ones. Building it once before the map was the bug: it
    // answered for the consumer's list only.
    const taken = new Set(existing.map((entry) => entry.to).filter(Boolean));
    const entries: DuxtLink[] = [];

    for (const source of generated) {
      if (source.generated!.navigation !== placement) continue;

      const to = entryPath(source, generated, base);
      if (taken.has(to)) continue;

      taken.add(to);
      entries.push({
        label: source.generated!.label,
        to,
        icon: source.generated!.icon
      });
    }

    return entries;
  };

  const navigation = entriesFor('navigation', config.navigation ?? []);
  const sections = entriesFor('sections', config.sections ?? []);

  if (!navigation.length && !sections.length) return config;

  return {
    ...config,
    // Only the row that gains something is rewritten: an empty array where the
    // config had `undefined` is a different value, and the header reads both.
    ...(navigation.length
      ? { navigation: [...(config.navigation ?? []), ...navigation] }
      : {}),
    ...(sections.length
      ? { sections: [...(config.sections ?? []), ...sections] }
      : {})
  };
}

/**
 * The prefix the reader's DOCUMENTATION sits at — their repository and their
 * version, with no section segment on the end.
 *
 * Inside a generated section the reader's version can only be read off that
 * section's own prefix, so its slug is taken back off. `/v1.x/releases` is a
 * reader on `v1.x`, and the row has to keep saying so.
 */
function readerBase(path: string, sources: DuxtResolvedSource[]): string {
  const current = sourceForPath(path, sources);
  if (!current) return '';

  const own = current.generated ? `/${current.generated.slug}` : '';

  return own && current.prefix.endsWith(own)
    ? current.prefix.slice(0, -own.length)
    : current.prefix;
}

/**
 * Where one declared section's navbar entry points, from where the reader is.
 *
 * The manifest entries of a single declaration are its versions and its
 * languages: same repository, same slug, prefixes that differ by a version
 * segment or not at all. The reader's own base picks one of them.
 */
function entryPath(
  source: DuxtResolvedSource,
  generated: DuxtResolvedSource[],
  base: string
): string {
  const slug = source.generated!.slug;
  const here = `${base}/${slug}`;
  const declaration = generated.filter(
    (other) => other.generated!.slug === slug && other.repo === source.repo
  );

  if (declaration.some((other) => other.prefix === here)) return here;

  // Nothing at the reader's version: a `global` section has one entry and no
  // version at all, and a version may simply have declared no artefact. The
  // entry nearest the root is the default version's — the resolver adds a
  // version segment for every version EXCEPT the one served without a prefix.
  return declaration.reduce((nearest, other) =>
    depth(other.prefix) < depth(nearest.prefix) ? other : nearest
  ).prefix;
}

/** How many segments deep a prefix is; `''` is the root and therefore zero. */
const depth = (prefix: string) => (prefix ? prefix.split('/').length - 1 : 0);

/**
 * The layout a route asks for, when it is inside a generated section.
 *
 * THE SHARED SLOT. Each type names its own layout and every type renders
 * through this one lookup, which is what stops two types inventing two
 * unrelated ways to escape the docs chrome. A type that names none renders in
 * the ordinary chrome, and the lookup answers `undefined`.
 *
 * Filtered to the sections that name a layout before the prefix match, so a
 * site whose types all render in the docs chrome does no work at all.
 */
export function generatedLayout(
  path: string,
  sources: DuxtResolvedSource[]
): string | undefined {
  const withLayout = sources.filter((source) => source.generated?.layout);
  if (!withLayout.length) return undefined;

  // Every entry here carries a prefix, so `sourceForPath` returns a genuine
  // match or nothing — it has no prefixless source to fall back to.
  return sourceForPath(path, withLayout)?.generated?.layout;
}
