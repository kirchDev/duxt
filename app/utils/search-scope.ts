import {
  sourcesForRoute,
  type DuxtResolvedSource
} from '../../sources-resolve';

/** Select the editions participating in site-wide search. */
export function searchSources(
  sources: DuxtResolvedSource[],
  current: DuxtResolvedSource | undefined,
  locale?: string,
  fallbackLocale?: string | string[]
): DuxtResolvedSource[] {
  const byArtefact = new Map<string, DuxtResolvedSource>();
  for (const entry of sources) {
    const key = JSON.stringify([entry.repo, entry.generated?.declaration]);
    const chosen = byArtefact.get(key);
    if (entry.collection === current?.collection) {
      byArtefact.set(key, entry);
      continue;
    }
    if (chosen?.collection === current?.collection) continue;
    if (!chosen || (entry.isDefault && !chosen.isDefault))
      byArtefact.set(key, entry);
  }
  return [...byArtefact.values()]
    .sort((a, b) =>
      a.collection === current?.collection
        ? -1
        : b.collection === current?.collection
          ? 1
          : 0
    )
    .flatMap((edition) =>
      sourcesForRoute(
        edition.prefix,
        locale ?? current?.locale,
        sources.filter((entry) => entry.prefix === edition.prefix),
        fallbackLocale
      )
    );
}
