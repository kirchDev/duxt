import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { refuseGitDirectory } from './scripts/git-dir-guard.ts';

/**
 * Vite's `server.fs.deny` defaults to `['**\/.git/**', …]`, so a checkout under
 * a `.git` directory cannot serve its own test files: the jsdom suite comes
 * back as `Cannot find module 'tests/…'` with 0 tests collected, which reads as
 * a broken import rather than as a refused path. Say what it is instead.
 */
refuseGitDirectory(fileURLToPath(new URL('.', import.meta.url)), 'vitest');

// Node environment only: what is tested here is the layer's pure logic — the
// source resolver and the icon lookup. Component rendering needs a Nuxt
// environment and belongs in its own project once there is something worth
// asserting about the markup.
export default defineConfig({
  resolve: {
    alias: {
      '@nuxtjs/sitemap/content': createRequire(
        import.meta.resolve('@nuxtjs/seo')
      ).resolve('@nuxtjs/sitemap/content')
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});
