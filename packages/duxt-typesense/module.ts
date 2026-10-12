import { fileURLToPath } from 'node:url';
import type { Nuxt } from 'nuxt/schema';
import { syncTypesense } from './sync';
import type { TypesenseSearchOptions } from './search';

export interface DuxtTypesenseOptions extends Partial<TypesenseSearchOptions> {
  /** Build-only secret: never copied to runtimeConfig. */
  adminKey?: string;
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    duxtTypesense?: DuxtTypesenseOptions;
  }
  interface NuxtOptions {
    duxtTypesense?: DuxtTypesenseOptions;
  }
}

export default function duxtTypesenseModule(_options: unknown, nuxt: Nuxt) {
  const options = nuxt.options.duxtTypesense ?? {};
  const endpoint = options.endpoint ?? '';
  const collection = options.collection ?? 'docs';
  const searchKey = options.searchKey ?? '';
  const adminKey = options.adminKey ?? '';
  if (!endpoint && !searchKey && !adminKey) return;
  const parsed = new URL(endpoint);
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      'duxt-typesense endpoint must be an HTTP(S) URL without credentials, query or fragment'
    );
  }
  if (!/^[A-Za-z0-9_-]+$/.test(collection))
    throw new Error(
      'duxt-typesense collection must use letters, numbers, underscores or hyphens'
    );
  if (adminKey && adminKey === searchKey)
    throw new Error(
      'duxt-typesense requires a separate search-only browser key'
    );
  if (searchKey) {
    nuxt.options.runtimeConfig.public.duxtTypesense = {
      endpoint,
      collection,
      searchKey
    };
    const from = fileURLToPath(
      new URL('./app/composables/useTypesenseSearch.ts', import.meta.url)
    );
    nuxt.hook('imports:extend', (imports) => {
      imports.push({
        name: 'useTypesenseSearch',
        as: 'useDuxtSearch',
        from,
        priority: 20
      });
    });
  }
  if (adminKey) {
    nuxt.hook('duxt:search:records', async (records) => {
      const result = await syncTypesense(records, {
        endpoint,
        collection,
        adminKey
      });
      if (result.cleanupFailed)
        console.warn(
          '[duxt-typesense] Published the index but could not remove the previous collection'
        );
    });
  }
}
