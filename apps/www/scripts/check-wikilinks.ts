import assert from 'node:assert/strict';
import {
  appendFileSync,
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
import { ensureFullHistory } from './full-history.ts';
import { browserPath, hydrated, missingBrowser } from './browser.ts';

const site = fileURLToPath(new URL('..', import.meta.url));
const fixture = join(site, 'fixtures/wiki-fixture');
const original = join(fixture, 'docs/wikilink-target.md');
const renamed = join(fixture, 'docs/wikilink-target-moved.md');
const source = readFileSync(original, 'utf8');
const parsed = join(fixture, 'parsed.log');
const bundles = mkdtempSync(join(tmpdir(), 'duxt-wikilinks-'));
const origin = 'http://127.0.0.1:3138';
const generatedLinks = [
  [
    'Generated current',
    '/demo/openapi/consignments/listconsignments',
    'List consignments'
  ],
  [
    'Generated current path',
    '/demo/openapi/consignments/listconsignments',
    'List consignments'
  ],
  [
    'Generated old',
    '/demo/v1.x/openapi/shipments/listshipments',
    'List shipments'
  ],
  [
    'Generated old path',
    '/demo/v1.x/openapi/shipments/listshipments',
    'List shipments'
  ],
  [
    'Generated before escape',
    '/demo/openapi/consignments/listconsignments',
    'List consignments'
  ],
  [
    'Generated after escape',
    '/demo/openapi/consignments/listconsignments',
    'List consignments'
  ],
  [
    'Generated after tilde',
    '/demo/openapi/consignments/listconsignments',
    'List consignments'
  ],
  [
    'Generated twin',
    '/demo/openapi/consignments/listconsignments',
    'List consignments'
  ],
  [
    'Generated in strike',
    '/demo/openapi/consignments/listconsignments',
    'List consignments'
  ]
] as const;
const generatedWanted = [
  ['/demo/openapi', 'Generated missing', 'Generated wanted'],
  ['/demo/v1.x/openapi', 'Generated old missing', 'Generated old wanted']
] as const;
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

async function get(path: string, timeout = 60_000) {
  const response = await fetch(`${origin}${path}`, {
    signal: AbortSignal.timeout(timeout)
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
  for (const locale of ['', '/de-DE']) {
    const localized = locale
      ? new JSDOM(await get(`${locale}/wiki/wikilinks`)).window.document
      : doc;
    const checked = new Set<string>();
    for (const [label, path, title] of generatedLinks) {
      const anchor = [...localized.querySelectorAll('main a')].find(
        (node) => node.textContent === label
      );
      assert.equal(anchor?.getAttribute('href'), `${locale}${path}`, label);
      assert.ok(!anchor?.hasAttribute('data-wiki-red-link'), label);
      if (label === 'Generated in strike')
        assert.ok(anchor?.closest('del'), 'authored outer strike is preserved');
      else
        assert.equal(
          anchor?.closest('del'),
          null,
          `${label}: no GFM strike wrapper`
        );
      if (!checked.has(path)) {
        const target = new JSDOM(await get(`${locale}${path}`)).window.document;
        assert.equal(
          target.querySelector('main h1')?.textContent?.trim(),
          title
        );
        target.defaultView?.close();
        checked.add(path);
      }
    }
    for (const [prefix, title, label] of generatedWanted)
      assert.equal(
        localized.querySelector(
          `a[data-wiki-red-link][href="${locale}${prefix}/wanted?title=${encodeURIComponent(title)}"]`
        )?.textContent,
        label
      );
    for (const prefix of [
      'Occurrence anchor:',
      'Occurrence direct:',
      'Occurrence after code:'
    ]) {
      const paragraph = [...localized.querySelectorAll('main p')].find((node) =>
        node.textContent?.startsWith(prefix)
      );
      assert.ok(paragraph, prefix);
      const links = paragraph.querySelectorAll(`a[href="${locale}${target}"]`);
      assert.equal(
        links.length,
        1,
        `${prefix} only the valid occurrence resolves`
      );
      assert.ok(
        paragraph.textContent?.includes('[[WikiAlias]]'),
        `${prefix} escaped twin remains literal`
      );
    }
    const ordinary = [...localized.querySelectorAll('main p')].find((node) =>
      node.textContent?.startsWith('Occurrence direct:')
    );
    assert.ok(
      ordinary?.querySelector(`a[href="${locale}/demo/images"]`),
      'ordinary Markdown link keeps precedence'
    );
    assert.ok(
      localized.querySelector('main img[alt="x [[Protected shadow]]"]'),
      'image alt remains literal'
    );
    assert.equal(
      localized.querySelector('main a[href*="Protected%20shadow"]'),
      null
    );
    const entity = [...localized.querySelectorAll('main a')].find(
      (node) => node.textContent === 'R&D parser'
    );
    assert.equal(
      entity?.getAttribute('href'),
      `${locale}${target}`,
      'native entity label resolves'
    );
    const mixedNormal = [...localized.querySelectorAll('main a')].find(
      (node) => node.textContent === 'Mixed normal'
    );
    const mixedStruck = [...localized.querySelectorAll('main a')].find(
      (node) => node.textContent === 'Mixed struck'
    );
    assert.equal(mixedNormal?.getAttribute('href'), `${locale}${target}`);
    assert.equal(mixedNormal?.closest('del'), null);
    assert.equal(mixedStruck?.getAttribute('href'), `${locale}${target}`);
    assert.ok(
      mixedStruck?.closest('del'),
      'mixed root token retains its own authored strike'
    );
    assert.equal(
      mixedStruck?.closest('p')?.textContent,
      'Mixed normal and Mixed struck',
      'no visible strike delimiters'
    );
    const twinLinks = [...localized.querySelectorAll('main a')].filter(
      (node) => node.textContent === 'Generated twin'
    );
    assert.equal(
      twinLinks.length,
      2,
      'only the two unescaped twin occurrences are links'
    );
    const visible = localized.querySelector('main')?.textContent ?? '';
    assert.equal(
      visible.match(/\[\[~\/fake\]\]/g)?.length,
      2,
      'escaped fake tokens stay literal'
    );
    assert.equal(
      visible.match(
        /\[\[~\/demo\/openapi\/List consignments\|Generated twin\]\]/g
      )?.length,
      2,
      'same-spelling escaped twins stay literal'
    );
    assert.ok(visible.includes('~ordinary and Generated after tilde'));
    if (locale) localized.defaultView?.close();
  }
  assert.equal(
    doc.querySelector('main strong')?.textContent,
    'Generated prose'
  );
  assert.ok(
    [...doc.querySelectorAll('main del')].some(
      (node) => node.textContent === 'Wiki strike'
    )
  );
  assert.ok(
    [...doc.querySelectorAll('main a[href="/demo/images"]')].some(
      (node) => node.textContent === 'ordinary generated prose'
    )
  );
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
  const machineOutputs = [
    await get('/wiki/wikilinks.md'),
    await mcp('/wiki/wikilinks'),
    await get('/llms-full.txt')
  ];
  for (const text of machineOutputs) {
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
    assert.ok(text.includes('**Generated prose**'));
    assert.ok(text.includes('~~Wiki strike~~'));
    assert.ok(
      text.includes(
        `Occurrence anchor: [ordinary [[WikiAlias]]](~/demo/images) and \\[[WikiAlias]] and [WikiAlias](${target}).`
      )
    );
    assert.ok(
      text.includes(
        `Occurrence direct: [[WikiAlias]](~/demo/images) and [WikiAlias](${target}) and \\[[WikiAlias]].`
      )
    );
    assert.ok(
      text.includes(
        '![x [[Protected shadow]]](/favicon.svg) and \\[[Protected shadow]]'
      )
    );
    assert.ok(text.includes('    [[Indented shadow]]'));
    assert.ok(text.includes(`[R&D parser](${target})`));
    assert.ok(
      text.includes(
        `[Mixed normal](${target}) and ~~[Mixed struck](${target})~~`
      )
    );
    assert.equal(
      text.split(
        '[Generated twin](/demo/openapi/consignments/listconsignments)'
      ).length - 1,
      2,
      'two valid twin occurrences per English page'
    );
    for (const [label, path] of generatedLinks)
      assert.ok(text.includes(`[${label}](${path})`), `${label}: machine link`);
    for (const [, , label] of generatedWanted) {
      assert.ok(text.includes(label));
      assert.ok(!text.includes(`[${label}](`), `${label}: plain text`);
    }
  }
  const german = await get('/de-DE/wiki/wikilinks.md');
  assert.ok(
    german.includes(`[WikiAlias](/de-DE${target})`),
    'machine locale fallback matches HTML scope'
  );
  for (const text of [
    german,
    await mcp('/de-DE/wiki/wikilinks'),
    machineOutputs[2]!
  ])
    for (const [label, path] of generatedLinks)
      assert.ok(
        text.includes(`[${label}](/de-DE${path})`),
        `${label}: reader-locale fallback`
      );
  const stored = JSON.parse(await get('/api/wikilinks-fixture'));
  assert.ok(stored.rawbody.includes('[[WikiAlias]]'));
  assert.ok(
    JSON.stringify(stored.body).includes('[[WikiAlias]]'),
    'stored AST is authored'
  );
  assert.ok(
    JSON.stringify(stored.body).includes('"del"'),
    'stored GFM AST remains authored'
  );
}
const bin = join(site, '../../packages/duxt/bin/duxt.mjs');
const execFileAsync = promisify(execFile);
async function pack() {
  ensureFullHistory();
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
  const wantedNotes = notes.sections.find(
    (section: { heading: string }) => section.heading === 'Wiki wanted pages'
  ).lines as string[];
  for (const [, title] of generatedWanted) {
    assert.ok(wantedNotes.some((line) => line.startsWith(`${title} —`)));
    assert.ok(!notes.warnings.some((line: string) => line.includes(title)));
  }
  for (const title of [
    'List consignments',
    'List shipments',
    'consignments/listconsignments',
    'shipments/listshipments'
  ])
    assert.ok(
      !wantedNotes.some((line) => line.includes(title)),
      `${title}: existing generated target is not wanted`
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
  for (const [prefix] of generatedWanted) {
    const directory = join(site, '.output/public', prefix, 'wanted');
    assert.deepEqual(
      readdirSync(directory, { recursive: true, encoding: 'utf8' }).filter(
        (name) => name.endsWith('.html')
      ),
      ['index.html'],
      `${prefix}: one static utility for generated missing targets`
    );
    assert.match(
      readFileSync(join(directory, 'index.html'), 'utf8'),
      /noindex/
    );
  }
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
  for (const locale of ['', '/de-DE']) {
    await page.goto(`${origin}${locale}/wiki/wikilinks`);
    await hydrated(page);
    const button = page.locator(
      '[data-duxt-copy-page] > button:not([aria-haspopup])'
    );
    const label = await button.textContent();
    assert.ok(label);
    const markdown = await get(`${locale}/wiki/wikilinks.md`);
    await page.evaluate(
      (text) => navigator.clipboard.writeText(text),
      `pending wiki copy ${locale || 'default'}`
    );
    await button.click();
    await page.waitForFunction((before) => {
      const button = document.querySelector(
        '[data-duxt-copy-page] > button:not([aria-haspopup])'
      );
      return Boolean(
        button &&
        !button.hasAttribute('disabled') &&
        button.textContent !== before
      );
    }, label);
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.equal(
      copied,
      markdown,
      `${locale || 'default'} clipboard must equal the direct same-locale .md response`
    );
    assert.ok(copied.includes(`[WikiAlias](${locale}/wiki/wikilink-target)`));
    for (const [label, path] of generatedLinks)
      assert.ok(
        copied.includes(`[${label}](${locale}${path})`),
        `${label}: clipboard`
      );
  }
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
  phase('browser generated wanted');
  for (const locale of ['', '/de-DE']) {
    for (const [prefix, title] of generatedWanted) {
      const path = `${locale}${prefix}/wanted`;
      await page.goto(`${origin}${path}?title=${encodeURIComponent(title)}`);
      await hydrated(page);
      assert.equal(
        await page.locator('[data-wiki-wanted] h2').textContent(),
        title
      );
      assert.equal(
        await page
          .locator(`[data-wiki-wanted] a[href="${locale}/wiki/wikilinks"]`)
          .count(),
        1
      );
      assert.equal(
        await page.locator('[data-wiki-create]').count(),
        0,
        'a generated artifact is not a Markdown directory, even when its source names GitHub'
      );
      assert.ok(
        (
          await page.locator('meta[name="robots"]').getAttribute('content')
        )?.includes('noindex')
      );
      const canonical = new URL(
        (await page.locator('link[rel="canonical"]').getAttribute('href'))!
      );
      assert.equal(canonical.pathname, path);
      assert.equal(canonical.search, '');
      await page.goto(`${origin}${path}`);
      await hydrated(page);
      const listing = await page.locator('[data-wiki-wanted]').textContent();
      assert.ok(listing?.includes(title));
      assert.ok(
        !listing?.includes('Wanted Wiki'),
        'own Wiki misses stay out of generated scope'
      );
    }
  }
  phase('sitemap');
  const sitemapIndex = await get('/sitemap.xml');
  assert.ok(!sitemapIndex.includes('/wiki/wanted'));
  assert.ok(!sitemapIndex.includes('/demo/wanted'));
  const sitemapPaths = [
    ...sitemapIndex.matchAll(/<loc>([^<]+\.xml)<\/loc>/g)
  ].map((match) => new URL(match[1]!).pathname);
  for (const path of sitemapPaths) {
    // The first sitemap restores every collection into the fresh database, a
    // two-minute read on a busy machine; what is asserted is its content.
    const xml = await get(path, 240_000);
    assert.ok(
      !xml.includes('/wiki/wanted') && !xml.includes('/demo/wanted'),
      'wanted excluded from sitemap'
    );
    for (const [prefix] of generatedWanted)
      assert.ok(
        !xml.includes(`${prefix}/wanted`),
        `${prefix}: generated wanted excluded`
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
  // A body no earlier run wrote, for the reason `check-wiki.ts` gives: a
  // parse-cache row for this path from a previous run would skip the parse.
  appendFileSync(
    renamed,
    `\n<!-- check-wikilinks run ${process.pid}-${Date.now()} -->\n`
  );
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
    'Wikilinks check passed: HTML, generated source/version and locale fallback, .md, MCP, llms-full, copy, static wanted, forge proposal, reports, capped backlinks and live target rename without linker reparse.'
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
