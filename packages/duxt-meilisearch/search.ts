import type { DuxtSearchRecord } from '@kirchdev/duxt/search-records';

export interface MeilisearchSearchOptions {
  host: string;
  index: string;
  searchKey: string;
}
export interface MeilisearchSearchScope {
  source: string;
  version?: string;
  locale: string;
  /** Page URLs covered by a preferred language in this exact scope. */
  excludePages?: readonly string[];
}

/** Browser-only HTTP search; no imports of the private synchronization code. */
export async function searchMeilisearch(
  term: string,
  options: MeilisearchSearchOptions,
  scope: readonly MeilisearchSearchScope[],
  limit = 20,
  fetcher: typeof fetch = fetch
): Promise<DuxtSearchRecord[]> {
  if (!term.trim() || !scope.length || !Number.isFinite(limit) || limit < 1)
    return [];
  const filter = scope
    .map((entry) => {
      const parts = [
        `source = ${JSON.stringify(entry.source)}`,
        `locale = ${JSON.stringify(entry.locale)}`,
        entry.version === undefined
          ? 'version NOT EXISTS'
          : `version = ${JSON.stringify(entry.version)}`
      ];
      if (entry.excludePages?.length)
        parts.push(`page NOT IN ${JSON.stringify(entry.excludePages)}`);
      return `(${parts.join(' AND ')})`;
    })
    .join(' OR ');
  const response = await fetcher(
    `${options.host.replace(/\/$/, '')}/indexes/${encodeURIComponent(options.index)}/search`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.searchKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: term,
        limit: Math.min(1000, Math.floor(limit)),
        filter
      }),
      credentials: 'omit',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000)
    }
  );
  if (!response.ok)
    throw new Error(`Meilisearch search failed (${response.status})`);
  const payload = (await response.json()) as { hits?: DuxtSearchRecord[] };
  return payload.hits ?? [];
}
