import assert from 'node:assert/strict';
import {
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
  existsSync,
  readdirSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { JSDOM } from 'jsdom';
import { chromium, type Browser } from 'playwright-core';
import { startBuiltServer } from './built-server.ts';
import { browserPath, hydrated, missingBrowser } from './browser.ts';

const site = fileURLToPath(new URL('..', import.meta.url));
const fixture = join(site, 'layers/wiki-fixture');
const original = join(fixture, 'docs/wikilink-target.md');
const renamed = join(fixture, 'docs/wikilink-target-moved.md');
const source = readFileSync(original, 'utf8');
const parsed = join(fixture, 'parsed.log');
const bundles = mkdtempSync(join(tmpdir(), 'duxt-wikilinks-'));
const origin = 'http://127.0.0.1:3138';
const server = startBuiltServer({
  port: 3138,
  origin,
  env: {
    NUXT_SITE_URL: origin,
    NUXT_PUBLIC_I18N_BASE_URL: origin,
    DUXT_CONTENT_BUNDLE_DIR: bundles,
    NUXT_DUXT_CONTENT_BUNDLES_POLL_SECONDS: '1',
    NUXT_DUXT_CONTENT_BUNDLES_STATUS_ROUTE: 'true'
  }
});
let browser: Browser | undefined;
let currentPhase = 'start';
let stopping = false;
server.exited.catch((error) => {
  if (!stopping)
    console.error(
      'WIKILINK_SERVER_EXIT',
      JSON.stringify({
        phase: currentPhase,
        error: String(error),
        stderr: server.stderr()
      })
    );
});
const phase = (name: string) => {
  currentPhase = name;
  console.log('WIKILINK_PHASE', JSON.stringify({ phase: name }));
};

async function get(path: string) {
  const response = await fetch(`${origin}${path}`, {
    signal: AbortSignal.timeout(60_000)
  }).catch((cause) => {
    throw new Error(`${currentPhase}: GET ${path} failed`, { cause });
  });
  assert.equal(
    response.status,
    200,
    `${path}: ${await response.clone().text()}`
  );
  return response.text();
}
async function mcp(path: string) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream'
  };
  const post = async (body: unknown) =>
    fetch(`${origin}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000)
    });
  const initialized = await post({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'wikilink-check', version: '0' }
    }
  });
  assert.equal(initialized.status, 200);
  const session = initialized.headers.get('mcp-session-id');
  if (session) headers['mcp-session-id'] = session;
  await initialized.text();
  await (
    await post({ jsonrpc: '2.0', method: 'notifications/initialized' })
  ).text();
  const response = await post({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'read_page', arguments: { path } }
  });
  assert.equal(response.status, 200);
  const raw = await response.text();
  const data =
    raw
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .at(-1)
      ?.slice(5)
      .trim() ?? raw;
  const payload = JSON.parse(data) as {
    error?: unknown;
    result?: { isError?: boolean; content?: { text?: string }[] };
  };
  assert.equal(payload.error, undefined, data);
  assert.ok(!payload.result?.isError, data);
  return (
    payload.result?.content?.map((part) => part.text ?? '').join('\n') ?? ''
  );
}
async function outputs(changed = false) {
  const target = changed
    ? '/wiki/wikilink-target-moved'
    : '/wiki/wikilink-target';
  const doc = new JSDOM(await get('/wiki/wikilinks')).window.document;
  assert.equal(
    doc.querySelector('main a[href="' + target + '"]')?.textContent,
    'Wikilink target'
  );
  assert.ok(
    [...doc.querySelectorAll(`a[href="${target}"]`)].some(
      (node) => node.textContent === 'A label'
    )
  );
  assert.ok(doc.querySelector(`a[href="${target}#details"]`));
  assert.ok(doc.querySelector('a[href="/wiki/wikilink-disambiguation"]'));
  assert.ok(doc.querySelector('a[href="/demo/images"]'));
  assert.equal(
    doc.querySelector(
      'a[data-wiki-red-link][href="/demo/wanted?title=Foreign%20missing"]'
    )?.textContent,
    'Foreign wanted'
  );
  assert.ok(
    doc.querySelector(
      'a[data-wiki-red-link][href="/wiki/wanted?title=SharedWiki"]'
    )
  );
  assert.ok(
    doc.querySelector(
      'a[data-wiki-red-link][href="/wiki/wanted?title=Wanted%20Wiki"]'
    )
  );
  assert.ok(
    doc.querySelector('pre')?.textContent?.includes('[[Fenced literal]]')
  );
  assert.ok(
    [...doc.querySelectorAll('code')].some(
      (node) => node.textContent === '[[Inline literal]]'
    )
  );
  const targetDoc = new JSDOM(await get(target)).window.document;
  assert.equal(
    targetDoc.querySelectorAll('[data-wiki-backlinks] li').length,
    10
  );
  assert.match(
    targetDoc.querySelector('[data-wiki-backlinks-rest]')?.textContent ?? '',
    /4 more/
  );
  targetDoc.defaultView?.close();
  doc.defaultView?.close();
  for (const text of [
    await get('/wiki/wikilinks.md'),
    await mcp('/wiki/wikilinks'),
    await get('/llms-full.txt')
  ]) {
    assert.ok(text.includes(`[WikiAlias](${target})`));
    assert.ok(text.includes(`[A label](${target})`));
    assert.ok(text.includes(`[WikiAlias#Details](${target}#details)`));
    assert.ok(text.includes('[ResolvedWiki](/wiki/wikilink-disambiguation)'));
    assert.ok(
      text.includes('SharedWiki · [ResolvedWiki]') &&
        text.includes('Wanted Wiki · [~/demo/Images](/demo/images)')
    );
    assert.ok(text.includes('[[Fenced literal]]'));
    assert.ok(text.includes('Foreign wanted'));
    assert.ok(!text.includes('[Foreign wanted]('));
  }
  const german = await get('/de-DE/wiki/wikilinks.md');
  assert.ok(
    german.includes(`[WikiAlias](/de-DE${target})`),
    'machine locale fallback matches HTML scope'
  );
  const stored = JSON.parse(await get('/api/wikilinks-fixture'));
  assert.ok(stored.rawbody.includes('[[WikiAlias]]'));
  assert.ok(
    JSON.stringify(stored.body).includes('[[WikiAlias]]'),
    'stored AST is authored'
  );
}
const bin = join(site, '../../packages/duxt/bin/duxt.mjs');
const execFileAsync = promisify(execFile);
async function pack() {
  await execFileAsync(
    process.execPath,
    [
      bin,
      'content',
      'pack',
      '--publish',
      bundles,
      '--expect',
      join(site, '.output/duxt-content-compat.json')
    ],
    {
      cwd: site,
      env: { ...process.env, DUXT_WIKI_TRACK_PARSE: '1' },
      encoding: 'utf8',
      timeout: 300_000,
      maxBuffer: 32 * 1024 * 1024
    }
  );
}
async function activated() {
  const expected = readFileSync(join(bundles, 'current'), 'utf8').trim();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const status = JSON.parse(await get('/__duxt/content-bundle'));
    if (status.active?.id === expected) return;
    assert.notEqual(status.lastRejection?.id, expected, JSON.stringify(status));
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.fail('bundle did not activate');
}
try {
  await server.ready();
  phase('initial outputs');
  await outputs();
  phase('report');
  const report = spawnSync(process.execPath, [bin, 'report', '--json'], {
    cwd: site,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 32 * 1024 * 1024
  });
  assert.equal(report.status, 0, report.stderr);
  const notes = JSON.parse(report.stdout).additionalNotes;
  for (const heading of [
    'Wiki wanted pages',
    'Wiki orphaned pages',
    'Wiki dead ends',
    'Wiki pages without a category'
  ])
    assert.ok(
      notes.sections.some(
        (section: { heading: string }) => section.heading === heading
      )
    );
  assert.ok(
    notes.sections
      .find(
        (section: { heading: string }) =>
          section.heading === 'Wiki wanted pages'
      )
      .lines.some((line: string) => line.includes('Wanted Wiki'))
  );
  assert.ok(notes.warnings.some((line: string) => line.includes('SharedWiki')));
  assert.ok(
    !notes.warnings.some(
      (line: string) =>
        line.includes('Wanted Wiki') || line.includes('ResolvedWiki')
    )
  );
  const staticWanted = join(site, '.output/public/wiki/wanted/index.html');
  phase('static wanted');
  assert.ok(existsSync(staticWanted), 'one static wanted page exists');
  assert.match(readFileSync(staticWanted, 'utf8'), /noindex/);
  assert.deepEqual(
    readdirSync(join(site, '.output/public/wiki/wanted'), {
      recursive: true,
      encoding: 'utf8'
    }).filter((name) => name.endsWith('.html')),
    ['index.html'],
    'queries never create one prerendered route per title'
  );
  assert.ok(
    !existsSync(join(site, '.output/public/wiki/wikilinks/index.html')),
    'Node articles remain live SSR beside the static utility page'
  );
  const foreignStatic = join(site, '.output/public/demo/wanted');
  assert.deepEqual(
    readdirSync(foreignStatic, { recursive: true, encoding: 'utf8' }).filter(
      (name) => name.endsWith('.html')
    ),
    ['index.html'],
    'explicit foreign missing target has one static utility page'
  );
  assert.match(
    readFileSync(join(foreignStatic, 'index.html'), 'utf8'),
    /noindex/
  );
  const wanted = new JSDOM(await get('/wiki/wanted?title=Wanted%20Wiki')).window
    .document;
  assert.ok(
    wanted
      .querySelector('meta[name="robots"]')
      ?.getAttribute('content')
      ?.includes('noindex')
  );
  assert.ok(
    !wanted.querySelector('[data-wiki-wanted] h2'),
    'server does not specialize a page for its query'
  );
  assert.equal(
    new URL(
      wanted.querySelector('link[rel="canonical"]')!.getAttribute('href')!
    ).search,
    '',
    'canonical belongs to the collection utility, not its query'
  );
  wanted.defaultView?.close();
  const executablePath = browserPath();
  if (!executablePath) throw new Error(missingBrowser('check:wikilinks'));
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write']
  });
  const page = await context.newPage();
  phase('browser copy');
  await page.goto(`${origin}/wiki/wikilinks`);
  await hydrated(page);
  await page.getByRole('button', { name: 'Copy page', exact: true }).click();
  await page.waitForFunction(() =>
    document
      .querySelector('[data-duxt-copy-page] > button')
      ?.textContent?.includes('Copied')
  );
  assert.ok(
    (await page.evaluate(() => navigator.clipboard.readText())).includes(
      '[WikiAlias](/wiki/wikilink-target)'
    )
  );
  phase('browser wanted');
  await page.goto(`${origin}/wiki/wanted?title=Wanted%20Wiki`);
  await hydrated(page);
  assert.equal(
    await page.locator('[data-wiki-wanted] h2').textContent(),
    'Wanted Wiki'
  );
  assert.equal(
    await page.locator('[data-wiki-wanted] a[href="/wiki/wikilinks"]').count(),
    1
  );
  const create = new URL(
    (await page.locator('[data-wiki-create]').getAttribute('href'))!
  );
  assert.equal(create.pathname, '/kirchDev/duxt/new/dev');
  assert.ok(create.searchParams.get('filename')?.endsWith('/wanted-wiki.md'));
  assert.ok(create.searchParams.get('value')?.includes('title: "Wanted Wiki"'));
  for (const width of [320, 412]) {
    await page.setViewportSize({ width, height: 800 });
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      ),
      0
    );
  }
  phase('browser foreign wanted');
  await page.goto(`${origin}/demo/wanted?title=Foreign%20missing`);
  await hydrated(page);
  assert.equal(
    await page.locator('[data-wiki-wanted] h2').textContent(),
    'Foreign missing'
  );
  assert.equal(
    await page.locator('[data-wiki-wanted] a[href="/wiki/wikilinks"]').count(),
    1,
    'foreign collection wanted page includes the explicit Wiki origin'
  );
  assert.ok(
    (
      await page.locator('meta[name="robots"]').getAttribute('content')
    )?.includes('noindex')
  );
  assert.equal(
    new URL((await page.locator('link[rel="canonical"]').getAttribute('href'))!)
      .pathname,
    '/demo/wanted'
  );
  assert.equal(
    new URL((await page.locator('link[rel="canonical"]').getAttribute('href'))!)
      .search,
    ''
  );
  await page.goto(`${origin}/demo/wanted`);
  await hydrated(page);
  assert.ok(
    !(await page.locator('[data-wiki-wanted]').textContent())?.includes(
      'Wanted Wiki'
    ),
    'unqualified missing Wiki names stay in their own collection'
  );
  phase('sitemap');
  const sitemapIndex = await get('/sitemap.xml');
  assert.ok(!sitemapIndex.includes('/wiki/wanted'));
  assert.ok(!sitemapIndex.includes('/demo/wanted'));
  const sitemapPaths = [
    ...sitemapIndex.matchAll(/<loc>([^<]+\.xml)<\/loc>/g)
  ].map((match) => new URL(match[1]!).pathname);
  for (const path of sitemapPaths) {
    const xml = await get(path);
    assert.ok(
      !xml.includes('/wiki/wanted') && !xml.includes('/demo/wanted'),
      'wanted excluded from sitemap'
    );
  }
  phase('prime bundle');
  await pack();
  phase('activate primed bundle');
  await activated();
  writeFileSync(parsed, '');
  phase('warm bundle');
  await pack();
  assert.equal(
    readFileSync(parsed, 'utf8'),
    '',
    'unchanged pack reparses no files'
  );
  renameSync(original, renamed);
  writeFileSync(parsed, '');
  phase('rename bundle');
  await pack();
  assert.match(readFileSync(parsed, 'utf8'), /wikilink-target-moved\.md/);
  assert.doesNotMatch(
    readFileSync(parsed, 'utf8'),
    /\/wikilinks\.md|\/wikilink-backlink-/
  );
  phase('activate renamed bundle');
  await activated();
  phase('renamed outputs');
  await outputs(true);
  console.log(
    'Wikilinks check passed: HTML, locale fallback, .md, MCP, llms-full, copy, static wanted, forge proposal, reports, capped backlinks and live target rename without linker reparse.'
  );
} catch (error) {
  console.error(
    'WIKILINK_FAILURE',
    JSON.stringify({
      phase: currentPhase,
      serverExit: server.child.exitCode,
      serverSignal: server.child.signalCode,
      stderr: server.stderr()
    })
  );
  throw error;
} finally {
  stopping = true;
  rmSync(renamed, { force: true });
  writeFileSync(original, source);
  rmSync(parsed, { force: true });
  await browser?.close();
  await server.stop();
  rmSync(bundles, { recursive: true, force: true });
}
