#!/usr/bin/env node

/**
 * WHICH PUBLIC ROUTES ARE FILES AND WHICH ONES RUN, STATED ONCE AND CHECKED.
 *
 * `www` is an SSR build with everything prerendered that can be: a page written
 * into `.output/public` is served by the Workers assets binding and never
 * invokes the Worker at all. Which routes end up on which side of that line
 * decides what depends on D1, what a cache may hold, and what can only change
 * on a rebuild — and it was, until this file, described twice in prose that had
 * drifted apart. `www/nuxt.config.ts` named three runtime paths and
 * `www/wrangler.jsonc` named a different three; between them they left
 * `llms-full.txt` and `rss.xml` unaccounted for.
 *
 * So the classification is data here, and the two configs point at it rather
 * than restating it. `DEPLOYMENT_ROUTES` answers four questions per route —
 * asset or Worker, D1 or not, how a request that was not prerendered is
 * answered, and why it lands where it lands.
 *
 * AND IT IS CHECKED AGAINST THE ARTIFACT, not against a reading of the config.
 * `pnpm check:routes` walks the `.output/public` of a Cloudflare build and
 * compares what is actually there with what the table claims. It is the last
 * step of `build:cf` rather than a step of the deploy: the artifact is what is
 * being checked, so the check belongs to producing it. That puts it on every
 * Cloudflare build there is — `pnpm build:www` in CI's build job, `pnpm
 * deploy:www`, and `preview:cf` locally — and a build whose artifact disagrees
 * therefore never reaches the upload job at all. It is deliberately NOT part of
 * `pnpm check`: that gate builds the Node server, and a second full Nuxt build
 * would roughly double CI for a target only `main` reaches.
 *
 * The comparison is one-directional on purpose. It proves each classified route
 * is on the side the table puts it on; it does not enumerate the artifact and
 * demand a row for every file in it, because the artifact also holds the OG
 * images, the Content SQL dumps and every Nuxt payload, none of which this
 * table is about.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Served from `.output/public` by the assets binding, or by the Worker. */
export type RouteDelivery = 'asset' | 'worker';

export interface DeploymentRoute {
  /** How the route is written when someone talks about it. */
  readonly route: string;
  readonly method: 'GET' | 'POST';
  /** What answers the normal deployed request. */
  readonly delivery: RouteDelivery;
  /** Does answering it read D1 at request time? */
  readonly d1: boolean;
  /** Why it lands on that side. */
  readonly why: string;
  /** What answers a request the prerender pass did not write. */
  readonly fallback: string;
  /**
   * Paths under `.output/public` that decide the claim.
   *
   * An exact path, or `*` plus a suffix for a family of them — `…/page.md` is
   * a suffix over arbitrary paths, so a single committed example would go
   * stale the first time that page was renamed.
   */
  readonly probes: readonly string[];
}

/**
 * THE AUTHORITATIVE CLASSIFICATION. Verified by `pnpm check:routes` against the
 * `.output/public` of a `NITRO_PRESET=cloudflare-module` build.
 *
 * The rule that puts five of these seven rows where they are is Nitro's, and it
 * is not the route rule: `routeRules: { '/**': { prerender: true } }` says a
 * route MAY be prerendered and seeds nothing, because Nitro skips every rule
 * whose path contains a wildcard. What actually fills the queue is
 * `nitro.prerender.routes: ['/']` and the crawler — and the crawler follows a
 * link only when its extension is `""` or `.json`. A `.txt`, `.md` or `.xml`
 * href is never queued however prominently the site links it, which is why
 * `llms.txt` sits in the footer of every page and is still not a file.
 */
export const DEPLOYMENT_ROUTES: readonly DeploymentRoute[] = [
  {
    route: '/{page}',
    method: 'GET',
    delivery: 'asset',
    d1: false,
    why:
      'The crawl seeded at `/` walks the navigation, and `DuxtHeader` registers ' +
      'every navigation path with `prerenderRoutes` besides — a version segment ' +
      'like `v0.1.0` reads to the crawler as a file with extension `.0`. Each one ' +
      'is written as HTML plus its Nuxt payload and served by the assets binding.',
    fallback:
      'A page nothing links to and navigation does not name is not written. The ' +
      'request falls through to the Worker, which renders it from D1 exactly as it ' +
      'would have anyway — slower, and correct. THIS IS NOT COVER FOR A BROKEN ' +
      'LINK: `prerender.failOnError` is off, so the crawl also prints and walks past ' +
      'the `/demo/api/shipments` links the versioned demo section generates and ' +
      'nothing serves. Those are a defect wanting a fix where they are generated, ' +
      'not a classified fallback.',
    probes: ['index.html', 'getting-started/index.html']
  },
  {
    route: '/llms.txt',
    method: 'GET',
    delivery: 'worker',
    d1: true,
    why:
      'A Nitro route handler that indexes every collection the manifest names. ' +
      'The site links it from the landing page, but `.txt` is outside the ' +
      "crawler's allowed extensions, so nothing queues it and no file is written.",
    fallback:
      'There is no fallback to describe: every request is answered by the Worker, ' +
      'freshly, and the response changes with the content rather than with a rebuild.',
    probes: ['llms.txt']
  },
  {
    route: '/llms-full.txt',
    method: 'GET',
    delivery: 'worker',
    d1: true,
    why:
      'The whole documentation concatenated, read out of `rawbody` at request ' +
      'time. Unlinked and `.txt`, so doubly out of the crawl.',
    fallback:
      'None: the Worker answers every request. It is the largest response this ' +
      'site produces and the one most worth a cache, which is a separate decision ' +
      'and deliberately not taken here.',
    probes: ['llms-full.txt']
  },
  {
    route: '/rss.xml',
    method: 'GET',
    delivery: 'worker',
    d1: true,
    why:
      'A feed over the one section `duxt.feed.path` names — `/adr` for this site. ' +
      '`.xml` is outside the allowed extensions, and the feed is a function of the ' +
      'content rather than of the build.',
    fallback:
      'None. With no `feed.path` configured the handler still answers, with an ' +
      'empty channel and without reading D1 at all — a feed client is told there ' +
      'is nothing here rather than that the feed is gone.',
    probes: ['rss.xml']
  },
  {
    route: '/{page}.md',
    method: 'GET',
    delivery: 'worker',
    d1: true,
    why:
      '`server/middleware/raw-markdown.ts`, a middleware rather than a route ' +
      'because `.md` is a suffix on the last path segment and Nitro matches ' +
      'segments. "View as Markdown" and the ChatGPT and Claude hand-off links all ' +
      'open one, and the crawler skips every one of those hrefs on its extension.',
    fallback:
      'A `.md` path with no page behind it is not the middleware’s error to raise: ' +
      'it hands the request on and the app answers with its own 404, which knows ' +
      'how to suggest a near miss.',
    probes: ['*.md']
  },
  {
    route: '/mcp',
    method: 'POST',
    delivery: 'worker',
    d1: true,
    why:
      'An MCP server, whose tools query the collections when they are called. A ' +
      'POST is never served from the assets binding, so no prerender rule could ' +
      'reach it even if one wanted to.',
    fallback: 'None: a POST always runs.',
    probes: ['mcp']
  },
  {
    route: '/demo/echo',
    method: 'POST',
    delivery: 'worker',
    d1: false,
    why:
      'The one endpoint behind the API reference’s try-it client. It answers from ' +
      'the request body — nothing is stored and no collection is read — which is ' +
      'why it is the only runtime route on this site that does not touch D1.',
    fallback: 'None: a POST always runs.',
    probes: ['demo/echo']
  }
];

/**
 * Compare a listing of `.output/public` with the table.
 *
 * Pure so the failure modes can be tested without a Cloudflare build: `files`
 * are paths relative to `.output/public`, with `/` separators.
 */
export function verifyDeploymentRoutes(
  files: Iterable<string>,
  routes: readonly DeploymentRoute[] = DEPLOYMENT_ROUTES
): string[] {
  const listing = [...files];
  const present = new Set(listing);
  const findings: string[] = [];

  for (const entry of routes) {
    for (const probe of entry.probes) {
      const matches = probe.startsWith('*')
        ? listing.filter((file) => file.endsWith(probe.slice(1)))
        : present.has(probe)
          ? [probe]
          : [];

      if (entry.delivery === 'asset' && matches.length === 0) {
        findings.push(
          `${entry.route} is classified as a prerendered asset, but the build wrote no \`${probe}\`. ` +
            'Either the prerender no longer reaches it — in which case the site still works and got ' +
            'slower — or the classification is out of date.'
        );
      }

      if (entry.delivery === 'worker' && matches.length > 0) {
        const shown = matches.slice(0, 3).join(', ');
        findings.push(
          `${entry.route} is classified as served by the Worker, but the build wrote ` +
            `${shown}${matches.length > 3 ? `, and ${matches.length - 3} more` : ''}. ` +
            'It is now a static asset: it no longer reads D1 and no longer changes between builds. ' +
            'Reclassify it rather than deleting the file.'
        );
      }
    }
  }

  return findings;
}

/** Every file under `directory`, relative to it, with `/` separators. */
function listFiles(directory: string, prefix = ''): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory())
      found.push(...listFiles(join(directory, entry.name), name));
    else found.push(name);
  }

  return found;
}

function main(): void {
  const output = fileURLToPath(new URL('../www/.output/', import.meta.url));

  let preset: string | undefined;
  try {
    preset = (
      JSON.parse(readFileSync(join(output, 'nitro.json'), 'utf8')) as {
        preset?: string;
      }
    ).preset;
  } catch {
    throw new Error(
      'No build artifact at www/.output. Run `pnpm --filter www build:cf` first — ' +
        'this check reads the Cloudflare build, not the config.'
    );
  }

  // The Node build writes the same `.output/server/index.mjs`, and checking the
  // wrong artifact would report every worker route as correctly dynamic while
  // proving nothing: that build prerenders no page at all.
  if (!preset?.startsWith('cloudflare')) {
    throw new Error(
      `www/.output was built with the \`${preset}\` preset. This check reads a Cloudflare ` +
        'build — run `pnpm --filter www build:cf` first.'
    );
  }

  const findings = verifyDeploymentRoutes(listFiles(join(output, 'public')));

  for (const entry of DEPLOYMENT_ROUTES) {
    const where = entry.delivery === 'asset' ? 'asset ' : 'Worker';
    console.log(
      `  ${where}  ${entry.d1 ? 'D1 ' : '   '}  ${entry.method.padEnd(4)} ${entry.route}`
    );
  }

  if (findings.length > 0) {
    console.error(
      `\nThe Cloudflare build artifact disagrees with the classification in ${'scripts/check-routes.ts'}:\n`
    );
    for (const finding of findings) console.error(`  - ${finding}`);
    process.exitCode = 1;

    return;
  }

  console.log(
    `\n${DEPLOYMENT_ROUTES.length} routes verified against the ${preset} build artifact.`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
