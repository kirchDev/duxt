import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { DuxtSearchRecord } from '@kirchdev/duxt/search-records';

export interface MeilisearchSyncOptions {
  host: string;
  index: string;
  /** Build-only secret, never copied to runtimeConfig. */
  syncKey: string;
  /** Optional build-only key for global swap task reads (tasks.get on *). */
  taskKey?: string;
  enabled: boolean;
  deployment: 'production' | 'preview' | 'development';
  /** Maximum time for each asynchronous task, including HTTP requests. */
  taskTimeoutMs?: number;
}

/** Publish a full immutable snapshot; an uncertain swap keeps staging intact. */
export async function syncMeilisearch(
  records: readonly DuxtSearchRecord[],
  options: MeilisearchSyncOptions,
  fetcher: typeof fetch = fetch
): Promise<{ records: number; cleanupFailed: boolean; skipped: boolean }> {
  if (options.enabled !== true || options.deployment !== 'production')
    return { records: 0, cleanupFailed: false, skipped: true };
  if (!/^[A-Za-z0-9_-]+$/.test(options.index) || !options.syncKey)
    throw new Error('Meilisearch sync requires an index name and private key');
  const host = options.host.replace(/\/$/, '');
  const staging = `${options.index}__duxt_${randomUUID().replaceAll('-', '')}`;
  const request = async (
    path: string,
    method = 'GET',
    body?: unknown,
    signal?: AbortSignal
  ) => {
    const response = await fetcher(`${host}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${path.startsWith('/tasks/') ? (options.taskKey ?? options.syncKey) : options.syncKey}`,
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
        : AbortSignal.timeout(30_000)
    });
    // Service error bodies can echo credentials or indexed documents.
    if (
      !response.ok &&
      !(
        method === 'GET' &&
        path === `/indexes/${options.index}` &&
        response.status === 404
      )
    )
      throw new Error(
        `Meilisearch ${method} ${path} failed (${response.status})`
      );
    return response;
  };
  const task = async (path: string, method: string, body?: unknown) => {
    const timeout = options.taskTimeoutMs ?? 300_000;
    if (!Number.isFinite(timeout) || timeout < 1 || timeout > 3_600_000)
      throw new Error(
        'Meilisearch task timeout must be between 1 and 3600000ms'
      );
    const signal = AbortSignal.timeout(timeout);
    const result = await request(path, method, body, signal);
    const { taskUid } = await result.json();
    if (!Number.isSafeInteger(taskUid) || taskUid < 0)
      throw new Error('Meilisearch returned an invalid task identifier');
    for (;;) {
      signal.throwIfAborted();
      const response = await request(
        `/tasks/${taskUid}`,
        'GET',
        undefined,
        signal
      );
      const { status } = await response.json();
      if (status === 'succeeded') return;
      if (status === 'failed' || status === 'canceled')
        throw new Error(`Meilisearch task ${taskUid} ${status}`);
      if (status !== 'enqueued' && status !== 'processing')
        throw new Error(
          `Meilisearch task ${taskUid} returned an invalid status`
        );
      await delay(100, undefined, { signal });
    }
  };
  await task('/indexes', 'POST', { uid: staging, primaryKey: 'id' });
  try {
    await task(`/indexes/${staging}/settings`, 'PATCH', {
      searchableAttributes: ['title', 'content'],
      filterableAttributes: ['source', 'version', 'locale'],
      displayedAttributes: [
        'id',
        'url',
        'title',
        'content',
        'source',
        'version',
        'locale'
      ]
    });
    for (let offset = 0; offset < records.length; offset += 100)
      await task(
        `/indexes/${staging}/documents`,
        'POST',
        records.slice(offset, offset + 100)
      );
    const previous = await request(`/indexes/${options.index}`);
    if (previous.status === 404)
      await task('/indexes', 'POST', { uid: options.index, primaryKey: 'id' });
  } catch (error) {
    await task(`/indexes/${staging}`, 'DELETE').catch(() => {});
    throw error;
  }
  // A timeout or lost response may hide a committed swap. Delete nothing until
  // the swap task itself has reported success, even when its HTTP request did.
  await task('/swap-indexes', 'POST', [{ indexes: [options.index, staging] }]);
  let cleanupFailed = false;
  try {
    await task(`/indexes/${staging}`, 'DELETE');
  } catch {
    cleanupFailed = true;
  }
  return { records: records.length, cleanupFailed, skipped: false };
}
