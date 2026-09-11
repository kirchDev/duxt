#!/usr/bin/env node

/**
 * Runs axe-core over a handful of rendered pages.
 *
 * Without it every accessibility fix in this theme decays at the next
 * redesign — the same reasoning as the link checker: a rule nobody enforces is
 * a rule that lasts until the next person moves a div. Five landmarks lost
 * their labels once already.
 *
 * WHAT THIS CAN AND CANNOT SEE. The pages are fetched from the built server and
 * parsed with jsdom, which has no layout engine. So the rules that need
 * geometry or computed colour — `color-contrast`, `target-size` — cannot run
 * here at all, and are reported as skipped rather than passed. What DOES run is
 * the structural half: landmarks and their labels, form and button names, image
 * alternatives, heading order, ARIA validity, the language of the document.
 * That is the half a redesign breaks.
 *
 * A browser-driven check would cover the rest and costs a Playwright download
 * in every CI run and on every contributor's machine. The contrast question is
 * answered once, by measurement, in `duxt.css` — see the comment on
 * `--muted-foreground` — rather than on every build.
 *
 * Run after `build:app`, which is why it sits last in `check`.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import axe from 'axe-core';
import { JSDOM } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = join(root, 'www', '.output', 'server', 'index.mjs');

/**
 * One page of each KIND, not a crawl.
 *
 * The chrome is what this checks, and the chrome differs by layout: the landing
 * page has no sidebar, a section root has no table of contents, a deep page has
 * everything, an embedded panel has an iframe, a generated section's markup is
 * a parser's output rather than a written page, and the 404 has its own view.
 * Another page of a shape already here would add runtime and no coverage.
 *
 * WRITE THE ROUTES THE SITE ACTUALLY SERVES. Three of these carried a `/duxt/`
 * prefix and a `/workflows/v0.7.0` from a multi-source configuration `www` no
 * longer has, so they 404'd — and a 404 renders the error view, which passes.
 * The gate reported five pages while checking the same error page three times.
 * A route that moves must move here too; `curl -o /dev/null -w '%{http_code}'`
 * over this list against the built server is the whole check.
 */
const ROUTES = [
  '/',
  '/getting-started',
  '/reference/mdc-components',
  // The one page with an iframe, so `frame-title` has something to judge.
  '/reference/devtools/sources',
  // A GENERATED SECTION, which is a shape of its own: its pages are written by
  // a type's parser rather than by hand, so their heading order and their links
  // are the parser's output and nothing else here would check them. This one is
  // the changelog overview — a filter row of toggle buttons over a timeline,
  // and the only page here whose controls carry `aria-pressed`.
  '/releases',
  // One release, which is where the group components draw their own headings:
  // an `<h2>` a component renders is outside the outline Content builds, so
  // nothing but a rendered page can say whether the order still holds.
  '/releases/v0.1.0',
  '/demo/changelog',
  '/demo/changelog/v0.5.0',
  // The fixture changelog at the other granularity — one page, in the ordinary
  // docs chrome. A type that names no layout for the options it was given is a
  // decision only a rendered page proves, and its headings run three levels
  // deep where the split pages run two.
  '/demo/changelog-flat',
  // The OTHER shape a generated section has: a type that names a layout draws
  // its own page, so neither the docs header nor the docs sidebar is what is
  // being checked here — the reference layout and a parser's operation page
  // are, and nothing else on this list would catch a heading order or an
  // unlabelled control in either.
  '/demo/api',
  '/demo/api/consignments/listconsignments',
  // The SECOND type in that layout, and the reason it is worth a third entry
  // here rather than trusted to the two above: the request page draws the same
  // client from different props, and the overview draws two controls — a
  // download and an outbound link — that no other page on this list has.
  '/demo/collection',
  '/demo/collection/consignments/create-a-consignment',
  // THE ONLY PAGE THAT RENDERS AN IMAGE. Every `![…]` in the component
  // reference sits inside a fenced code block, so without this route the gate
  // never reaches `ProseImg` at all — and what it draws is a `<button>` around
  // an image with a decorative indicator inside it, which is precisely the
  // shape axe has an opinion about: the button's name, the image's
  // alternative, and whether the indicator is hidden from the tree.
  '/demo/images',
  '/does-not-exist'
];

const PORT = 3123;

/** Rules jsdom cannot answer. Reported, never silently passed. */
const NEEDS_LAYOUT = new Set(['color-contrast', 'target-size']);

async function main() {
  const child = spawn(process.execPath, [server], {
    env: { ...process.env, PORT: String(PORT), NITRO_PORT: String(PORT) },
    stdio: ['ignore', 'ignore', 'pipe']
  });

  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));

  try {
    await waitForServer();

    const failures: string[] = [];

    for (const route of ROUTES) {
      failures.push(...(await check(route)));
    }

    if (failures.length) {
      console.error(
        `\nAccessibility check failed:\n  - ${failures.join('\n  - ')}\n`
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      `Accessibility check passed over ${ROUTES.length} pages ` +
        `(${[...NEEDS_LAYOUT].join(', ')} not run: no layout in jsdom).`
    );
  } catch (error) {
    console.error(`\nAccessibility check could not run: ${String(error)}`);
    if (stderr.trim()) console.error(stderr.trim());
    process.exitCode = 1;
  } finally {
    child.kill('SIGTERM');
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch(`http://localhost:${PORT}/`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(
    `the built server did not answer on port ${PORT}. Run \`pnpm build:app\` first.`
  );
}

async function check(route: string): Promise<string[]> {
  // Ask for HTML explicitly. Without the header Nitro answers an error route
  // with JSON, and the check then reports the 404 page as having no title and
  // no language — which it would, if it were the thing being served.
  const response = await fetch(`http://localhost:${PORT}${route}`, {
    headers: { accept: 'text/html' }
  });
  const html = await response.text();

  const dom = new JSDOM(html, {
    url: `http://localhost:${PORT}${route}`,
    pretendToBeVisual: true
  });

  const { window } = dom;

  // axe reads globals rather than taking a document, so they are installed for
  // the length of one page and taken away again — two pages sharing a leaked
  // `window` is how a run starts reporting the previous page's markup.
  const globals = globalThis as Record<string, unknown>;
  const previous = {
    window: globals.window,
    document: globals.document,
    Node: globals.Node,
    Element: globals.Element,
    HTMLElement: globals.HTMLElement,
    NodeList: globals.NodeList,
    getComputedStyle: globals.getComputedStyle
  };

  Object.assign(globals, {
    window,
    document: window.document,
    Node: window.Node,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    NodeList: window.NodeList,
    getComputedStyle: window.getComputedStyle.bind(window)
  });

  try {
    const results = await axe.run(window.document.documentElement, {
      resultTypes: ['violations'],
      rules: Object.fromEntries(
        [...NEEDS_LAYOUT].map((rule) => [rule, { enabled: false }])
      )
    });

    return results.violations.map(
      (violation) =>
        `${route}: ${violation.id} — ${violation.help} ` +
        `(${violation.nodes.length} element${violation.nodes.length === 1 ? '' : 's'}; ` +
        `first: ${violation.nodes[0]?.target.join(' ')})`
    );
  } finally {
    Object.assign(globals, previous);
    window.close();
  }
}

await main();
