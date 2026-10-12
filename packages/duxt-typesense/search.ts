import type { DuxtSearchRecord } from '@kirchdev/duxt/search-records';

export interface TypesenseSearchOptions {
  endpoint: string;
  collection: string;
  searchKey: string;
}
export interface TypesenseSearchScope {
  source: string;
  version?: string;
  locale: string;
}

const literal = (value: string) => {
  if (/[`\\\r\n]/.test(value))
    throw new Error(
      'Typesense filter value contains an unsupported escape character'
    );
  return `\`${value}\``;
};

/** Browser-safe search: no administrative key or synchronization code. */
export async function searchTypesense(
  term: string,
  options: TypesenseSearchOptions,
  scope: readonly TypesenseSearchScope[],
  limit = 20,
  fetcher: typeof fetch = fetch,
  page = 1
): Promise<DuxtSearchRecord[]> {
  if (!term.trim() || !scope.length || limit <= 0) return [];
  const filter = scope
    .map((entry) => {
      const parts = [
        `source:=${literal(entry.source)}`,
        `locale:=${literal(entry.locale)}`
      ];
      if (entry.version !== undefined)
        parts.push(`version:=${literal(entry.version)}`);
      return `(${parts.join(' && ')})`;
    })
    .join(' || ');
  const url = new URL(
    `${options.endpoint.replace(/\/$/, '')}/collections/${encodeURIComponent(options.collection)}/documents/search`
  );
  url.search = new URLSearchParams({
    q: term,
    query_by: 'title,content',
    filter_by: filter,
    page: String(page),
    per_page: String(Math.min(250, Math.floor(limit)))
  }).toString();
  const response = await fetcher(url.toString(), {
    headers: { 'X-TYPESENSE-API-KEY': options.searchKey },
    credentials: 'omit',
    redirect: 'error',
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok)
    throw new Error(`Typesense search failed (${response.status})`);
  const payload = (await response.json()) as {
    hits?: { document: DuxtSearchRecord }[];
  };
  return (payload.hits ?? []).map((hit) => hit.document);
}
