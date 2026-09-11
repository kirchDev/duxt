#!/usr/bin/env node

/**
 * Reads the images off a BUILT page and fails the build over what `ProseImg`
 * promises.
 *
 * WHY THIS EXISTS AT ALL. Every `![…]` in the component reference sits inside a
 * fenced code block, so for as long as this repository has had a `ProseImg` the
 * build has never rendered one — and a component nothing renders is a component
 * nothing checks. The zoom had been broken since the day it was written: Vue
 * casts an ABSENT prop whose type includes `Boolean` to `false`, so
 * `zoom?: boolean | string` made every image non-zoomable unless a page wrote
 * `zoom="true"`, and there was no page to notice. `www/demo/docs/3.images.md`
 * is the fixture that renders one of each shape; this is what reads the result.
 *
 * WHAT IT ASSERTS IS THE ISSUE'S OWN ACCEPTANCE. A large original has to expose
 * responsive candidates, a narrow viewport has to be able to pick a smaller one
 * than a desktop, an original narrower than the column must not be distorted,
 * the formats a provider would ruin must carry no `srcset`, a zoomable image
 * has to be one named button with an indicator, and `zoom="false"` has to leave
 * an image completely inert.
 *
 * The candidate comparison is arithmetic on the `sizes` and `srcset` the page
 * actually shipped, run through the selection rule a browser uses — not a
 * browser. jsdom has no layout and Playwright is a download in every CI run;
 * what a browser adds here is the rendered width, and `sizes` is precisely the
 * author's statement of that width. What cannot be answered this way is said
 * so rather than asserted: nothing below claims anything about how the picture
 * LOOKS.
 *
 * Run after `build:app`, beside `check:a11y` and `check:seo`, for the same
 * reason — what it reads is the rendered HTML.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = join(root, 'www', '.output', 'server', 'index.mjs');

const PORT = Number(process.env.IMAGE_CHECK_PORT ?? 3125);

/** The fixture page, and the only route on the site that renders an image. */
const ROUTE = '/demo/images';

/**
 * Viewports, in CSS pixels, at device pixel ratio 1.
 *
 * 320 is the narrowest phone still in use and 412 the commonest Android width;
 * 1440 is a laptop. Fixed DPR because the comparison is about the SLOT, and a
 * retina phone would otherwise be asked for more pixels than a desktop while
 * drawing a smaller picture — true, and not what is under test.
 */
const NARROW = [320, 412];
const DESKTOP = 1440;

type Candidate = { url: string; width: number };

/** `sizes`, as the browser reads it: the first matching clause wins. */
function slotWidth(sizes: string, viewport: number): number {
  for (const clause of sizes.split(',').map((part) => part.trim())) {
    const media = clause.match(/^\((.+?)\)\s+(.+)$/);
    const length = media ? media[2]! : clause;

    if (media) {
      const max = media[1]!.match(/max-width:\s*(\d+(?:\.\d+)?)px/);
      const min = media[1]!.match(/min-width:\s*(\d+(?:\.\d+)?)px/);

      if (max && viewport > Number(max[1])) continue;
      if (min && viewport < Number(min[1])) continue;
    }

    const vw = length.match(/^(\d+(?:\.\d+)?)vw$/);
    if (vw) return (Number(vw[1]) / 100) * viewport;

    const px = length.match(/^(\d+(?:\.\d+)?)px$/);
    if (px) return Number(px[1]);

    throw new Error(`a length this check cannot read: ${length}`);
  }

  throw new Error(`no clause of "${sizes}" matches a ${viewport}px viewport`);
}

/** The candidate a browser picks: the narrowest that still covers the slot. */
function chosen(
  candidates: Candidate[],
  sizes: string,
  viewport: number,
  dpr = 1
): Candidate {
  const needed = slotWidth(sizes, viewport) * dpr;
  const ascending = [...candidates].sort((a, b) => a.width - b.width);

  return ascending.find((c) => c.width >= needed) ?? ascending.at(-1)!;
}

function candidates(srcset: string): Candidate[] {
  return srcset
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [url, descriptor] = part.split(/\s+/);

      return { url: url!, width: Number.parseInt(descriptor ?? '', 10) };
    });
}

/**
 * Every image on the page, keyed by its alt text.
 *
 * FIRST OCCURRENCE WINS, and the one case where that matters is the point:
 * a dark twin carries the SAME alt as the light file, because only one of the
 * two is ever in the accessibility tree and a reader who switched theme has not
 * changed what the picture is of. The twin is found by its source below.
 */
function images(document: Document): Map<string, HTMLImageElement> {
  const found = new Map<string, HTMLImageElement>();

  for (const image of document.querySelectorAll('img')) {
    const alt = image.getAttribute('alt');
    if (alt && !found.has(alt)) found.set(alt, image as HTMLImageElement);
  }

  return found;
}

/**
 * The button `ProseImg` wraps a zoomable image in, or null.
 *
 * By structure rather than by class: a class is a styling decision and this is
 * asking whether the image is a control at all.
 */
function trigger(image: Element): HTMLButtonElement | null {
  return image.closest('button');
}

const FIXTURES = {
  light: 'A documentation site',
  noDimensions: 'The same fixture, with no dimensions declared',
  badge: 'A build badge',
  vector: 'How a source becomes a page',
  animation: 'A spinner, looping',
  inert: 'A decorative ornament, not zoomable'
};

/** The dark twin, which shares the light file's alt and so needs its own handle. */
const DARK_TWIN = 'img[srcset*="screenshot-dark"]';

async function main() {
  const child = spawn(process.execPath, [server], {
    env: { ...process.env, PORT: String(PORT), NITRO_PORT: String(PORT) },
    stdio: ['ignore', 'ignore', 'pipe']
  });

  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));

  try {
    await waitForServer();

    const response = await fetch(`http://localhost:${PORT}${ROUTE}`, {
      headers: { accept: 'text/html' }
    });

    if (!response.ok) {
      throw new Error(
        `${ROUTE} answered ${response.status}. The fixture page is what this ` +
          `check reads; without it nothing renders a ProseImg.`
      );
    }

    const { window } = new JSDOM(await response.text());
    const found = images(window.document);
    const failures: string[] = [];

    for (const [name, alt] of Object.entries(FIXTURES)) {
      if (!found.has(alt))
        failures.push(`the ${name} fixture is not on ${ROUTE}`);
    }

    const dark = window.document.querySelector(
      DARK_TWIN
    ) as HTMLImageElement | null;
    if (!dark) failures.push(`the dark twin is not on ${ROUTE}`);

    if (!failures.length) {
      failures.push(...responsive(found, dark!));
      failures.push(...passThrough(found));
      failures.push(...affordance(found));
    }

    if (failures.length) {
      console.error(`\nImage check failed:\n  - ${failures.join('\n  - ')}\n`);
      process.exitCode = 1;
      return;
    }

    console.log(
      `Image check passed over ${Object.keys(FIXTURES).length} images on ${ROUTE} ` +
        `(how they LOOK is not checked: no layout here).`
    );
  } catch (error) {
    console.error(`\nImage check could not run: ${String(error)}`);
    if (stderr.trim()) console.error(stderr.trim());
    process.exitCode = 1;
  } finally {
    child.kill('SIGTERM');
  }
}

/** A large original, and what each viewport is handed of it. */
function responsive(
  found: Map<string, HTMLImageElement>,
  dark: HTMLImageElement
): string[] {
  const failures: string[] = [];

  for (const [alt, image] of [
    [FIXTURES.light, found.get(FIXTURES.light)!],
    ['the dark twin', dark],
    [FIXTURES.noDimensions, found.get(FIXTURES.noDimensions)!]
  ] as const) {
    const srcset = image.getAttribute('srcset');
    const sizes = image.getAttribute('sizes');

    if (!srcset || !sizes) {
      failures.push(
        `"${alt}" ships no ${!srcset ? 'srcset' : 'sizes'} — the whole original ` +
          `is downloaded whatever the screen`
      );
      continue;
    }

    const list = candidates(srcset);

    if (list.length < 2) {
      failures.push(
        `"${alt}" offers ${list.length} candidate, which is no choice`
      );
      continue;
    }

    const desktop = chosen(list, sizes, DESKTOP);

    for (const viewport of NARROW) {
      const narrow = chosen(list, sizes, viewport);

      if (narrow.width >= desktop.width) {
        failures.push(
          `"${alt}" hands a ${viewport}px viewport ${narrow.width}w, which is ` +
            `no smaller than the ${desktop.width}w a ${DESKTOP}px one gets`
        );
      }
    }
  }

  /**
   * An original narrower than the column. Every candidate has to keep the
   * original's ratio — 4:1 here — because a badge stretched to fill the prose
   * column is the failure this fixture exists for.
   */
  const badge = found.get(FIXTURES.badge)!;
  const badgeSrcset = badge.getAttribute('srcset');

  if (badgeSrcset) {
    for (const { url } of candidates(badgeSrcset)) {
      const dimensions = url.match(/_s_(\d+)x(\d+)\//);

      if (dimensions) {
        const ratio = Number(dimensions[1]) / Number(dimensions[2]);

        if (Math.abs(ratio - 4) > 0.02) {
          failures.push(
            `the badge is distorted at ${dimensions[1]}x${dimensions[2]}`
          );
        }
      }
    }
  }

  return failures;
}

/** A vector and an animation are served exactly as committed. */
function passThrough(found: Map<string, HTMLImageElement>): string[] {
  const failures: string[] = [];

  for (const [name, alt] of [
    ['vector', FIXTURES.vector],
    ['animation', FIXTURES.animation]
  ] as const) {
    const image = found.get(alt)!;

    if (image.hasAttribute('srcset')) {
      failures.push(
        `the ${name} carries a srcset — a provider has been let at a file it ruins`
      );
    }

    if (!/\.(svg|gif)$/i.test(image.getAttribute('src') ?? '')) {
      failures.push(
        `the ${name} is served from ${image.getAttribute('src')}, not its own file`
      );
    }
  }

  return failures;
}

/** The zoom: one named button with an indicator, or nothing at all. */
function affordance(found: Map<string, HTMLImageElement>): string[] {
  const failures: string[] = [];

  for (const [name, alt] of [
    ['light', FIXTURES.light],
    ['vector', FIXTURES.vector],
    ['animation', FIXTURES.animation]
  ] as const) {
    const button = trigger(found.get(alt)!);

    if (!button) {
      failures.push(
        `the ${name} fixture is not a button — nothing opens the dialog, and ` +
          `the keyboard cannot reach it at all`
      );
      continue;
    }

    if (!button.getAttribute('aria-label')?.trim()) {
      failures.push(`the ${name} fixture's button has no accessible name`);
    }

    // The indicator is `aria-hidden`, so it is found in the markup rather than
    // in the accessibility tree — which is the point of it being decorative.
    if (
      !button.querySelector(
        '[aria-hidden="true"] svg, [aria-hidden="true"] .iconify'
      )
    ) {
      failures.push(
        `the ${name} fixture shows no zoom indicator — on a touch device there ` +
          `is then nothing at all to say the image opens`
      );
    }
  }

  const inert = found.get(FIXTURES.inert)!;

  if (trigger(inert)) {
    failures.push('zoom="false" still renders a button');
  }

  if (inert.parentElement?.querySelector('[aria-hidden="true"] svg')) {
    failures.push('zoom="false" still shows a zoom indicator');
  }

  return failures;
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

await main();
