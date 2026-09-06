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
 * everything, and the 404 has its own view. A sixth page of the same shape
 * would add runtime and no coverage.
 */
const ROUTES = [
  '/',
  '/duxt/getting-started',
  '/duxt/reference/mdc-components',
  '/workflows/v0.7.0',
  '/duxt/does-not-exist'
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
