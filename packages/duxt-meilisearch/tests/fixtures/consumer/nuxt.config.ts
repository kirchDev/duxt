import { defineNuxtConfig } from 'nuxt/config';

// Both literals are checked in this consumer's generated Nuxt type context.
const invalid = defineNuxtConfig({
  duxtMeilisearch: {
    // @ts-expect-error A browser search key must be a string.
    searchKey: 42
  }
});
void invalid;

export default defineNuxtConfig({
  extends: ['@kirchdev/duxt', '@kirchdev/duxt-meilisearch'],
  duxtMeilisearch: {
    host: 'https://meilisearch-types.invalid',
    index: 'docs',
    searchKey: 'browser-fixture'
  },
  site: { url: 'https://meilisearch-types.invalid' },
  i18n: { baseUrl: 'https://meilisearch-types.invalid' },
  runtimeConfig: {
    public: { i18n: { baseUrl: 'https://meilisearch-types.invalid' } }
  }
});
