import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { chromium, type Browser } from 'playwright-core';
import { browserPath, missingBrowser, hydrated } from './browser.ts';
import { startBuiltServer } from './built-server.ts';

const executablePath = browserPath();
if (!executablePath) throw new Error(missingBrowser('check:interactive'));
const origin = 'http://127.0.0.1:3137';
const server = startBuiltServer({ port: 3137, origin });
let browser: Browser | undefined;
let mode: 'large' | 'stall' = 'large';
let disconnected = 0;
let requests = 0;
const api = createServer((request, response) => {
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader(
    'access-control-allow-headers',
    'content-type, authorization'
  );
  if (request.method === 'OPTIONS') {
    response.end();
    return;
  }
  requests++;
  response.setHeader('content-type', 'application/json');
  if (mode === 'large') {
    response.end('x'.repeat(1024 * 1024 + 100));
    return;
  }
  response.write('{"pending":');
  response.once('close', () => disconnected++);
});
try {
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await new Promise<void>((resolve, reject) => {
    api.once('error', reject);
    api.listen(0, '127.0.0.1', resolve);
  });
  const address = api.address();
  assert.ok(address && typeof address !== 'string');
  const apiOrigin = `http://127.0.0.1:${address.port}`;
  await server.ready();
  await page.goto(`${origin}/demo/diagrams`);
  await hydrated(page);
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-diagram-demo] svg[id^="duxt-mermaid-"]')
        .length === 3
  );
  const ids = await page
    .locator('[data-diagram-demo] svg[id^="duxt-mermaid-"]')
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  assert.equal(new Set(ids).size, 3);
  const diagram = page.locator('[data-reactive-diagram]');
  await page.locator('#diagram-source').fill('graph TD; Changed --> New');
  await diagram.locator('svg').filter({ hasText: 'Changed' }).waitFor();
  await page.getByRole('button', { name: 'Change diagram theme' }).click();
  await page.getByRole('button', { name: 'Change diagram theme' }).click();
  await page.locator('#diagram-source').fill('graph TD; Latest --> Wins');
  await diagram.locator('svg').filter({ hasText: 'Latest' }).waitFor();
  await page
    .locator('#diagram-source')
    .fill('graph TD; A["$$x^2 + y^2 = z^2$$"] --> B["Mathematics"]');
  await diagram.locator('svg .katex').waitFor();
  assert.equal(await diagram.locator('svg .katex-error').count(), 0);
  assert.match((await diagram.locator('svg .katex').textContent()) ?? '', /x/);
  await page.locator('#diagram-source').fill('invalid diagram syntax');
  await diagram.locator('div.whitespace-pre').waitFor({ state: 'visible' });
  assert.equal(await diagram.locator('svg').count(), 0);
  assert.match((await diagram.textContent()) ?? '', /invalid diagram syntax/);
  console.log(
    'Mermaid: multiple instances, reactive source, overlapping themes, mathematical labels and authored error fallback passed.'
  );

  async function requestPage(path: string) {
    await page.goto(`${origin}${path}`);
    await hydrated(page);
    // The specification's servers remain unchanged; this test redirects only
    // this page's fetch to a local CORS server with observable stream closure.
    await page.evaluate((apiOrigin) => {
      const original = window.fetch;
      window.fetch = (input, init) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        return url.includes('/demo/echo') || url.includes('api.example.org')
          ? original(apiOrigin, init)
          : original(input, init);
      };
    }, apiOrigin);
    const form = page.locator('main form').first();
    const credentials = form.locator('input[type="password"]');
    if (await credentials.count())
      await credentials.first().fill('ephemeral-test-token');
    return form;
  }
  let form = await requestPage('/demo/openapi/demo/echoconsignment');
  await form.getByRole('button', { name: 'Send', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Response preview limited' })
    .waitFor();
  mode = 'stall';
  await form.getByRole('button', { name: 'Send', exact: true }).click();
  await form.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByText('Request cancelled.', { exact: true }).waitFor();
  assert.ok(disconnected > 0, 'Cancel closes the stalled response stream');
  await page.clock.install();
  await form.getByRole('button', { name: 'Send', exact: true }).click();
  await page.clock.fastForward(31_000);
  await page
    .getByText('The request timed out after 30 seconds.', { exact: true })
    .waitFor();
  await page.clock.resume();
  const before = disconnected;
  const beforeRequests = requests;
  await form.getByRole('button', { name: 'Send', exact: true }).click();
  await form.getByRole('button', { name: 'Cancel', exact: true }).waitFor();
  const deadline = Date.now() + 5000;
  while (requests === beforeRequests && Date.now() < deadline)
    await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(requests > beforeRequests, 'Navigation test starts a real request');
  await page.goto(`${origin}/getting-started`);
  await page.waitForFunction(() =>
    document.querySelector('h1')?.textContent?.includes('Introduction')
  );
  assert.ok(disconnected > before, 'Navigation closes the request');
  console.log(
    'OpenAPI: bounded response, cancellation, timeout and navigation cleanup passed.'
  );
  mode = 'large';
  form = await requestPage('/demo/bruno/ping');
  await form.getByRole('button', { name: 'Send', exact: true }).click();
  await page
    .getByRole('status')
    .filter({ hasText: 'Response preview limited' })
    .waitFor();
  console.log(
    'Bruno: the shared request lifecycle returns a bounded response.'
  );
} catch (error) {
  if (server.stderr().trim())
    console.error(server.stderr().trim().slice(-4000));
  throw error;
} finally {
  try {
    await browser?.close();
  } finally {
    await server.stop();
    api.closeAllConnections();
    await new Promise<void>((resolve) => api.close(() => resolve()));
  }
}
