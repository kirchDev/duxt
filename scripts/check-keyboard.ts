#!/usr/bin/env node

/**
 * Drives the search dialog from the keyboard, in a real browser.
 *
 * WHY A BROWSER, WHEN NOTHING ELSE HERE NEEDS ONE. #89 was a component that
 * rendered perfectly and could not be used: the dialog's input was a plain
 * `<input>`, so reka's listbox never wired arrow handling or
 * `aria-activedescendant` to it and the results were reachable by mouse only.
 * Every existing gate passed. `check:a11y` could not see it — axe under jsdom
 * has no focus model, no `document.activeElement` worth the name and no key
 * dispatch — and a vitest case cannot either: the failure is in what a KEY
 * DOES, which is the one question a static parse of the HTML cannot ask. The
 * component is also unmountable outside a Nuxt environment, which is why the
 * repo checks components by building the site rather than by rendering them.
 *
 * NO BROWSER IS DOWNLOADED. `playwright-core` ships no binaries; this runs
 * whatever Chromium-family browser the machine already has — GitHub's runner
 * images carry Google Chrome, and a contributor's own Chrome or a Playwright
 * cache from another project answers just as well. That is the whole reason
 * this is affordable in the gate, and the reason `check:a11y` still parses with
 * jsdom rather than moving here: a browser is used for the one thing only a
 * browser can answer, not as a general upgrade.
 *
 * WHAT IT ASSERTS is the contract the plain input broke, over the dialog's own
 * entry list — the recent pages and the sections, which every duxt site draws
 * with no query typed at all:
 *
 *   - the input keeps focus while the LIST takes the highlight,
 *   - ArrowDown and ArrowUp move `aria-activedescendant` between real, present
 *     `role="option"` elements, and never onto a group heading or any other row
 *     that is not an option,
 *   - Enter opens the highlighted row and closes the dialog,
 *   - Escape closes it.
 *
 * A TYPED QUERY IS EXERCISED TOO, AND IS REPORTED RATHER THAN REQUIRED. Search
 * results are the list that also carries `aria-hidden` provenance captions
 * between runs of rows, so they are the strongest version of "a non-option row
 * is skipped" — but a site whose search returns nothing draws none of them, and
 * that is exactly the state this repository was in while #88 was open. Making
 * the gate depend on another bug's fix would have left this check red for
 * reasons that have nothing to do with the keyboard, and a consumer's own site
 * can fall into that state at any time. So the typed leg asserts everything it
 * can over whatever rows it is given and says out loud when it was given none.
 * Whether search returns anything at all is #88's question, and #88's test.
 *
 * Run after `build:app`, beside `check:a11y`, `check:seo` and `check:images`,
 * for the same reason — what it drives is the built site.
 */

import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser, Page } from 'playwright-core';
import { chromium } from 'playwright-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = join(root, 'www', '.output', 'server', 'index.mjs');

const PORT = Number(process.env.KEYBOARD_CHECK_PORT ?? 3126);

/** A page that draws the site header, and so the search trigger. */
const ROUTE = '/getting-started';

/** The term for the reported leg. Common enough to hit several sources. */
const QUERY = 'source';

/**
 * What the dialog looks like from the outside, read the way a screen reader
 * reads it: the input's `aria-activedescendant`, and whether it names anything.
 *
 * `data-highlighted` is read beside it on purpose. The two are separate
 * mechanisms — one is what assistive technology is told, the other is what the
 * eye sees — and a fix that moved only one of them would be half a fix.
 */
type Dialog = {
  open: boolean;
  focused: string | null;
  active: string | null;
  /** Whether `aria-activedescendant` names an element in the document. */
  resolves: boolean;
  role: string | null;
  label: string | null;
  /** Whether the element it names is the one drawn as highlighted. */
  agrees: boolean;
  options: number;
  /** Rows inside the list that are NOT options: headings and captions. */
  passive: number;
  path: string;
};

function probe(): Dialog {
  const dialog = document.querySelector('[role="dialog"]');
  const input = dialog?.querySelector('input');
  const id = input?.getAttribute('aria-activedescendant') ?? null;
  const active = id ? document.getElementById(id) : null;
  const highlighted = dialog?.querySelector('[data-highlighted]') ?? null;
  const list = dialog?.querySelector('[role="listbox"]');

  const passive = [...(list?.querySelectorAll('*') ?? [])].filter(
    (element) =>
      element.textContent?.trim() &&
      !element.closest('[role="option"]') &&
      ![...element.children].some((child) => child.textContent?.trim())
  );

  return {
    open: !!dialog,
    focused: document.activeElement?.tagName ?? null,
    active: id,
    resolves: !!active,
    role: active?.getAttribute('role') ?? null,
    label:
      active?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 60) ?? null,
    agrees: !!active && active === highlighted,
    options: dialog?.querySelectorAll('[role="option"]').length ?? 0,
    passive: passive.length,
    path: location.pathname
  };
}

async function main() {
  const executablePath = browserPath();

  if (!executablePath) {
    console.error(
      '\nKeyboard check could not run: no Chromium-family browser was found.\n' +
        '  Point DUXT_BROWSER at one (Chrome, Chromium or Edge), or install ' +
        "Playwright's Chromium once with `pnpm dlx playwright install chromium`.\n"
    );
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

    const { failures, notes } = await drive(browser);

    if (failures.length) {
      console.error(
        `\nKeyboard check failed:\n  - ${failures.join('\n  - ')}\n`
      );
      process.exitCode = 1;
      return;
    }

    console.log(`Keyboard check passed.\n  ${notes.join('\n  ')}`);
  } catch (error) {
    console.error(`\nKeyboard check could not run: ${String(error)}`);
    if (stderr.trim()) console.error(stderr.trim());
    process.exitCode = 1;
  } finally {
    await browser.close();
    child.kill('SIGTERM');
  }
}

async function drive(browser: Browser) {
  const failures: string[] = [];
  const notes: string[] = [];

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  const at = () => page.evaluate(probe);
  const step = async (key: string) => {
    await page.keyboard.press(key);
    // The highlight moves on reka's own next tick, and Enter navigates.
    await page.waitForTimeout(200);

    return at();
  };

  try {
    // Visited first so the dialog has a "Recently viewed" group as well as the
    // sections — two groups, which is what puts a heading BETWEEN two options
    // rather than only above the first one. Skipping onto a heading is then a
    // reachable failure rather than a structural impossibility.
    await page.goto(url(ROUTE), { waitUntil: 'networkidle', timeout: 60_000 });
    await page.goto(url('/'), { waitUntil: 'networkidle', timeout: 60_000 });

    const opened = await open(page);

    if (!opened.open) {
      failures.push(
        'the search dialog did not open from the keyboard shortcut or the ' +
          'header trigger, so nothing below could be checked'
      );

      return { failures, notes };
    }

    if (opened.focused !== 'INPUT') {
      failures.push(
        `focus landed on ${opened.focused} rather than the search input`
      );
    }

    if (opened.options < 3) {
      failures.push(
        `the dialog drew ${opened.options} options with no query typed; the ` +
          'entry list is what this check walks'
      );

      return { failures, notes };
    }

    if (opened.passive < 1) {
      failures.push(
        'the dialog drew no group headings, so nothing here proves a row that ' +
          'is not an option gets skipped'
      );
    }

    notes.push(
      `entry list: ${opened.options} options and ${opened.passive} rows that ` +
        'are not options'
    );

    failures.push(...(await walk(step, opened, 'the entry list')));

    // ENTER OPENS THE HIGHLIGHTED ROW. Read before the key, because by the time
    // it has been pressed the dialog is gone and with it the row's name.
    const before = await at();
    const after = await step('Enter');

    if (after.path === before.path) {
      failures.push(
        `Enter on "${before.label}" did not navigate — the row stayed unopened`
      );
    }

    if (!(await closed(page))) failures.push('Enter left the dialog open');

    await open(page);
    await page.keyboard.press('Escape');

    if (!(await closed(page))) failures.push('Escape did not close the dialog');

    // ---- the reported leg: real search results, with their captions ----
    await open(page);
    await page.keyboard.type(QUERY, { delay: 30 });
    // Past the 120 ms debounce, the index fetch and the query itself.
    await page.waitForTimeout(2500);

    const results = await at();

    if (results.options === 0) {
      notes.push(
        `typed "${QUERY}": no rows came back, so the result leg did not run. ` +
          'Whether search returns anything is #88, not this check.'
      );
    } else {
      notes.push(
        `typed "${QUERY}": ${results.options} rows and ${results.passive} ` +
          'rows that are not options (provenance captions and headings)'
      );

      failures.push(...(await walk(step, results, 'the results')));
    }
  } finally {
    await context.close();
  }

  return { failures, notes };
}

/**
 * Arrow through a list and report every way the highlight can be wrong.
 *
 * The walk is bounded by the number of options, so it covers every row the
 * list drew — which is what makes landing on a heading or a caption a failure
 * this can actually catch, rather than one it happens to step over.
 */
async function walk(
  step: (key: string) => Promise<Dialog>,
  start: Dialog,
  what: string
): Promise<string[]> {
  const failures: string[] = [];
  const seen: string[] = [];

  let previous = start;

  for (let index = 0; index < start.options; index++) {
    const state = await step('ArrowDown');

    if (state.focused !== 'INPUT') {
      failures.push(
        `ArrowDown over ${what} moved focus to ${state.focused}; the input has ` +
          'to keep it while the list takes the highlight'
      );
      break;
    }

    if (!state.active) {
      failures.push(
        `ArrowDown over ${what} left the input with no aria-activedescendant, ` +
          'so nothing tells a screen reader which row is current'
      );
      break;
    }

    if (!state.resolves) {
      failures.push(
        `aria-activedescendant named "${state.active}" over ${what}, which is ` +
          'not an element in the document'
      );
      break;
    }

    if (state.role !== 'option') {
      failures.push(
        `ArrowDown over ${what} landed on a ${state.role ?? 'role-less'} row ` +
          `("${state.label}") — a heading or caption is not selectable`
      );
      break;
    }

    if (!state.agrees) {
      failures.push(
        `over ${what} the highlighted row and the one aria-activedescendant ` +
          `names are different elements (it names "${state.label}")`
      );
      break;
    }

    if (index === 0 && state.active === previous.active) {
      failures.push(`ArrowDown over ${what} did not move the highlight at all`);
      break;
    }

    seen.push(state.active);
    previous = state;
  }

  if (!failures.length && new Set(seen).size < 2) {
    failures.push(
      `arrowing over ${what} reached ${new Set(seen).size} distinct rows, ` +
        'which is not navigation'
    );
  }

  if (!failures.length) {
    const back = await step('ArrowUp');

    if (back.active === previous.active) {
      failures.push(`ArrowUp over ${what} did not move the highlight back`);
    }
  }

  return failures;
}

/**
 * Whether the dialog is gone, waited for rather than sampled.
 *
 * The dialog leaves on an exit animation, so it outlives the keystroke that
 * dismissed it by a frame or two — sampling once turns that into a flake, and a
 * flaky assertion about closing is worth less than none.
 */
async function closed(page: Page): Promise<boolean> {
  try {
    await page
      .locator('[role="dialog"]')
      .waitFor({ state: 'detached', timeout: 3000 });

    return true;
  } catch {
    return false;
  }
}

/** Open the dialog: the shortcut first, the header's own trigger as the fallback. */
async function open(page: Page) {
  for (const combination of ['Control+k', 'Meta+k']) {
    await page.keyboard.press(combination);
    await page.waitForTimeout(500);

    if (await page.locator('[role="dialog"]').count()) break;
  }

  if (!(await page.locator('[role="dialog"]').count())) {
    const trigger = page.locator('header button:has(kbd)').first();

    if (await trigger.count()) {
      await trigger.click();
      await page.waitForTimeout(500);
    }
  }

  // The list is fetched on first open; the entry list is not, but the dialog's
  // own transition is.
  await page.waitForTimeout(400);

  return page.evaluate(probe);
}

const url = (route: string) => `http://localhost:${PORT}${route}`;

/**
 * A Chromium-family browser already on this machine, or null.
 *
 * Ordered by how deliberate the answer is: an explicit environment variable,
 * then the browsers a distribution or a runner image installs, then a
 * Playwright cache left by any project on the machine. `playwright-core` is a
 * driver and nothing else — it neither downloads nor looks for a browser, which
 * is precisely why it is affordable here.
 */
function browserPath(): string | null {
  const named = [
    process.env.DUXT_BROWSER,
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH
  ].filter(Boolean) as string[];

  const installed = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ];

  return (
    [...named, ...installed, ...cached()].find((path) => existsSync(path)) ??
    null
  );
}

/** Chromium builds in a Playwright browser cache, newest revision first. */
function cached(): string[] {
  const cache =
    process.env.PLAYWRIGHT_BROWSERS_PATH ||
    join(homedir(), '.cache', 'ms-playwright');

  if (!existsSync(cache)) return [];

  const revisions = readdirSync(cache)
    .filter((entry) => entry.startsWith('chromium-'))
    .sort(
      (a, b) =>
        Number.parseInt(b.slice(9), 10) - Number.parseInt(a.slice(9), 10)
    );

  return revisions.flatMap((revision) => [
    join(cache, revision, 'chrome-linux64', 'chrome'),
    join(cache, revision, 'chrome-linux', 'chrome'),
    join(
      cache,
      revision,
      'chrome-mac',
      'Chromium.app',
      'Contents',
      'MacOS',
      'Chromium'
    )
  ]);
}

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
