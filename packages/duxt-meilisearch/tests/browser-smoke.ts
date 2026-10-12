/** Exercise the real built dialog against the disposable engine, after build. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startBuiltServer } from '../../../apps/www/scripts/built-server.ts';
import { browserPath, hydrated } from '../../../apps/www/scripts/browser.ts';

if (process.env.DUXT_MEILI_FIXTURE !== 'true')
  throw new Error('Disposable fixture opt-in required');
const { chromium } = createRequire(
  new URL('../../../apps/www/package.json', import.meta.url)
)('playwright-core');
const host = process.env.MEILISEARCH_HOST!;
const key = process.env.MEILISEARCH_SEARCH_KEY!;
const index = process.env.MEILISEARCH_INDEX!;
const resultUrl = '/reference/hooks#duxtsearchrecords';
// www fetches its documentation from remote release/main refs, so an
// unpushed guide in this checkout cannot be a browser fixture. Read the
// existing hook record's real provenance instead of guessing a release tag.
const response = await fetch(`${host}/indexes/${index}/search`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    q: 'Meilisearch',
    filter: 'source = "/" AND locale = "en-GB"',
    limit: 1000
  }),
  signal: AbortSignal.timeout(30_000)
});
assert.equal(response.status, 200);
const records = (await response.json()).hits as {
  url: string;
  title: string;
  version: string;
}[];
const expected = records.find((record) => record.url === resultUrl);
assert(expected, 'The real snapshot must include the default-edition hook');
const server = startBuiltServer({ port: 3138 });
const browser = await chromium.launch({
  executablePath: browserPath(),
  args: ['--no-sandbox']
});
let query: { q: string; filter: string } | undefined;
let authorization: string | undefined;
try {
  await server.ready();
  const page = await browser.newPage();
  page.on(
    'request',
    (request: {
      url(): string;
      headers(): Record<string, string>;
      postDataJSON(): { q: string; filter: string };
    }) => {
      if (request.url() === `${host}/indexes/${index}/search`) {
        query = request.postDataJSON();
        authorization = request.headers().authorization;
      }
    }
  );
  await page.goto('http://localhost:3138/getting-started', {
    waitUntil: 'networkidle',
    timeout: 60_000
  });
  await hydrated(page);
  await page.keyboard.press('ControlOrMeta+k');
  const input = page.locator('[role="dialog"] input');
  await input.waitFor({ state: 'visible' });
  await input.fill('Meilisearch');
  const option = page.getByRole('option').filter({ hasText: expected.title });
  await option.waitFor({ timeout: 30_000 });
  assert.equal(authorization, `Bearer ${key}`);
  assert.equal(query?.q, 'Meilisearch');
  assert(
    query?.filter.includes('source = "/"') &&
      query.filter.includes('locale = "en-GB"') &&
      query.filter.includes(`version = ${JSON.stringify(expected.version)}`)
  );
  await option.click();
  await page
    .locator('[role="dialog"]')
    .waitFor({ state: 'detached', timeout: 5000 });
  assert.equal(
    new URL(page.url()).pathname + new URL(page.url()).hash,
    resultUrl
  );
  console.log(
    JSON.stringify({
      providerDialog: true,
      realEngineResult: true,
      searchOnlyAuthorization: true,
      editionAndLocaleFilter: true,
      urlNavigation: true
    })
  );
} finally {
  await browser.close();
  await server.stop();
}
