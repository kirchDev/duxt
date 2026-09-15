import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { refuseGitDirectory } from '../../scripts/git-dir-guard.ts';

/**
 * The site's own tests: the checks that read a build of this site, the deploy
 * and benchmark workflows, the process guard its Nuxt config claims, and the
 * documentation tree it publishes. The layer's pure logic is tested in
 * `packages/duxt`.
 *
 * Refused under a `.git` directory for the reason `packages/duxt/vitest.config.ts`
 * states: Vite's `server.fs.deny` would otherwise report every test file as a
 * missing module.
 */
refuseGitDirectory(fileURLToPath(new URL('.', import.meta.url)), 'vitest');

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});
