#!/usr/bin/env node
import { createJiti } from 'jiti';

/**
 * The cache key for a site's remote sources, as a command.
 *
 * PLAIN JAVASCRIPT for the reason `duxt.mjs` states: Node refuses to strip
 * types from a file under `node_modules`, so a TypeScript entry point dies on
 * the first real install with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`.
 *
 * Everything it decides is in `sources-cache.ts`, where it is typed and tested.
 * This file exists to have no logic in it.
 *
 * Written for a CI step that caches `.data/content` between runs:
 *
 *   duxt-cache-key --github >> "$GITHUB_OUTPUT"
 *
 * and readable without one, which is what makes "why did my cache miss" a
 * question with an answer.
 */
// `node:sqlite` is not reached on this path, but the config is loaded through
// the same modules the report loads it through — and an experimental-feature
// warning in the middle of a `$GITHUB_OUTPUT` capture is a corrupt step output,
// not merely noise.
process.removeAllListeners('warning');

const jiti = createJiti(import.meta.url, { interopDefault: true });

const { duxtSourcesCache, runDuxtSourcesCacheCli } =
  await jiti.import('../sources-cache');

try {
  const argv = process.argv.slice(2);
  const rootIndex = argv.indexOf('--root');
  const rootDir = rootIndex === -1 ? undefined : argv[rootIndex + 1];

  const { output, exitCode } = runDuxtSourcesCacheCli(
    argv,
    duxtSourcesCache({ rootDir })
  );

  console.log(output);
  process.exitCode = exitCode;
} catch (error) {
  // The message, not the stack: everything thrown on this path is a statement
  // about the SITE's own source list, written to be read by whoever wrote it.
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
