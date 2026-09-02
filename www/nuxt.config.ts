import { defineNuxtConfig } from 'nuxt/config';

// Consumes the layer exactly as a downstream repo would, by path instead of by
// package name. Modules, the Content driver and the default `docs` collection
// all arrive from '..'.
export default defineNuxtConfig({
  extends: ['..'],
  compatibilityDate: '2026-09-02'
});
