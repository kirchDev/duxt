import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  modules: [fileURLToPath(new URL('./module.ts', import.meta.url))]
});
