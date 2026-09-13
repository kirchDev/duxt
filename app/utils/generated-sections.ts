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
 * somewhere else in the row simply writes it there. "Listed by hand" is asked
 * of the SECTION rather than of one URL: the consumer wrote the entry at the
 * position they were reading, and a `per-version` section is at a different URL
 * on every other version — so the per-URL question answered no there and
 * appended a second entry with the same label.
 *
 * ONE DECLARATION IS ONE ENTRY, whatever it resolved to. A section is a
 * collection per version and per locale, so `per-version` and `per-locale`
 * reach here as several manifest entries for the same declared section — and
 * the row is "the top-level parts of the documentation", not a list of the
 * versions of one. So the entry is resolved against the section the reader is
 * currently in, exactly as `DuxtVersion` and `useDuxtVersion` resolve theirs,
 * with a de-dupe by `to` underneath it: two entries pointing at one URL are one
 * link twice, and under `DuxtHeader`'s label key, one Vue key twice.
 *
 * Which entries are one declaration is READ OFF THE MANIFEST, never guessed —
 * see `DuxtGeneratedMeta.declaration` for what guessing it cost.
 */
export function withGeneratedSections(
  config: DuxtConfig,
  path = '/'
): DuxtConfig {
  const sources = config.resolvedSources ?? [];
  const declarations = declarationsIn(sources);

  if (!declarations.length) return config;

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
    const listed: DuxtResolvedSource[][] = [];

    for (const declaration of declarations) {
      const meta = declaration[0]!.generated!;
      if (meta.navigation !== placement) continue;

      // ANY position of this declaration counts as already in the row, not just
      // the one this reader would be given: a section listed by hand is listed,
      // and the entry `to` resolves to is always one of these prefixes, so this
      // is the de-dupe by URL as well.
      if (declaration.some((entry) => taken.has(entry.prefix))) {
        listed.push(declaration);
        continue;
      }

      const to = entryPath(declaration, base);

      taken.add(to);
      entries.push({ label: meta.label, to, icon: meta.icon });
    }

    return { entries, moved: followReader(existing, listed, base) };
  };

  const navigation = entriesFor('navigation', config.navigation ?? []);
  const sections = entriesFor('sections', config.sections ?? []);

  if (
    !navigation.entries.length &&
    !sections.entries.length &&
    !navigation.moved &&
    !sections.moved
  )
    return config;

  return {
    ...config,
    // Only the row that gains or moves something is rewritten: an empty array
    // where the config had `undefined` is a different value, and the header
    // reads both.
    ...(navigation.entries.length || navigation.moved
      ? {
          navigation: [
            ...(navigation.moved ?? config.navigation ?? []),
            ...navigation.entries
          ]
        }
      : {}),
    ...(sections.entries.length || sections.moved
      ? {
          sections: [
            ...(sections.moved ?? config.sections ?? []),
            ...sections.entries
          ]
        }
      : {})
  };
}

/**
 * A section listed by hand keeps its POSITION, and its URL follows the reader.
 *
 * Placing an entry by hand is how a consumer orders the row, and a `per-version`
 * section written at the default version's URL would otherwise send a reader on
 * `v2.x` to `v3.x` the moment they clicked it. So an entry whose `to` is one of
 * the declaration's own prefixes is pointed at the edition the reader is on —
 * the same answer the appended entry gets. An entry pointing anywhere else
 * inside the section is a page the consumer chose, and stays where it points.
 *
 * `undefined` when nothing moved, so an untouched row keeps its identity.
 */
function followReader(
  existing: DuxtLink[],
  listed: DuxtResolvedSource[][],
  base: string
): DuxtLink[] | undefined {
  let changed = false;

  const moved = existing.map((entry) => {
    const declaration = listed.find((candidate) =>
      candidate.some((source) => source.prefix === entry.to)
    );
    if (!declaration) return entry;

    const to = entryPath(declaration, base);
    if (to === entry.to) return entry;

    changed = true;
    return { ...entry, to };
  });

  return changed ? moved : undefined;
}

/**
 * The manifest's generated entries, grouped into the declarations that made
 * them, in the order the site declared them.
 *
 * A `Map` rather than a sort: the manifest already lists a declaration's
 * entries together, and the grouping has to survive it not doing so.
 */
function declarationsIn(sources: DuxtResolvedSource[]): DuxtResolvedSource[][] {
  const groups = new Map<number, DuxtResolvedSource[]>();

  for (const source of sources) {
    if (!source.generated) continue;

    const group = groups.get(source.generated.declaration);
    if (group) group.push(source);
    else groups.set(source.generated.declaration, [source]);
  }

  return [...groups.values()];
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
 * The entries handed in ARE the declaration — its versions and its languages,
 * as the manifest recorded them. The reader's own base picks one of them.
 */
function entryPath(declaration: DuxtResolvedSource[], base: string): string {
  const here = `${base}/${declaration[0]!.generated!.slug}`;

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
 * unrelated ways to escape the docs layout. A type that names none renders in
 * the ordinary docs layout, and the lookup answers `undefined`.
 *
 * Filtered to the sections that name a layout before the prefix match, so a
 * site whose types all render in the docs layout does no work at all.
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
