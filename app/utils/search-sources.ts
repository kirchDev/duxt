import { localeChain } from '../../sources-resolve';

type SearchSource = DuxtResolvedSource;
type FallbackLocale = string | string[] | undefined;

interface VersionGroup {
  entries: SearchSource[];
}

const artefactKey = (entry: SearchSource) =>
  [
    entry.repo ?? '',
    entry.generated
      ? `generated:${entry.generated.declaration}`
      : 'documentation'
  ].join('\u0000');

const versionKey = (entry: SearchSource) =>
  entry.generated?.versioning === 'global'
    ? 'global'
    : (entry.version ?? 'unversioned');

function bestLocale(
  entries: SearchSource[],
  locale: string | undefined,
  fallbackLocale: FallbackLocale
) {
  const chain = localeChain(
    locale,
    entries.map((entry) => entry.locale),
    fallbackLocale
  );

  for (const code of chain) {
    const match =
      code === undefined
        ? entries.find((entry) => entry.isDefaultLocale)
        : entries.find((entry) => entry.locale === code);
    if (match) return match;
  }

  return entries[0];
}

/**
 * Pick the collections that represent the searchable site.
 *
 * A repository can publish documentation, several generated declarations and
 * a version-neutral changelog. Those are separate artefacts even when their
 * pages share a repository, so grouping by `repo` silently removed all but one
 * of them. Versions are grouped inside each artefact, then one best-available
 * locale is chosen so a translated page is not returned twice through its
 * fallback collection.
 */
export function selectSearchSources(
  sources: SearchSource[],
  current: SearchSource | undefined,
  locale: string | undefined,
  fallbackLocale: FallbackLocale
): SearchSource[] {
  const artefacts = new Map<string, Map<string, VersionGroup>>();
  const artefactOrder = new Map<string, number>();

  for (const [index, entry] of sources.entries()) {
    const key = artefactKey(entry);
    const versions = artefacts.get(key) ?? new Map<string, VersionGroup>();
    const version = versionKey(entry);
    const group = versions.get(version) ?? { entries: [] };

    group.entries.push(entry);
    versions.set(version, group);
    artefacts.set(key, versions);
    if (!artefactOrder.has(key)) artefactOrder.set(key, index);
  }

  const currentArtefact = current ? artefactKey(current) : undefined;
  const orderedArtefacts = [...artefacts.keys()].sort((left, right) => {
    if (left === currentArtefact) return -1;
    if (right === currentArtefact) return 1;
    return artefactOrder.get(left)! - artefactOrder.get(right)!;
  });

  return orderedArtefacts.flatMap((key) => {
    const versions = artefacts.get(key)!;
    const currentVersion =
      key === currentArtefact && current
        ? versions.get(versionKey(current))
        : undefined;
    const selectedVersion =
      currentVersion ??
      [...versions.values()].find((group) =>
        group.entries.some((entry) => entry.isDefault)
      ) ??
      [...versions.values()][0];

    if (!selectedVersion) return [];

    const selected =
      key === currentArtefact && current
        ? current
        : bestLocale(selectedVersion.entries, locale, fallbackLocale);

    return selected ? [selected] : [];
  });
}
