/**
 * Which versions the switcher may offer.
 *
 * Lifted out of `DuxtVersion` because two components need the answer and only
 * one of them draws the control: the mobile sheet renders a full-width select
 * where there is something to choose and a plain badge beside the brand where
 * there is not, and it has to know which before it decides where the version
 * goes at all.
 *
 * Pure, and beside the resolver's other path arithmetic for the same reason the
 * rest of it is: every version bug this layer has had came from prefix work
 * done inline in a component, where it could only be checked by clicking.
 */
import { compareVersionTags } from '../../sources-resolve';

/**
 * What a reader needs to see first: work that may change, the edition they
 * normally read, then retired documentation. Version number only breaks ties
 * inside one lifecycle group — a branch such as `main` therefore stays above
 * the default release without pretending to be a semver tag.
 */
function lifecycleOrder(source: DuxtResolvedSource): number {
  if (source.status === 'upcoming') return 0;
  if (source.isDefault) return 1;
  if (source.status === 'current' || source.status === 'maintained') return 2;
  if (source.status === 'deprecated') return 3;
  return 4;
}

function compareEditions(a: DuxtResolvedSource, b: DuxtResolvedSource): number {
  const lifecycle = lifecycleOrder(a) - lifecycleOrder(b);
  if (lifecycle) return lifecycle;

  const aVersion = a.version!;
  const bVersion = b.version!;
  const semver = /^v?\d+\.\d+\.\d+(?:-.+)?$/;

  // The shared comparator knows full tags. Demo editions such as `v3.x` are
  // deliberately not tags, but still sort newest-first inside their group.
  return semver.test(aVersion) && semver.test(bVersion)
    ? compareVersionTags(aVersion, bVersion)
    : bVersion.localeCompare(aVersion);
}

/**
 * Are these two collections versions of the SAME thing?
 *
 * A documentation tree and an API reference are both published per version, and
 * neither is a version of the other — so a switcher that compared only the
 * repository offered `v2 → /` and `v2 → /api` side by side, twice each label,
 * and a canonical URL on a reference page pointed at the documentation's root.
 *
 * Compared by DECLARATION, which is the identity `resolveGeneratedSections`
 * records for exactly this question. Two documentation trees answer `undefined`
 * on both sides and are the same artefact, which is what keeps a site without a
 * single generated section reading exactly as it did.
 */
export const sameArtefact = (
  a: DuxtResolvedSource | undefined,
  b: DuxtResolvedSource | undefined
) => a?.generated?.declaration === b?.generated?.declaration;

export function versionChoices(
  sources: DuxtResolvedSource[],
  current: DuxtResolvedSource | undefined,
  configured: DuxtLink[] | undefined
): DuxtLink[] {
  // A version-neutral generated section suppresses the control entirely, and
  // that is the point of the policy rather than a tidy-up: a changelog is one
  // global history, so every entry the switcher could offer would move the
  // reader to a URL that section does not serve.
  if (current?.generated?.versioning === 'global') return [];

  // `versions` in the config still wins where a label needs to read differently
  // from the URL segment.
  if (configured?.length) return configured;

  const editions = new Set<string>();

  return sources
    .filter(
      (source) =>
        source.version &&
        source.repo === current?.repo &&
        sameArtefact(source, current)
    )
    .filter((source) => {
      // Repository and artefact are scoped above; translations share the
      // edition's version and target, while keeping separate collections.
      const edition = JSON.stringify([source.version, source.prefix || '/']);
      if (editions.has(edition)) return false;
      editions.add(edition);
      return true;
    })
    .sort(compareEditions)
    .map((source) => ({
      label: source.version!,
      to: source.prefix || '/',
      // The lifecycle, not just "is this the default": a list where three
      // entries look alike says nothing about which of them is still safe to
      // read. `current` needs no word — it is what the reader assumes.
      description:
        source.status && source.status !== 'current'
          ? `duxt.version.status.${source.status}`
          : source.isDefault
            ? 'default'
            : undefined
    }));
}
