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

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = join(root, 'www', '.output', 'server', 'index.mjs');

const PORT = 3124;
const ORIGIN = `http://localhost:${PORT}`;

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
  const child = spawn(process.execPath, [server], {
    env: {
      ...process.env,
      PORT: String(PORT),
      NITRO_PORT: String(PORT),
      // The two names the modules read for the same fact: i18n's for the
      // alternate links and duxt's own `absolute()`, site config's for
      // everything under @nuxtjs/seo.
      NUXT_PUBLIC_I18N_BASE_URL: ORIGIN,
      NUXT_SITE_URL: ORIGIN
    },
    stdio: ['ignore', 'ignore', 'pipe']
  });

  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));

  try {
    await waitForServer();

    const failures = [
      ...(await checkCanonicals()),
      ...(await checkAlternates()),
      ...(await checkRobots()),
      ...(await checkSocial()),
      ...(await checkSchemaOrg())
    ];

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
    child.kill('SIGTERM');
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch(`${ORIGIN}/`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(
    `the built server did not answer on port ${PORT}. Run \`pnpm build:app\` first.`
  );
}

async function head(route: string) {
  const response = await fetch(`${ORIGIN}${route}`, {
    // Without the header Nitro answers an error route with JSON, and the check
    // then reads no tags at all off a page that renders plenty.
    headers: { accept: 'text/html' }
  });

  const { window } = new JSDOM(await response.text(), {
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
