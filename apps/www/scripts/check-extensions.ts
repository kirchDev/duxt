#!/usr/bin/env node
import { checkWikiFixtures, WIKI_ROUTES } from './wiki-fixture.ts';
import {
  readFileSync,
  readdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { chromium, type Browser } from 'playwright-core';
import { browserPath, missingBrowser, hydrated } from './browser.ts';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { startBuiltServer } from './built-server.ts';
import { ensureFullHistory } from './full-history.ts';

const site = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:3125';
const bundleDirectory = mkdtempSync(join(tmpdir(), 'duxt-page-type-bundle-'));
const fixtureFile = join(site, 'fixtures/build-extension/page-types/index.md');
const fixtureSource = readFileSync(fixtureFile, 'utf8');
const wikiDir = join(site, 'fixtures/wiki-fixture/docs');
const wikiTarget = join(wikiDir, 'target.md');
const wikiTargetSource = readFileSync(wikiTarget, 'utf8');
const wikiModes = join(wikiDir, 'category/modes.md');
const wikiModesSource = readFileSync(wikiModes, 'utf8');
const wikiAdded = join(wikiDir, 'bundled.md');
let browser: Browser | undefined;
const server = startBuiltServer({
  port: 3125,
  origin,
  env: {
    NUXT_SITE_URL: origin,
    NUXT_PUBLIC_I18N_BASE_URL: origin,
    DUXT_CONTENT_BUNDLE_DIR: bundleDirectory,
    NUXT_DUXT_CONTENT_BUNDLES_POLL_SECONDS: '1'
  }
});
try {
  await server.ready();
  await checkWikiFixtures(origin);
  const response = await fetch(`${origin}/api/extension-fixture`);
  assert.equal(
    response.status,
    200,
    `${await response.clone().text()}\n${server.stderr()}`
  );
  const result = (await response.json()) as {
    page: { title: string; extensionFixture: string; layerFixture: string };
    inherited: { title: string; layerFixture: string };
    generated: { title: string; extensionFixture: string };
  };
  assert.equal(result.page.title, 'Layer source flavor');
  assert.equal(result.page.extensionFixture, 'flavor-from-layer');
  assert.equal(result.page.layerFixture, 'authored-layer-field');
  assert.equal(result.inherited.title, 'Inherited layer section');
  assert.equal(result.inherited.layerFixture, 'generated-layer-field');
  const inherited = await fetch(
    `${origin}/extension-fixture/inherited-layer-section`
  );
  assert.equal(inherited.status, 200);
  assert.match(await inherited.text(), /Inherited layer section/);
  const inheritedMarkdown = await fetch(
    `${origin}/extension-fixture/inherited-layer-section.md`
  );
  assert.equal(inheritedMarkdown.status, 200);
  assert.match(
    await inheritedMarkdown.text(),
    /Generated prose from the unoverridden layer parser/
  );
  assert.equal(result.generated.title, 'Site section override');
  assert.equal(result.generated.extensionFixture, 'generated-schema-field');
  const generated = await (
    await fetch(`${origin}/extension-fixture/fixture-section`)
  ).text();
  assert.match(generated, /Site section override/);
  const markdown = await (
    await fetch(`${origin}/extension-fixture/fixture-section.md`)
  ).text();
  assert.match(markdown, /Generated fixture prose from the site override/);
  const llms = await (await fetch(`${origin}/llms.txt`)).text();
  assert.match(llms, /extension-fixture\/fixture-section/);
  assert.match(llms, /extension-fixture\/inherited-layer-section/);
  const home = await (await fetch(origin)).text();
  assert.match(home, /data-form-type="other"/);
  assert.match(home, /echoconsignment|\/echo/);
  for (const [path, expected] of [
    ['/page-types', 'article'],
    ['/page-types/category', 'category']
  ] as const) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(
      html,
      new RegExp(
        `data-page-type-layout="${expected === 'article' ? 'fixture' : 'category'}"`
      )
    );
    assert.match(html, new RegExp(`data-page-type-template="${expected}"`));
    assert.match(
      html,
      new RegExp(
        `${expected === 'article' ? 'Article' : 'Category'} template supplied by the extension layer`
      )
    );
    assert.doesNotMatch(html, /<fixture-(article|category)-page/i);
    assert.match(html, /<link[^>]+rel="canonical"/);
  }
  const docsOverride = await (await fetch(`${origin}/page-types/docs`)).text();
  assert.doesNotMatch(docsOverride, /data-page-type-layout="fixture"/);
  assert.match(docsOverride, /Docs override fixture/);
  assert.match(docsOverride, /Ordinary content/);

  const executablePath = browserPath();
  if (!executablePath) throw new Error(missingBrowser('check:extensions'));
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const initialDumps: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/sql_dump.txt'))
      initialDumps.push(request.url());
  });
  for (const route of WIKI_ROUTES) {
    await page.goto(`${origin}${route}`);
    await hydrated(page);
    assert.equal(await page.locator('[data-wiki-layout]').count(), 1);
  }
  await page.goto(`${origin}/page-types`);
  await hydrated(page);
  await page.locator('[data-page-type-template="article"]').waitFor();
  assert.deepEqual(
    initialDumps,
    [],
    'SSR hydration reuses its selected layout without a browser database'
  );
  await page.getByRole('link', { name: 'Open category', exact: true }).click();
  await page.locator('[data-page-type-template="category"]').waitFor();
  await page.getByRole('link', { name: 'Open article', exact: true }).click();
  await page.locator('[data-page-type-template="article"]').waitFor();
  await page.getByRole('link', { name: 'Open docs', exact: true }).click();
  await page
    .getByRole('heading', { name: 'Introduction', exact: true })
    .waitFor();
  assert.equal(
    await page.locator('[data-page-type-layout="fixture"]').count(),
    0
  );
  await browser.close();
  browser = undefined;

  // Parse and publish changed frontmatter with the real CLI; never rebuild the
  // image. The registered category template must already be in that image.
  writeFileSync(
    fixtureFile,
    fixtureSource.replace('---\n', '---\ntype: fixture-category\n')
  );
  writeFileSync(
    wikiTarget,
    wikiTargetSource.replace(
      'categories: [Modes]',
      'categories: [Modes, Fresh group]'
    )
  );
  writeFileSync(
    wikiModes,
    wikiModesSource.replace(
      'categories: [Catalog]',
      'categories: [Catalog, Fresh group]'
    )
  );
  writeFileSync(
    wikiAdded,
    '---\ntitle: Bundled article\ncategories: [Modes, Fresh group]\n---\nNew content without an image rebuild.\n'
  );
  ensureFullHistory();
  const packed = spawnSync(
    process.execPath,
    [
      join(site, '../../packages/duxt/bin/duxt.mjs'),
      'content',
      'pack',
      '--publish',
      bundleDirectory,
      '--expect',
      join(site, '.output/duxt-content-compat.json')
    ],
    {
      cwd: site,
      encoding: 'utf8',
      timeout: 300_000,
      maxBuffer: 32 * 1024 * 1024
    }
  );
  assert.equal(packed.status, 0, packed.stdout + packed.stderr);
  let switchedHtml = '';
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const switched = await fetch(`${origin}/page-types?bundle=changed`);
    assert.equal(switched.status, 200, server.stderr());
    switchedHtml = await switched.text();
    if (switchedHtml.includes('data-page-type-template="category"')) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.match(switchedHtml, /data-page-type-template="category"/);
  assert.match(switchedHtml, /data-page-type-layout="category"/);
  assert.doesNotMatch(switchedHtml, /data-page-type-template="article"/);
  assert.match(switchedHtml, /Page type fixture/);
  const fresh = await fetch(
    `${origin}/wiki/category/fresh-group?bundle=changed`
  );
  assert.equal(
    fresh.status,
    200,
    'a category introduced by a bundle has a runtime route'
  );
  const freshHtml = await fresh.text();
  assert.match(freshHtml, /data-wiki-category/);
  assert.match(freshHtml, /Bundled article/);
  assert.match(freshHtml, /href="\/wiki\/target"/);
  assert.match(
    freshHtml,
    /href="\/wiki\/category\/modes"/,
    'category parent changes come from bundle columns'
  );
  const wiki = await fetch(`${origin}/wiki?bundle=changed`);
  assert.equal(wiki.status, 200);
  const wikiHtml = await wiki.text();
  assert.match(wikiHtml, /data-wiki-navbox/);
  assert.match(
    wikiHtml,
    /Bundled article/,
    'explicit/partial navboxes use current members'
  );
  assert.match(
    await (await fetch(`${origin}/de-DE/wiki/category/fresh-group`)).text(),
    /Bundled article/
  );
  assert.equal(
    (await fetch(`${origin}/wiki/category/not-a-category`)).status,
    404
  );

  const js = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? js(join(dir, entry.name))
        : entry.name.endsWith('.js')
          ? [join(dir, entry.name)]
          : []
    );
  for (const file of js(join(site, '.output/public/_nuxt')))
    assert.doesNotMatch(
      readFileSync(file, 'utf8'),
      /DUXT_FIXTURE_PARSER_BUILD_ONLY/
    );
  console.log(
    'Build extensions: inherited layer parser/schema/flavor, separate site parser/schema overrides, rendered operation demo, Markdown/llms exports, browser separation, extends-only page templates, client navigation and a real content-only bundle type switch passed.'
  );
} catch (error) {
  if (server.stderr().trim()) console.error(server.stderr().trim());
  throw error;
} finally {
  writeFileSync(fixtureFile, fixtureSource);
  writeFileSync(wikiTarget, wikiTargetSource);
  writeFileSync(wikiModes, wikiModesSource);
  rmSync(wikiAdded, { force: true });
  await browser?.close();
  await server.stop();
  rmSync(bundleDirectory, { recursive: true, force: true });
}
