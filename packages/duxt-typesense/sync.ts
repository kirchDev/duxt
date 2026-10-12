import { randomUUID } from 'node:crypto';
import type { DuxtSearchRecord } from '@kirchdev/duxt/search-records';

export interface TypesenseSyncOptions {
  endpoint: string;
  adminKey: string;
  /** Dedicated alias owned by this provider. */
  collection: string;
}

/** Publish a complete build, keeping the old alias live until all rows import. */
export async function syncTypesense(
  records: readonly DuxtSearchRecord[],
  options: TypesenseSyncOptions,
  fetcher: typeof fetch = fetch
): Promise<{ collection: string; records: number; cleanupFailed: boolean }> {
  const prefix = `${options.collection}__duxt_`;
  const collection = `${prefix}${randomUUID().replaceAll('-', '')}`;
  const endpoint = options.endpoint.replace(/\/$/, '');
  const request = async (path: string, method = 'GET', body?: string) => {
    const response = await fetcher(`${endpoint}${path}`, {
      method,
      headers: {
        'X-TYPESENSE-API-KEY': options.adminKey,
        'Content-Type': path.includes('/import')
          ? 'text/plain'
          : 'application/json'
      },
      body,
      signal: AbortSignal.timeout(30_000),
      redirect: 'error'
    });
    if (!response.ok && !(method === 'GET' && response.status === 404)) {
      // Service response bodies may echo submitted documents or credentials.
      throw new Error(
        `Typesense ${method} ${path} failed (${response.status})`
      );
    }
    return response;
  };
  const previous = await request(
    `/aliases/${encodeURIComponent(options.collection)}`
  );
  const previousName =
    previous.status === 404
      ? undefined
      : ((await previous.json()).collection_name as string | undefined);
  await request(
    '/collections',
    'POST',
    JSON.stringify({
      name: collection,
      fields: [
        { name: 'url', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'source', type: 'string', facet: true },
        { name: 'version', type: 'string', facet: true, optional: true },
        { name: 'locale', type: 'string', facet: true }
      ]
    })
  );
  try {
    for (let offset = 0; offset < records.length; offset += 100) {
      const batch = records.slice(offset, offset + 100);
      const imported = await request(
        `/collections/${collection}/documents/import?action=create`,
        'POST',
        batch.map((record) => JSON.stringify(record)).join('\n')
      );
      const rows = (await imported.text()).trim().split('\n');
      if (
        rows.length !== batch.length ||
        rows.some((row) => JSON.parse(row).success !== true)
      ) {
        throw new Error(
          'Typesense import failed: the complete record set was not accepted'
        );
      }
    }
  } catch (error) {
    await request(`/collections/${collection}`, 'DELETE').catch(() => {});
    throw error;
  }
  // A lost alias response may still have committed. Retain the staging
  // collection on publication failure rather than deleting a possibly live index.
  await request(
    `/aliases/${encodeURIComponent(options.collection)}`,
    'PUT',
    JSON.stringify({ collection_name: collection })
  );
  let cleanupFailed = false;
  if (previousName?.startsWith(prefix)) {
    try {
      await request(
        `/collections/${encodeURIComponent(previousName)}`,
        'DELETE'
      );
    } catch {
      cleanupFailed = true;
    }
  }
  return { collection, records: records.length, cleanupFailed };
}
