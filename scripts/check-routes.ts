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
 * THE FILE COMPARISON IS ONE-DIRECTIONAL, AND ON ITS OWN THAT IS THE ORIGINAL
 * DEFECT AGAIN. `verifyDeploymentRoutes` asks only whether each CLASSIFIED
 * route is on the side the table puts it on. It cannot enumerate the artifact
 * and demand a row per file — the artifact also holds the OG images, the
 * Content SQL dumps and every Nuxt payload, none of which this table is about —
 * but that leaves a route with NO ROW invisible, which is exactly how
 * `llms-full.txt` and `rss.xml` went unaccounted for in the first place.
 *
 * So the second half closes it at the level the gap actually lives at:
 * HANDLERS, not files. `verifyHandlerCoverage` reads Nitro's own handler
 * manifest out of the built server bundle and requires every registered route
 * to be either a row in `DEPLOYMENT_ROUTES` or a named entry in
 * `EXEMPT_HANDLERS` with a reason. A new module that registers a public route
 * therefore fails this check until somebody says which side it is on. Reading
 * the manifest is a regex over generated code, so it FAILS OPEN: a bundle this
 * file cannot find a manifest in is reported, never passed.
 *
 * The two lists are not symmetric, deliberately. A ROW MAKES A CLAIM, so a row
 * naming a handler the build no longer registers is reported. AN EXEMPTION ONLY
 * WITHHOLDS ONE, so an exemption nothing matches any more grants nothing and is
 * left alone.
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
   * An exact path; `*` plus a suffix for a family of them — `…/page.md` is a
   * suffix over arbitrary paths, so a single committed example would go stale
   * the first time that page was renamed; or a prefix plus `*` for a directory
   * whose filenames are not ours to pin, such as the per-locale sitemaps.
   */
  readonly probes: readonly string[];
  /**
   * The Nitro handler routes this row accounts for, spelled as the build's own
   * manifest spells them. Empty for the one row that is a MIDDLEWARE: a
   * middleware is registered with no route at all, so it cannot be named here.
   */
  readonly handlers: readonly string[];
}

/** A registered handler this table deliberately does not classify. */
export interface ExemptHandler {
  /**
   * The handler route as the manifest spells it, or a prefix ending in `/`,
   * which covers every route under it.
   */
  readonly handler: string;
  /** Why it is not part of the surface this site publishes. */
  readonly why: string;
}

/**
 * THE AUTHORITATIVE CLASSIFICATION. Verified by `pnpm check:routes` against the
 * `.output/public` of a `NITRO_PRESET=cloudflare-module` build.
 *
 * It covers what this site publishes as its own: the pages, and the machine
 * readers beside them. Everything else the build registers is in
 * `EXEMPT_HANDLERS` below with a reason, and nothing may be in neither.
 *
 * The rule that puts most of these rows where they are is Nitro's, and it is
 * not the route rule: `routeRules: { '/**': { prerender: true } }` says a route
 * MAY be prerendered and seeds nothing, because Nitro skips every rule whose
 * path contains a wildcard. What actually fills the queue is
 * `nitro.prerender.routes: ['/']` and the crawler — and the crawler follows a
 * link only when its extension is `""` or `.json`. A `.txt`, `.md` or `.xml`
 * href is never queued however prominently the site links it, which is why
 * `llms.txt` sits in the landing page's tabs and in every page's head and is
 * still not a file.
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
    probes: ['index.html', 'getting-started/index.html'],
    handlers: ['/**']
  },
  {
    route: '/llms.txt',
    method: 'GET',
    delivery: 'worker',
    d1: true,
    why:
      'A Nitro route handler that indexes every collection the manifest names. ' +
      "The site links it from the landing page's tabs and from every page's head, " +
      "but `.txt` is outside the crawler's allowed extensions, so nothing queues " +
      'it and no file is written.',
    fallback:
      'There is no fallback to describe: every request is answered by the Worker, ' +
      'freshly, and the response changes with the content rather than with a rebuild.',
    probes: ['llms.txt'],
    handlers: ['/llms.txt']
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
    probes: ['llms-full.txt'],
    handlers: ['/llms-full.txt']
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
    probes: ['rss.xml'],
    handlers: ['/rss.xml']
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
    probes: ['*.md'],
    // A middleware is registered with `route: ''`, so the manifest cannot tell
    // this one from the two Nitro and the SEO modules install. The exemption
    // for middleware says so; what keeps THIS one honest is the `*.md` probe.
    handlers: []
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
    probes: ['mcp'],
    handlers: ['/mcp']
  },
  {
    route: '/mcp/deeplink',
    method: 'GET',
    delivery: 'worker',
    d1: false,
    why:
      '`@nuxtjs/mcp-toolkit` registers it beside `/mcp`: it reads the client from ' +
      'the query string and answers with a page that opens that editor’s ' +
      '`mcp/install` deeplink. Its answer is a function of the query, so there is ' +
      'nothing to prerender and no collection to read.',
    fallback:
      'None: every request runs. An unknown client is redirected to `/`.',
    probes: ['mcp/deeplink'],
    handlers: ['/mcp/deeplink']
  },
  {
    route: '/mcp/badge.svg',
    method: 'GET',
    delivery: 'worker',
    d1: false,
    why:
      'The "Add to Cursor" badge beside the same route, drawn from the query ' +
      'string — label, colours and icon are all parameters, so one prerendered ' +
      'file could only ever be one of its variants. It sets its own ' +
      '`Cache-Control: public, max-age=86400`.',
    fallback: 'None: every request runs.',
    probes: ['mcp/badge.svg'],
    handlers: ['/mcp/badge.svg']
  },
  {
    route: '/demo/echo',
    method: 'POST',
    delivery: 'worker',
    d1: false,
    why:
      'The one endpoint behind the API reference’s try-it client. It answers from ' +
      'the request body — nothing is stored and no collection is read — which is ' +
      'why it is the only D1-free route on this site that a reader ever POSTs to.',
    fallback: 'None: a POST always runs.',
    probes: ['demo/echo'],
    handlers: ['/demo/echo']
  },
  {
    route: '/robots.txt',
    method: 'GET',
    delivery: 'worker',
    d1: false,
    why:
      '`@nuxtjs/robots`, composed at request time from the site config, the ' +
      'layer’s own `disallow` and the sitemaps it has to point at. `.txt` again: ' +
      'linked or not, the crawler would not queue it. Content v3 needs no query ' +
      'for it — the v2 integration that fetched page rules is not the one in use.',
    fallback:
      'None: every request runs. It is the reason `site.url` must be set — the ' +
      'sitemap lines it emits are absolute.',
    probes: ['robots.txt'],
    handlers: ['/robots.txt']
  },
  {
    route: '/sitemap_index.xml',
    method: 'GET',
    delivery: 'asset',
    d1: false,
    why:
      'The one sitemap entry point a crawler is given, and `@nuxtjs/sitemap` ' +
      'prerenders it itself rather than leaving it to the link crawler that would ' +
      'skip an `.xml` href. It is a file, and it changes only on a rebuild.',
    fallback:
      'A build that stopped writing it would fall through to the module’s handler, ' +
      'which composes the same document from the content — and that is the failure ' +
      'this row exists to report rather than to absorb.',
    probes: ['sitemap_index.xml'],
    handlers: ['/sitemap_index.xml']
  },
  {
    route: '/sitemap.xml',
    method: 'GET',
    delivery: 'asset',
    d1: false,
    why:
      'Shipped by the module the moment a site has more than one sitemap, so a ' +
      'reader who guesses the conventional name is sent to the index rather than ' +
      'to a 404. It is a REDIRECT route rule (307 to `/sitemap_index.xml`) and ' +
      'the prerender writes redirects as a page, so what lands in the artifact is ' +
      '`sitemap.xml/index.html` holding a meta refresh — a directory, not the ' +
      'file its name suggests, which is why the probe spells it out.',
    fallback: 'The module’s handler, exactly as for the index.',
    probes: ['sitemap.xml/index.html'],
    handlers: ['/sitemap.xml']
  },
  {
    route: '/__sitemap__/{locale}.xml',
    method: 'GET',
    delivery: 'asset',
    d1: false,
    why:
      'One sitemap per locale, which is what the index points at. Prerendered by ' +
      'the module for the same reason as the index above.',
    fallback: 'The module’s handler, which queries the collections instead.',
    // The locale codes are i18n’s to decide, so naming one here would break the
    // day a locale is added. The directory is the claim.
    probes: ['__sitemap__/*'],
    handlers: ['/__sitemap__/**:sitemap']
  },
  {
    route: '/__sitemap__/style.xsl',
    method: 'GET',
    delivery: 'worker',
    d1: false,
    why:
      'The stylesheet that makes a sitemap readable in a browser. It is composed ' +
      'per request — from the `Referer`, so that the document it decorates can put ' +
      'its own name in the heading — which is precisely why it cannot be a file.',
    fallback: 'None: every request runs.',
    probes: ['__sitemap__/style.xsl'],
    handlers: ['/__sitemap__/style.xsl']
  },
  {
    route: '/__sitemap__/nuxt-content-urls.json',
    method: 'GET',
    delivery: 'worker',
    d1: true,
    why:
      'The source endpoint the sitemap module reads its Content URLs from. The ' +
      'sitemaps themselves are prerendered, so on a deployed site nothing asks for ' +
      'it — but it is registered, it is reachable, and it queries every page ' +
      'collection when it is. `.json` IS inside the crawler’s allowed extensions; ' +
      'no rendered page links it, which is the only reason no file was written.',
    fallback:
      'None: every request runs, and reads D1 doing it. It is the one route here ' +
      'that reads the database without any reader ever asking it to.',
    probes: ['__sitemap__/nuxt-content-urls.json'],
    handlers: ['/__sitemap__/nuxt-content-urls.json']
  }
];

/**
 * EVERY OTHER HANDLER THE BUILD REGISTERS, AND WHY IT IS NOT THE SITE'S.
 *
 * These are framework and module machinery: endpoints a page, the client bundle
 * or a build step calls, not a surface this site publishes or a reader ever
 * types. They are listed rather than filtered by a pattern so that each one had
 * to be looked at once, and so that a new one is a failing check rather than a
 * silent addition to a wildcard.
 */
export const EXEMPT_HANDLERS: readonly ExemptHandler[] = [
  {
    handler: '',
    why:
      'A middleware. Nitro registers them with no route at all, so the manifest ' +
      'cannot tell one from another — Nitro’s own two, the SEO modules’ and this ' +
      'repo’s `.md` twin all read as `""`. The one that answers a request as ' +
      'itself is classified as `/{page}.md` above, and the `*.md` probe is what ' +
      'holds it to that.'
  },
  {
    handler: '/__nuxt_error',
    why:
      'Nuxt’s own error renderer, reached internally when a render throws. It is ' +
      'never a URL anybody navigates to.'
  },
  {
    handler: '/__nuxt_island/',
    why:
      'Server components, fetched by the client bundle for islands. An ' +
      'implementation detail of rendering a page that is already classified.'
  },
  {
    handler: '/__nuxt_content/',
    why:
      'Content’s own dump and query endpoints, one pair per collection. The ' +
      'dumps are how the deployed database is restored into D1 on the first ' +
      'request; they are a build artefact of the content pipeline rather than a ' +
      'published route, and they are what the file comparison must not try to ' +
      'enumerate.'
  },
  {
    handler: '/_i18n/',
    why: 'The lazy-loaded message bundles `@nuxtjs/i18n` fetches per locale.'
  },
  {
    handler: '/_ipx/',
    why:
      'The image transformer. Every `<img>` on a prerendered page already points ' +
      'at a written file; this is the handler behind that.'
  },
  {
    handler: '/_og/',
    why:
      'nuxt-og-image’s renderer. `ogImage.zeroRuntime` strips it from the Workers ' +
      'bundle precisely because `@resvg/resvg-js` cannot run there — the images ' +
      'are written by the prerender pass and served as files.'
  },
  {
    handler: '/api/_nuxt_icon/',
    why:
      'The icon collections `@nuxt/icon` serves to the client for any icon not ' +
      'inlined at build time.'
  },
  {
    handler: '/.well-known/',
    why:
      'OAuth and OpenID discovery documents `@nuxtjs/mcp-toolkit` registers so an ' +
      'MCP client can probe for authorization. This deployment configures none, so ' +
      'they exist to answer that — the module’s protocol surface, not the site’s.'
  }
];

/** Files under `.output/public` a probe matches. */
function matchProbe(
  listing: readonly string[],
  present: ReadonlySet<string>,
  probe: string
): string[] {
  if (probe.startsWith('*'))
    return listing.filter((file) => file.endsWith(probe.slice(1)));
  if (probe.endsWith('*'))
    return listing.filter((file) => file.startsWith(probe.slice(0, -1)));

  return present.has(probe) ? [probe] : [];
}

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
      const matches = matchProbe(listing, present, probe);

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

/**
 * Nitro's handler manifest, read out of a built bundle.
 *
 * Generated code, so the shape is fixed — `{ route, handler, lazy, middleware,
 * method }` in that order — but very little else survives the trip. THE
 * CLOUDFLARE BUNDLE IS MINIFIED, which the Node one is not: `true` and `false`
 * come back as `!0` and `!1`, the whitespace is gone, and a lazy handler is an
 * arrow function rather than an identifier. All three are tolerated here, and
 * the handler value is matched up to a bounded length so that an arrow with a
 * comma in it cannot end the match early and a failing attempt cannot run away
 * over a seven-megabyte line.
 *
 * A regex that quietly matched nothing would turn the coverage check into a
 * no-op, which is why the empty reading is a finding in
 * `verifyHandlerCoverage` rather than a pass.
 */
export function parseHandlerRoutes(source: string): string[] {
  const boolean = '(?:true|false|!0|!1)';
  const pattern = new RegExp(
    String.raw`\{\s*route\s*:\s*(["'])((?:[^"'\\]|\\.)*?)\1\s*,\s*handler\s*:\s*[^;]{0,200}?,\s*lazy\s*:\s*${boolean}\s*,\s*middleware\s*:\s*${boolean}\s*[,}]`,
    'g'
  );

  return [...source.matchAll(pattern)].map((match) => match[2] ?? '');
}

/**
 * Require a row or an exemption for every handler the build registers.
 *
 * This is the half `verifyDeploymentRoutes` cannot do: a route with no row is
 * invisible to a comparison that only walks the rows. Pure over the manifest's
 * own route strings, so both directions are testable without a build.
 */
export function verifyHandlerCoverage(
  handlerRoutes: Iterable<string>,
  routes: readonly DeploymentRoute[] = DEPLOYMENT_ROUTES,
  exemptions: readonly ExemptHandler[] = EXEMPT_HANDLERS
): string[] {
  const registered = [...handlerRoutes];
  const findings: string[] = [];

  if (registered.length === 0) {
    return [
      'no handler manifest was found in the built server bundle, so nothing was compared. ' +
        'Nitro generates that array, so either the build is incomplete or its shape moved and ' +
        '`parseHandlerRoutes` has to move with it. This reports rather than passes on purpose: ' +
        'a coverage check that silently compares nothing is worse than no check at all.'
    ];
  }

  const claimed = new Set(routes.flatMap((entry) => entry.handlers));

  for (const handler of new Set(registered)) {
    if (claimed.has(handler)) continue;

    const exempt = exemptions.some((entry) =>
      entry.handler.endsWith('/')
        ? handler.startsWith(entry.handler)
        : handler === entry.handler
    );
    if (exempt) continue;

    findings.push(
      `the build registers a handler for \`${handler}\`, and nothing in this file says which side ` +
        'it is on. Classify it in `DEPLOYMENT_ROUTES` if it is a route this site publishes, or name ' +
        'it in `EXEMPT_HANDLERS` with the reason it is not. An unclassified handler is how ' +
        '`llms-full.txt` and `rss.xml` went unaccounted for.'
    );
  }

  const present = new Set(registered);
  for (const entry of routes) {
    for (const handler of entry.handlers) {
      if (present.has(handler)) continue;

      findings.push(
        `${entry.route} is classified against a handler for \`${handler}\`, and the build registers ` +
          'no such route. Either it moved and the row has to follow, or the route is gone and the ' +
          'row with it.'
      );
    }
  }

  return findings;
}

/** Every file under `directory`, relative to it, with `/` separators. */
function listFiles(directory: string, prefix = ''): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    // The Node preset copies the whole dependency tree in beside the bundle;
    // none of it is this build's own code.
    if (entry.isDirectory() && entry.name === 'node_modules') continue;

    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory())
      found.push(...listFiles(join(directory, entry.name), name));
    else found.push(name);
  }

  return found;
}

/** Every handler route the built server registers, wherever it was bundled. */
function readHandlerRoutes(directory: string): string[] {
  const found: string[] = [];

  for (const file of listFiles(directory)) {
    if (!file.endsWith('.mjs') && !file.endsWith('.js')) continue;
    found.push(
      ...parseHandlerRoutes(readFileSync(join(directory, file), 'utf8'))
    );
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

  const handlers = readHandlerRoutes(join(output, 'server'));
  const findings = [
    ...verifyDeploymentRoutes(listFiles(join(output, 'public'))),
    ...verifyHandlerCoverage(handlers)
  ];

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
    `\n${DEPLOYMENT_ROUTES.length} routes verified against the ${preset} build artifact, ` +
      `and all ${new Set(handlers).size} handlers it registers are classified or exempt.`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
