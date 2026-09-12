#!/usr/bin/env node

/**
 * Fails the build when a page scrolls sideways on a phone.
 *
 * WHY THIS EXISTS. #91 was `/getting-started` overflowing the document by 56px
 * at 320px, and three of duxt's own pages did the same: the title row is
 * `nowrap`, the copy control is `shrink-0` by choice, and an `<h1>` keeps
 * `min-width: auto` — so a title whose longest word is wide at `text-4xl` pins
 * the row at that word's min-content and the page is simply wider than the
 * screen. It had been that way for as long as the header had existed, on the
 * documentation's own entry point, and **every gate was green**: `check:a11y`
 * runs axe under jsdom, which has no layout at all and reports the two rules
 * that would need one (`color-contrast`, `target-size`) as skipped rather than
 * passed; `check:images` does arithmetic on `sizes` and `srcset` rather than
 * measuring anything; `check:keyboard` drives a real browser but asks only what
 * a key does, at one desktop viewport. A width nothing measures is a width
 * nothing protects.
 *
 * NO BROWSER IS DOWNLOADED — see `browser.ts`. This is the second caller of it,
 * and the reason finding one moved out of `check-keyboard.ts`.
 *
 * WHAT IT ASSERTS, and why it is two things rather than one:
 *
 *   - **The document does not scroll horizontally.** `scrollWidth` against
 *     `clientWidth` on the root element, which is the reader's own complaint
 *     stated in one number, and the number the issue was measured in.
 *   - **Nothing the reader needs was hidden to achieve that.** The heading is
 *     not clipped inside its own box, and the copy control still lies fully
 *     within the viewport. Without this, `overflow-hidden` on the row or
 *     `truncate` on the title passes the first assertion while destroying the
 *     page — and #91's own conclusion was that a clipped title is worse than a
 *     wrapped control. The check has to be unable to accept the cure it warns
 *     against.
 *
 * CONTENT THAT IS LEGITIMATELY WIDE IS NOT THE SUBJECT. A code fence, a wide
 * table and a mermaid diagram are all wider than a 320px column and all sit in
 * their own `overflow-x: auto` scroller, so they never reach the document's
 * scroll width — which is exactly the distinction the first assertion draws for
 * free, and why `/adr` (whose body is a table far wider than the phone) is one
 * of the routes below rather than an exception to them.
 *
 * THE WIDTHS ARE 320 AND 412, the same pair `check:images` uses: the narrowest
 * phone still in use, and the commonest Android width. 320 is where the header
 * broke; 412 is where it did not, and a check that only ever looked at the
 * breaking width could not tell a fix from a change that moved the breakage.
 *
 * Run after `build:app`, beside `check:a11y`, `check:seo`, `check:images` and
 * `check:keyboard`, for the same reason — what it measures is the built site.
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser } from 'playwright-core';
import { chromium } from 'playwright-core';
import { browserPath, missingBrowser } from './browser.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = join(root, 'www', '.output', 'server', 'index.mjs');

const PORT = Number(process.env.OVERFLOW_CHECK_PORT ?? 3127);

/** In CSS pixels, at device pixel ratio 1. */
const WIDTHS = [320, 412];

/**
 * One page of each kind that draws a different header or a different body.
 *
 * Deliberately a handful rather than a crawl: every route costs two page loads,
 * this runs inside `pnpm check`, and the failure is a property of the SHELL —
 * the header row, the banners, the version switcher — which repeats on every
 * page of a kind. A crawl would buy the 2,918th instance of the same six
 * answers. The reason beside each one is what makes it replaceable: swap a
 * route when its reason stops being true, not because a list grew stale.
 */
const ROUTES: { path: string; why: string }[] = [
  { path: '/', why: 'the landing layout — hero, showcase, tabs, no article' },
  {
    path: '/getting-started',
    why: "#91's own page: a written page whose title is one unbreakable word"
  },
  {
    path: '/concepts/sources',
    why: 'a written page carrying code fences far wider than the column'
  },
  {
    path: '/adr',
    why: 'a generated index whose body is a table far wider than the column'
  },
  {
    path: '/demo',
    why: 'a versioned section — the version switcher and banners ride along'
  },
  { path: '/demo/images', why: 'the image fixture: one picture of each shape' }
];

/** What one route at one width looks like from the outside. */
type Measured = {
  status: number;
  /** `scrollWidth - clientWidth` on the root element. The reader's complaint. */
  overflow: number;
  viewport: number;
  /** How far the heading's own text spills out of the heading's box. */
  headingClipped: number;
  headingText: string | null;
  /** How far the copy control lies outside the viewport, if it renders. */
  controlOutside: number;
  /** The widest things that escape, deepest first — diagnosis, not assertion. */
  escaping: { tag: string; classes: string; right: number; text: string }[];
};

/**
 * Everything the assertions need, read in one pass in the page.
 *
 * The escaping-element list exists because `scrollWidth - clientWidth` says
 * that a page is too wide and nothing about what made it so — and the answer is
 * never obvious from the source, since the culprit is whichever box could not
 * give rather than whichever box is widest. Anything inside a scroller is
 * filtered out: it cannot move the document, so naming it would bury the one
 * element that can.
 */
function measure() {
  const de = document.documentElement;
  const viewport = de.clientWidth;

  const scrolls = (element: Element) => {
    for (let node = element.parentElement; node && node !== de;) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX !== 'visible' && overflowX !== 'clip') return true;
      node = node.parentElement;
    }

    return false;
  };

  const escaping = [...document.querySelectorAll<HTMLElement>('main *')]
    .map((element) => ({ element, box: element.getBoundingClientRect() }))
    .filter(({ box }) => box.width > 0 && box.right > viewport + 0.5)
    .filter(({ element }) => !scrolls(element))
    .map(({ element, box }) => ({
      tag: element.tagName.toLowerCase(),
      classes: (element.getAttribute('class') ?? '').slice(0, 70),
      right: Math.round(box.right * 10) / 10,
      text: (element.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40),
      depth: (() => {
        let depth = 0;
        for (let node = element; node.parentElement; node = node.parentElement)
          depth++;
        return depth;
      })()
    }))
    .sort((a, b) => b.depth - a.depth || b.right - a.right)
    .slice(0, 6);

  const heading = document.querySelector('main h1');
  const control = document.querySelector<HTMLElement>('[data-duxt-copy-page]');
  const controlBox = control?.getBoundingClientRect();

  return {
    overflow: de.scrollWidth - de.clientWidth,
    viewport,
    headingClipped: heading
      ? Math.max(0, heading.scrollWidth - heading.clientWidth)
      : 0,
    headingText: heading?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
    controlOutside: controlBox
      ? Math.round(
          Math.max(0, controlBox.right - viewport, -controlBox.left) * 10
        ) / 10
      : 0,
    escaping: escaping.map(({ depth: _depth, ...rest }) => rest)
  };
}

async function main() {
  const executablePath = browserPath();

  if (!executablePath) {
    console.error(missingBrowser('Overflow check'));
    process.exitCode = 1;
    return;
  }

  const child = spawn(process.execPath, [server], {
    env: { ...process.env, PORT: String(PORT), NITRO_PORT: String(PORT) },
    stdio: ['ignore', 'ignore', 'pipe']
  });

  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));

  // `--no-sandbox` because CI and this repo's containers run as root, where
  // Chromium's own sandbox refuses to start. Nothing untrusted is loaded here.
  const browser = await chromium.launch({
    executablePath,
    args: ['--no-sandbox']
  });

  try {
    await waitForServer();

    const { failures, notes } = await sweep(browser);

    if (failures.length) {
      console.error(
        `\nOverflow check failed:\n\n${failures.join('\n\n')}\n\n` +
          '  A page wider than the screen is a page the reader drags sideways ' +
          'to read.\n  The fix is to let something in the row give — not to ' +
          'hide what overflowed.\n'
      );
      process.exitCode = 1;
      return;
    }

    console.log(`Overflow check passed.\n  ${notes.join('\n  ')}`);
  } catch (error) {
    console.error(`\nOverflow check could not run: ${String(error)}`);
    if (stderr.trim()) console.error(stderr.trim());
    process.exitCode = 1;
  } finally {
    await browser.close();
    child.kill('SIGTERM');
  }
}

async function sweep(browser: Browser) {
  const failures: string[] = [];
  const notes: string[] = [];

  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: 900 }
    });
    const page = await context.newPage();
    let widest = 0;

    try {
      for (const route of ROUTES) {
        const response = await page.goto(url(route.path), {
          waitUntil: 'networkidle',
          timeout: 60_000
        });

        const status = response?.status() ?? 0;

        // A route that stopped existing must not pass by rendering a 404 that
        // happens to fit — the reason it was chosen is gone either way.
        if (status !== 200) {
          failures.push(
            `  ${route.path} answered ${status} at ${width}px, so nothing ` +
              `about it was measured.\n  It is on the list because it is ` +
              `${route.why}; give the list a route that still is.`
          );
          continue;
        }

        const measured: Measured = {
          status,
          ...(await page.evaluate(measure))
        };

        widest = Math.max(widest, measured.overflow);
        failures.push(...verdict(route, width, measured));
      }
    } finally {
      await context.close();
    }

    notes.push(
      `${width}px: ${ROUTES.length} pages, widest overflow ${widest}px ` +
        '(0 is the bar)'
    );
  }

  return { failures, notes };
}

/** Everything wrong with one page at one width, said in the reader's terms. */
function verdict(
  route: { path: string; why: string },
  width: number,
  measured: Measured
): string[] {
  const failures: string[] = [];

  if (measured.overflow > 0) {
    const culprits = measured.escaping.length
      ? measured.escaping
          .map(
            (element) =>
              `      <${element.tag} class="${element.classes}"> reaches ` +
              `${element.right}px${element.text ? ` — "${element.text}"` : ''}`
          )
          .join('\n')
      : '      nothing inside <main> escaped, so the width comes from the shell';

    failures.push(
      `  ${route.path} at ${width}px scrolls sideways by ` +
        `${measured.overflow}px.\n    The container ends at ` +
        `${measured.viewport}px and these reach past it:\n${culprits}`
    );
  }

  if (measured.headingClipped > 0) {
    failures.push(
      `  ${route.path} at ${width}px clips its own heading by ` +
        `${measured.headingClipped}px — "${measured.headingText}".\n    A ` +
        'title the reader cannot finish is not a fix for a row that is too ' +
        'wide; let the row wrap instead.'
    );
  }

  if (measured.controlOutside > 0) {
    failures.push(
      `  ${route.path} at ${width}px leaves the copy control ` +
        `${measured.controlOutside}px outside the viewport.\n    It is either ` +
        'unreachable or it is what makes the page scroll.'
    );
  }

  return failures;
}

const url = (route: string) => `http://localhost:${PORT}${route}`;

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch(url('/'));
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(
    `the built server did not answer on port ${PORT}. Run \`pnpm build:app\` first.`
  );
}

await main();
