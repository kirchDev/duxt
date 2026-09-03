import { defineNuxtConfig } from 'nuxt/config';

// Consumes the layer exactly as a downstream repo does. Modules, the Content
// driver and the theme all arrive with the extend.
export default defineNuxtConfig({
  // By name, not by path: this is what a consumer writes, so the package's
  // exports map and files allowlist are exercised by the development site.
  extends: ['@kirchdev/duxt'],
  compatibilityDate: '2026-09-02'
});
