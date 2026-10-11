import { defineNuxtConfig } from 'nuxt/config';
import { fileURLToPath } from 'node:url';
import { claimNuxtProcess } from './scripts/nuxt-process-guard.ts';

claimNuxtProcess(fileURLToPath(new URL('.', import.meta.url)), 'dev');

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  modules: ['@nuxt/content'],
  content: { experimental: { sqliteConnector: 'native' } },
  runtimeConfig: { public: { reloadProbe: '' } }
});
