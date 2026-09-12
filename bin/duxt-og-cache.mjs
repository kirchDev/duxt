#!/usr/bin/env node
import { createJiti } from 'jiti';

/**
 * The rendered-OG-image cache, as a command.
 *
 * PLAIN JAVASCRIPT for the reason `duxt.mjs` states: Node refuses to strip
 * types from a file under `node_modules`, so a TypeScript entry point dies on
 * the first real install with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`.
 *
 * Everything it decides is in `og-image-cache.ts`, where it is typed and
 * tested. This file exists to have no logic in it.
 *
 * Written for a deploy that caches the rendered images between runs — once
 * before the build, to say what to restore and under which key:
 *
 *   duxt-og-cache --root www --run "$GITHUB_SHA" --github >> "$GITHUB_OUTPUT"
 *
 * and once after it, to say what that was worth:
 *
 *   duxt-og-cache --root www --report --since "$STARTED" --log build.log
 *
 * Both are readable without a workflow, which is what makes "why did my cache
 * miss" and "did it help" questions with answers.
 */
// An experimental-feature warning in the middle of a `$GITHUB_OUTPUT` capture
// is a corrupt step output, not merely noise.
process.removeAllListeners('warning');

const jiti = createJiti(import.meta.url, { interopDefault: true });

const { duxtOgImageCacheCommand } = await jiti.import('../og-image-cache');

try {
  const { output, exitCode } = duxtOgImageCacheCommand(process.argv.slice(2));

  console.log(output);
  process.exitCode = exitCode;
} catch (error) {
  // The message, not the stack: everything thrown on this path is a statement
  // about the SITE, written to be read by whoever built it.
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
