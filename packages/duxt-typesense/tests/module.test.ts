import { expect, it } from 'vitest';
import type { Nuxt } from 'nuxt/schema';
import typesenseModule from '../module';

it('publishes only the search credential and leaves synchronization dormant without an admin key', () => {
  const hooks = new Map<string, unknown>();
  const nuxt = {
    options: {
      duxtTypesense: {
        endpoint: 'https://search.example',
        collection: 'docs',
        searchKey: 'browser-key'
      },
      runtimeConfig: { public: {} }
    },
    hook: (name: string, callback: unknown) => hooks.set(name, callback)
  };
  typesenseModule({}, nuxt as unknown as Nuxt);
  expect(nuxt.options.runtimeConfig.public).toEqual({
    duxtTypesense: {
      endpoint: 'https://search.example',
      collection: 'docs',
      searchKey: 'browser-key'
    }
  });
  expect(hooks.has('duxt:search:records')).toBe(false);
  expect(hooks.has('imports:extend')).toBe(true);
});
