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
 */
export function withGeneratedSections(config: DuxtConfig): DuxtConfig {
  const generated = (config.resolvedSources ?? []).filter(
    (source) => source.generated
  );

  if (!generated.length) return config;

  const entriesFor = (
    placement: DuxtSectionPlacementInput,
    existing: DuxtLink[]
  ) => {
    const taken = new Set(existing.map((entry) => entry.to).filter(Boolean));

    return generated
      .filter(
        (source) =>
          source.generated!.navigation === placement &&
          !taken.has(source.prefix)
      )
      .map((source) => ({
        label: source.generated!.label,
        to: source.prefix,
        icon: source.generated!.icon
      }));
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
