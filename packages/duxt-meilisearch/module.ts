import { fileURLToPath } from 'node:url';
import type { Nuxt } from 'nuxt/schema';
import { syncMeilisearch } from './sync';
import type { MeilisearchSearchOptions } from './search';

export interface DuxtMeilisearchOptions extends Partial<MeilisearchSearchOptions> {
  /** Build-only key; possession alone never enables synchronization. */
  syncKey?: string;
  /** Build-only global task-read credential, never published to the browser. */
  taskKey?: string;
  sync?: {
    enabled?: boolean;
    deployment?: 'production' | 'preview' | 'development';
    taskTimeoutMs?: number;
  };
}
declare module '@nuxt/schema' {
  interface NuxtConfig {
    duxtMeilisearch?: DuxtMeilisearchOptions;
  }
  interface NuxtOptions {
    duxtMeilisearch?: DuxtMeilisearchOptions;
  }
}

export default function duxtMeilisearchModule(_options: unknown, nuxt: Nuxt) {
  // A layer loads this plain module by path; its option declarations must also
  // reach the consuming app's TypeScript program without a manual type import.
  nuxt.hook('prepare:types', ({ references }) => {
    references.push({
      path: fileURLToPath(new URL('./module.ts', import.meta.url))
    });
  });
  const options = nuxt.options.duxtMeilisearch ?? {};
  const host = options.host ?? '';
  const index = options.index ?? 'docs';
  const searchKey = options.searchKey ?? '';
  const syncKey = options.syncKey ?? '';
  const taskKey = options.taskKey;
  if (!host && !searchKey && !syncKey) return;
  const parsed = new URL(host);
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  )
    throw new Error(
      'duxt-meilisearch host must be an HTTP(S) URL without credentials, query or fragment'
    );
  if (!/^[A-Za-z0-9_-]+$/.test(index))
    throw new Error(
      'duxt-meilisearch index must use letters, numbers, underscores or hyphens'
    );
  if ((syncKey && syncKey === searchKey) || (taskKey && taskKey === searchKey))
    throw new Error(
      'duxt-meilisearch requires a separate search-only browser key'
    );
  if (searchKey) {
    nuxt.options.runtimeConfig.public.duxtMeilisearch = {
      host,
      index,
      searchKey
    };
    const from = fileURLToPath(
      new URL('./app/composables/useMeilisearchSearch.ts', import.meta.url)
    );
    nuxt.hook('imports:extend', (imports) => {
      imports.push({
        name: 'useMeilisearchSearch',
        as: 'useDuxtSearch',
        from,
        priority: 20
      });
    });
  }
  const preview =
    process.env.GITHUB_EVENT_NAME?.startsWith('pull_request') ||
    ['preview', 'development'].includes(process.env.VERCEL_ENV ?? '') ||
    ['deploy-preview', 'branch-deploy', 'dev'].includes(
      process.env.CONTEXT ?? ''
    ) ||
    (['true', '1'].includes(process.env.CF_PAGES ?? '') &&
      (!process.env.DUXT_PRODUCTION_BRANCH ||
        process.env.CF_PAGES_BRANCH !== process.env.DUXT_PRODUCTION_BRANCH)) ||
    Boolean(process.env.CI_MERGE_REQUEST_IID) ||
    Boolean(process.env.CHANGE_ID) ||
    !['', 'false', '0'].includes(process.env.CI_PULL_REQUEST ?? '');
  if (
    nuxt.options.dev ||
    nuxt.options._prepare ||
    preview ||
    options.sync?.enabled !== true ||
    options.sync.deployment !== 'production'
  )
    return;
  if (!syncKey)
    throw new Error(
      'duxt-meilisearch production sync requires a private syncKey'
    );
  nuxt.hook('duxt:search:records', async (records) => {
    const result = await syncMeilisearch(records, {
      host,
      index,
      syncKey,
      taskKey,
      enabled: true,
      deployment: 'production',
      taskTimeoutMs: options.sync?.taskTimeoutMs
    });
    if (result.cleanupFailed)
      console.warn(
        '[duxt-meilisearch] Published the snapshot but could not remove the previous index'
      );
  });
}
