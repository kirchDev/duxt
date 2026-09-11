#!/usr/bin/env node
import { createJiti } from 'jiti';

/**
 * The `duxt` command.
 *
 * PLAIN JAVASCRIPT, and it has to be: Node refuses to strip types from a file
 * under `node_modules`, so a TypeScript entry point runs in this repository —
 * where the package is a symlink — and dies on the first real install with
 * `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. That was measured against a
 * packed tarball, not assumed.
 *
 * jiti is what loads the TypeScript behind it, the same way
 * `duxt-app-config.ts` already reads a site's config, so the rest of the layer
 * needs no build step to be reachable from here.
 *
 * Everything the command decides is in `cli.ts`, where it is typed and tested.
 * This file exists to have no logic in it: it hands over the arguments, prints
 * the two streams and sets the exit code.
 */
// Content's cache is read through `node:sqlite`, which announces itself as
// experimental on every run. True, and not this command's news to break to
// anybody: the report is a thing you pipe into a file or paste into a chat, and
// a warning about somebody else's implementation detail is noise in both.
process.removeAllListeners('warning');

const jiti = createJiti(import.meta.url, { interopDefault: true });

const { runDuxtCli } = await jiti.import('../cli');
const { duxtReport } = await jiti.import('../report');

try {
  // `duxtReport` is passed rather than called: usage has to answer on a site
  // that has never been built, so nothing may read a config or a parse cache
  // until the arguments have been read and found to ask for a report.
  const { stdout, stderr, exitCode } = await runDuxtCli(
    process.argv.slice(2),
    duxtReport
  );

  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  process.exitCode = exitCode;
} catch (error) {
  // The message, not the stack. Everything thrown on this path is a statement
  // about the SITE — an artefact that is not where the config says, a section
  // option nobody knows — written to be read by whoever wrote that config, and
  // a trace through jiti's loader helps none of them.
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
