#!/usr/bin/env node

/**
 * Reads the SEO tags off the BUILT pages and fails the build over the ones the
 * theme promises.
 *
 * Every rule here was, until this file existed, a comment claiming something no
 * test could see. That matters more for SEO than for most things, because none
 * of it is visible: a canonical pointing at the wrong version of a page, a
 * missing `noindex` on an old one, an `hreflang` set that names a locale the
 * site does not serve — each is invisible in the browser, silent in the build,
 * and wrong for months.
 *
 * WHY THE SITE IS SERVED WITH AN ORIGIN IT DOES NOT HAVE. Half of this only
 * exists when the site knows where it is served from: `hreflang` is invalid
 * relative, and a canonical without an origin cannot be checked for one. `www`
 * states no domain, deliberately — it is a development site, and a made-up
 * domain in a committed config is a made-up domain a consumer would copy. So
 * the check hands the built server its own address instead, through the two
 * environment variables the modules already read, and the assertions run
 * against that.
 *
 * Run after `build:app`, beside `check:a11y`, for the same reason: what it
 * reads is the rendered HTML, which is the only place these tags exist.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = join(root, 'www', '.output', 'server', 'index.mjs');

const PORT = Number(process.env.SEO_CHECK_PORT ?? 3124);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const TIMEOUT = Number(process.env.SEO_CHECK_TIMEOUT_MS ?? 30_000);

/**
 * The locales `www` serves, in the order i18n lists them, and the one served
 * without a prefix.
 *
 * Written out rather than imported: the layer's config is a `.ts` module Nuxt
 * compiles, and reading it from a plain node script means loading Nuxt. If a
 * locale is added, this list is the second place to say so — and the check
 * fails loudly rather than silently skipping the new one.
 */
const LOCALES = ['en-GB', 'en-US', 'de-DE', 'es-ES', 'fr-FR', 'pt-PT', 'pt-BR'];

/** A page of each kind, as `check:a11y` picks them, plus one translation. */
const PAGES = {
  landing: '/',
  doc: '/getting-started',
  translated: '/de-DE/getting-started',
  missing: '/does-not-exist'
};

async function main() {
  if (
    !Number.isInteger(PORT) ||
    PORT < 1 ||
    PORT > 65535 ||
    !Number.isInteger(TIMEOUT) ||
    TIMEOUT < 1 ||
    TIMEOUT > 120_000
  ) {
    throw new Error(
      'SEO_CHECK_PORT must be 1..65535 and SEO_CHECK_TIMEOUT_MS must be 1..120000'
    );
  }
  const child = spawn(process.execPath, [server], {
    env: {
      ...process.env,
      PORT: String(PORT),
      NITRO_PORT: String(PORT),
      HOST: '127.0.0.1',
      NITRO_HOST: '127.0.0.1',
      NITRO_UNIX_SOCKET: '',
      NITRO_SSL_CERT: '',
      NITRO_SSL_KEY: '',
      // The two names the modules read for the same fact: i18n's for the
      // alternate links and duxt's own `absolute()`, site config's for
      // everything under @nuxtjs/seo.
      NUXT_PUBLIC_I18N_BASE_URL: ORIGIN,
      NUXT_SITE_URL: ORIGIN
    },
    stdio: 'pipe'
  });

  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));

  const failed = new Promise<never>((_resolve, reject) => {
    child.once('error', (error) =>
      reject(new Error(`server spawn failed: ${error.message}`))
    );
    child.once('exit', (code, signal) =>
      reject(
        new Error(`server exited prematurely (code ${code}, signal ${signal})`)
      )
    );
  });

  try {
    const failures = await Promise.race([
      failed,
      (async () => {
        await waitForServer(child);
        return [
          ...(await checkCanonicals()),
          ...(await checkAlternates()),
          ...(await checkMachineReadableLinks()),
          ...(await checkRobots()),
          ...(await checkSourceLanguage()),
          ...(await checkSocial()),
          ...(await checkSchemaOrg())
        ];
      })()
    ]);

    if (failures.length) {
      console.error(`\nSEO check failed:\n  - ${failures.join('\n  - ')}\n`);
      process.exitCode = 1;
      return;
    }

    console.log(
      `SEO check passed over ${Object.keys(PAGES).length} pages ` +
        `(canonical, hreflang, robots, Open Graph, schema.org).`
    );
  } catch (error) {
    console.error(`\nSEO check could not run: ${String(error)}`);
    if (stderr.trim()) console.error(stderr.trim());
    process.exitCode = 1;
  } finally {
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise<void>((resolve) =>
        child.once('exit', () => resolve())
      );
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 1000);
      await exited;
      clearTimeout(timer);
    }
    // A broken socket can reject fetch before Node emits the child's exit.
    if (child.exitCode !== null && child.exitCode !== 0) {
      console.error(`server exited prematurely (code ${child.exitCode})`);
    }
  }
}

async function waitForServer(child: ChildProcessWithoutNullStreams) {
  // Nitro emits this only after its own listen callback succeeds. HTTP polling
  // alone can accept an unrelated process after our child fails to bind.
  await new Promise<void>((resolve, reject) => {
    let stdout = '';
    const timer = setTimeout(() => {
      child.stdout.off('data', onData);
      reject(
        new Error(
          `server startup timed out after ${TIMEOUT}ms at ${ORIGIN}. Run \`pnpm build:app\` first.`
        )
      );
    }, TIMEOUT);
    function onData(chunk: Buffer) {
      stdout = (stdout + chunk.toString()).slice(-4096);
      if (stdout.split(/\r?\n/).includes(`Listening on ${ORIGIN}`)) {
        clearTimeout(timer);
        child.stdout.off('data', onData);
        resolve();
      }
    }
    child.once('exit', () => clearTimeout(timer));
    child.once('error', () => clearTimeout(timer));
    child.stdout.on('data', onData);
  });
}

async function head(route: string) {
  const requested = `${ORIGIN}${route}`;
  const signal = AbortSignal.timeout(TIMEOUT);
  let response: Response | undefined;
  let html: string;
  try {
    response = await fetch(requested, {
      redirect: 'manual',
      signal,
      // Nitro needs this to render its error route as HTML instead of JSON.
      headers: { accept: 'text/html' }
    });
    html = await response.text();
  } catch (error) {
    throw new Error(
      `response ${signal.aborted ? `timed out after ${TIMEOUT}ms` : 'failed'}: ` +
        `requested ${requested}; final ${response?.url ?? '(not received)'}; ` +
        `HTTP ${response?.status ?? '(not received)'}; ` +
        `content-type ${response?.headers.get('content-type') ?? '(not received)'}; ${String(error)}`
    );
  }
  const contentType = response.headers.get('content-type') ?? '(missing)';
  const expected =
    route === PAGES.missing ? response.status === 404 : response.ok;
  if (!expected || !/^text\/html(?:;|$)/i.test(contentType)) {
    const headMarkup =
      html.match(/<head\b[^>]*>[\s\S]*?<\/head>/i)?.[0] ?? html;
    throw new Error(
      `invalid HTML response: requested ${requested}; final ${response.url}; ` +
        `HTTP ${response.status}; content-type ${contentType}; ` +
        `expected ${route === PAGES.missing ? '404' : '2xx'} HTML` +
        (response.headers.has('location')
          ? `; location ${response.headers.get('location')}`
          : '') +
        `; head ${headMarkup.slice(0, 2000)}`
    );
  }

  const { window } = new JSDOM(html, {
    url: `${ORIGIN}${route}`
  });

  return window.document;
}

function meta(document: Document, name: string) {
  return (
    document
      .querySelector(`meta[property="${name}"]`)
      ?.getAttribute('content') ??
    document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ??
    undefined
  );
}

/**
 * ONE canonical per page, absolute, and spelled as the route is.
 *
 * The count is the point: nuxt-seo-utils writes one of its own, and the version
 * rules in `[...slug].vue` write the one that has to win. Two shipping together
 * is the failure this cannot be allowed to have — a crawler picking either is a
 * crawler picking at random.
 */
async function checkCanonicals() {
  const failures: string[] = [];

  for (const [kind, route] of Object.entries(PAGES)) {
    if (kind === 'missing') continue;

    const document = await head(route);
    const links = [...document.querySelectorAll('link[rel="canonical"]')];

    if (links.length !== 1) {
      failures.push(
        `${route}: expected exactly one canonical, found ${links.length}`
      );
      continue;
    }

    const href = links[0]?.getAttribute('href') ?? '';

    if (!href.startsWith(ORIGIN)) {
      failures.push(`${route}: canonical is not absolute against the site url`);
    }

    // `canonicalLowercase: false` in nuxt.config, asserted: a locale prefix is
    // case-sensitive, and lowercasing it points every translated page at a URL
    // that does not exist.
    if (kind === 'translated' && !href.includes('/de-DE/')) {
      failures.push(
        `${route}: canonical lost the locale's case — got ${href || '(empty)'}`
      );
    }
  }

  return failures;
}

/**
 * The alternate links name every locale the site serves, both ways, plus
 * `x-default`.
 *
 * A partial set is worse than none: it tells a search engine these three pages
 * are translations of one another and leaves the fourth looking like a
 * duplicate of whichever it matched first.
 */
async function checkAlternates() {
  const failures: string[] = [];

  for (const route of [PAGES.doc, PAGES.translated]) {
    const document = await head(route);
    const found = new Set(
      [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(
        (link) => link.getAttribute('hreflang') ?? ''
      )
    );

    for (const locale of LOCALES) {
      if (!found.has(locale)) {
        failures.push(`${route}: no hreflang for ${locale}`);
      }
    }

    if (!found.has('x-default')) {
      failures.push(
        `${route}: no x-default, so no locale is named as the fallback`
      );
    }
  }

  return failures;
}

/** Every documentation page advertises its source Markdown and site index. */
async function checkMachineReadableLinks() {
  const failures: string[] = [];

  for (const route of [PAGES.doc, PAGES.translated, '/demo/v1.x/api']) {
    const document = await head(route);
    const markdown = document.querySelector(
      'link[rel="alternate"][type="text/markdown"]'
    );
    if (markdown?.getAttribute('href') !== `${route}.md`) {
      failures.push(`${route}: no Markdown alternate for its public URL`);
    }
    const index = document.querySelector('link[rel="describedby"]');
    if (index?.getAttribute('href') !== '/llms.txt') {
      failures.push(`${route}: no llms.txt describedby link`);
    }
  }

  return failures;
}

/** What must not be indexed, is not. */
async function checkRobots() {
  const failures: string[] = [];

  const missing = meta(await head(PAGES.missing), 'robots');
  if (!missing?.includes('noindex')) {
    failures.push(
      `${PAGES.missing}: the error page is indexable (robots: ${missing ?? 'unset'})`
    );
  }

  // The mirror of it: an ordinary page in the default locale must NOT carry
  // noindex, or the rule above would pass a site nobody can find at all.
  const doc = meta(await head(PAGES.doc), 'robots');
  if (doc?.includes('noindex')) {
    failures.push(`${PAGES.doc}: an ordinary page carries noindex`);
  }

  return failures;
}

/** The demo deliberately omits locales: its original is still English. */
async function checkSourceLanguage() {
  const failures: string[] = [];
  for (const [route, fallback, noindex] of [
    ['/demo', false, false],
    ['/en-US/demo', false, false],
    ['/de-DE/demo', true, true],
    ['/demo/api', false, false],
    ['/de-DE/demo/api', true, true],
    ['/demo/v1.x/api', false, true]
  ] as const) {
    const document = await head(route);
    const title = route.endsWith('/api') ? 'Harbour' : 'Overview';
    if (document.querySelector('h1')?.textContent?.trim() !== title) {
      failures.push(`${route}: expected the demo page to render`);
    }
    const banner = [...document.querySelectorAll('[role="status"]')].some(
      (notice) => notice.textContent?.includes('English (UK)')
    );
    if (Boolean(banner) !== fallback) {
      failures.push(`${route}: unexpected translation-fallback banner state`);
    }
    if (Boolean(meta(document, 'robots')?.includes('noindex')) !== noindex) {
      failures.push(`${route}: unexpected robots indexing state`);
    }
  }
  return failures;
}

/**
 * The tags a share card is built from — including the two this layer never
 * writes by hand, because nuxt-seo-utils derives them from the title and
 * description.
 */
async function checkSocial() {
  const failures: string[] = [];

  for (const route of [PAGES.landing, PAGES.doc]) {
    const document = await head(route);

    for (const tag of ['og:title', 'og:description', 'og:image']) {
      if (!meta(document, tag)) failures.push(`${route}: no ${tag}`);
    }

    const locale = meta(document, 'og:locale');
    if (!locale) {
      failures.push(`${route}: no og:locale`);
    } else if (locale.includes('-')) {
      failures.push(
        `${route}: og:locale is ${locale}; Open Graph spells it with an underscore`
      );
    }
  }

  // The default locale's page names the others as alternates, which is what
  // makes a share card come back in the reader's language.
  const alternates = [
    ...(await head(PAGES.doc)).querySelectorAll(
      'meta[property="og:locale:alternate"]'
    )
  ].length;

  if (alternates !== LOCALES.length - 1) {
    failures.push(
      `${PAGES.doc}: ${alternates} og:locale:alternate tags for ` +
        `${LOCALES.length - 1} other locales`
    );
  }

  return failures;
}

/**
 * One graph per page, and the nodes each kind of page owes.
 *
 * The count matters here too: the hand-written `@graph` this replaced lived in
 * the page, and a second script tag would mean the two are both still shipping
 * — the same silent duplication as the canonical.
 */
async function checkSchemaOrg() {
  const failures: string[] = [];

  const expected: Record<string, string[]> = {
    [PAGES.landing]: ['WebSite'],
    [PAGES.doc]: ['WebSite', 'TechArticle', 'BreadcrumbList']
  };

  for (const [route, types] of Object.entries(expected)) {
    const document = await head(route);
    const scripts = [
      ...document.querySelectorAll('script[type="application/ld+json"]')
    ];

    if (scripts.length !== 1) {
      failures.push(
        `${route}: expected one ld+json graph, found ${scripts.length}`
      );
      continue;
    }

    let graph: unknown;
    try {
      graph = JSON.parse(scripts[0]?.textContent ?? '');
    } catch (error) {
      failures.push(`${route}: the ld+json does not parse — ${String(error)}`);
      continue;
    }

    const nodes = (graph as { '@graph'?: { '@type'?: unknown }[] })['@graph'];
    if (!Array.isArray(nodes)) {
      failures.push(`${route}: the ld+json has no @graph`);
      continue;
    }

    const present = new Set(
      nodes.flatMap((node) =>
        Array.isArray(node['@type'])
          ? (node['@type'] as string[])
          : [String(node['@type'])]
      )
    );

    for (const type of types) {
      if (!present.has(type)) failures.push(`${route}: no ${type} node`);
    }
  }

  return failures;
}

await main();
