import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  extends: [fileURLToPath(new URL('../../../packages/duxt', import.meta.url))],
  site: { url: 'https://docs.example.com' },
  nitro: { prerender: { routes: [], crawlLinks: false } }
});
