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

  return sources
    .filter((source) => source.version && source.repo === current?.repo)
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
