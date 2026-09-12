/**
 * A Chromium-family browser already on this machine, for the checks that need
 * a real one.
 *
 * NO BROWSER IS DOWNLOADED. `playwright-core` ships no binaries; the checks run
 * whatever Chromium-family browser the machine already has — GitHub's runner
 * images carry Google Chrome, and a contributor's own Chrome or a Playwright
 * cache from another project answers just as well. That is the whole reason a
 * browser is affordable in the gate at all, and the reason `check:a11y` still
 * parses with jsdom rather than moving here: a browser is used for the things
 * only a browser can answer, not as a general upgrade.
 *
 * IT LIVES HERE BECAUSE THERE ARE TWO CALLERS NOW. `check:keyboard` asks what a
 * key does and `check:overflow` asks how wide a page is; neither question has
 * anything to do with the other, but both have to find a browser first, and a
 * machine this list does not cover would otherwise have to be taught twice.
 */

import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * A Chromium-family browser already on this machine, or null.
 *
 * Ordered by how deliberate the answer is: an explicit environment variable,
 * then the browsers a distribution or a runner image installs, then a
 * Playwright cache left by any project on the machine. `playwright-core` is a
 * driver and nothing else — it neither downloads nor looks for a browser, which
 * is precisely why it is affordable here.
 */
export function browserPath(): string | null {
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

/**
 * What to print when there is none.
 *
 * Says which check went without rather than only that one did, because these
 * run one after another in `pnpm check` and a bare "no browser was found" in a
 * long log names nothing.
 */
export function missingBrowser(check: string): string {
  return (
    `\n${check} could not run: no Chromium-family browser was found.\n` +
    '  Point DUXT_BROWSER at one (Chrome, Chromium or Edge), or install ' +
    "Playwright's Chromium once with `pnpm dlx playwright install chromium`.\n"
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
