import assert from 'node:assert/strict';
import { ensureFullHistory } from './full-history.ts';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { chromium, type Browser } from 'playwright-core';
import { JSDOM } from 'jsdom';
import { browserPath, missingBrowser } from './browser.ts';
import { startBuiltServer } from './built-server.ts';
import {
  INFOBOX_ROUTES,
  checkInfoboxFixtures,
  checkInfoboxLayout
} from './infobox-fixture.ts';

const site = fileURLToPath(new URL('..', import.meta.url));
const core = fileURLToPath(new URL('../../../packages/duxt', import.meta.url));
const execute = promisify(execFile);

async function imageHash(directory: string): Promise<string> {
  const hash = createHash('sha256');
  const walk = async (path: string) => {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name)
    )) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile())
        hash.update(file.slice(directory.length)).update(await readFile(file));
    }
  };
  await walk(directory);
  return hash.digest('hex');
}

async function waitFor<T>(
  read: () => Promise<T>,
  accepts: (value: T) => boolean
): Promise<T> {
  const until = Date.now() + 30_000;
  while (true) {
    const value = await read();
    if (accepts(value)) return value;
    if (Date.now() >= until)
      throw new Error(
        `Infobox bundle did not activate: ${JSON.stringify(value)}`
      );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function main() {
  for (const path of INFOBOX_ROUTES) {
    assert.equal(
      existsSync(join(site, '.output/public', path.slice(1), 'index.html')),
      false,
      `${path}: Node articles and queries stay live SSR for bundle activation`
    );
  }
  const executablePath = browserPath();
  assert.ok(executablePath, missingBrowser('Infobox check'));
  const directory = await mkdtemp(join(tmpdir(), 'duxt-infobox-bundles-'));
  const sprintFile = join(site, 'fixtures/wiki-fixture/docs/infobox-sprint.md');
  const catalogFile = join(
    site,
    'fixtures/wiki-fixture/docs/infobox-catalog.md'
  );
  const [sprint, catalog] = await Promise.all([
    readFile(sprintFile, 'utf8'),
    readFile(catalogFile, 'utf8')
  ]);
  const before = await imageHash(join(site, '.output'));
  const port = Number(process.env.INFOBOX_CHECK_PORT ?? 3132);
  const origin = `http://127.0.0.1:${port}`;
  const server = startBuiltServer({
    port,
    origin,
    env: {
      DUXT_CONTENT_BUNDLE_DIR: directory,
      NUXT_DUXT_CONTENT_BUNDLES_POLL_SECONDS: '0.05',
      NUXT_DUXT_CONTENT_BUNDLES_STATUS_ROUTE: 'true',
      NUXT_IPX_FS_DIR: JSON.stringify([
        join(directory, 'active/media'),
        join(site, '.output/public')
      ])
    }
  });
  let browser: Browser | undefined;
  const get = async (path: string) => {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    return response.json();
  };
  const pack = async () => {
    ensureFullHistory();
    const { stdout } = await execute(
      process.execPath,
      [
        join(core, 'bin/duxt.mjs'),
        'content',
        'pack',
        '--publish',
        directory,
        '--expect',
        join(site, '.output/duxt-content-compat.json')
      ],
      { cwd: site, timeout: 180_000, maxBuffer: 16 * 1024 * 1024 }
    );
    const id = (await readFile(join(directory, 'current'), 'utf8')).trim();
    console.log(`Infobox content pack: ${id}\n${stdout.slice(-1000)}`);
    return id;
  };
  try {
    browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
    await server.ready();
    await checkInfoboxFixtures(origin);
    await checkInfoboxLayout(browser, origin);
    const baseline = await get('/api/infobox-fixture');
    const id = await pack();
    const statements = JSON.parse(
      gunzipSync(
        Buffer.from(
          await readFile(join(directory, id, 'dumps/docs_wiki.txt'), 'utf8'),
          'base64'
        )
      ).toString()
    ) as string[];
    const db = new DatabaseSync(':memory:');
    try {
      for (const statement of statements) db.exec(statement);
      const row = db
        .prepare('SELECT infobox FROM _content_docs_wiki WHERE path = ?')
        .get('/wiki/infobox-sprint')!;
      assert.deepEqual(
        JSON.parse(String(row.infobox)),
        baseline.pages.find(
          (page: { path: string }) => page.path === '/wiki/infobox-sprint'
        ).infobox,
        'real runtime row and content-pack row agree'
      );
    } finally {
      db.close();
    }
    await waitFor(
      () => get('/__duxt/content-bundle'),
      (status) => status.active?.id === id
    );
    assert.deepEqual((await get('/__duxt/content-bundle')).warnings, []);
    assert.deepEqual(
      await get('/api/infobox-fixture'),
      baseline,
      'the same facts survive bundle activation'
    );
    await writeFile(
      sprintFile,
      sprint
        .replace('type="mode"', 'type="season"')
        .replace(
          ':::infobox-group',
          ':::infobox-row{label="Phase" key="phase"}\nExperimental\n:::\n:::infobox-group'
        )
    );
    await writeFile(
      catalogFile,
      catalog.replace(
        'type="mode" where="status=Available" columns="title,version,duration,release"',
        'type="season" where="phase=Experimental" columns="title,phase"'
      )
    );
    const updated = await pack();
    assert.notEqual(updated, id, 'content-only edit creates a new bundle');
    await waitFor(
      () => get('/__duxt/content-bundle'),
      (status) => status.active?.id === updated
    );
    const next = await get(
      '/api/infobox-fixture?type=season&where=phase%3DExperimental'
    );
    assert.deepEqual(
      next.matches.map((page: { title: string }) => page.title),
      ['Sprint mode']
    );
    assert.equal(
      next.matches[0].infobox.values.phase,
      'Experimental',
      'a new row key reaches the unchanged server'
    );
    const html = await (
      await fetch(origin + '/wiki/infobox-catalog', {
        headers: { accept: 'text/html' }
      })
    ).text();
    const document = new JSDOM(html).window.document;
    assert.deepEqual(
      [...document.querySelectorAll('[data-infobox-query] tbody tr')].map(
        (row) =>
          [...row.querySelectorAll('td')].map((cell) =>
            cell.textContent?.trim()
          )
      ),
      [['Sprint mode', 'Experimental']],
      'the rendered query cells show the content-only type and field'
    );
    const updatedBox = new JSDOM(
      await (
        await fetch(origin + '/wiki/infobox-sprint', {
          headers: { accept: 'text/html' }
        })
      ).text()
    ).window.document;
    const phase = [...updatedBox.querySelectorAll('[data-infobox-row]')].find(
      (row) => row.querySelector('dt')?.textContent?.trim() === 'Phase'
    );
    assert.equal(
      phase?.querySelector('dd')?.textContent?.trim(),
      'Experimental',
      'the existing infobox component renders the content-only new row'
    );
    assert.equal(
      await imageHash(join(site, '.output')),
      before,
      'runtime bundle updates do not alter the built image'
    );
    console.log(
      'Infobox check passed: real DB/pack rows, matching/empty/translated queries, groups, 320/412px stacking, wide float, image zoom, and content-only type/key activation in one unchanged image.'
    );
  } catch (error) {
    throw new Error(`${String(error)}\n${server.stderr()}`, { cause: error });
  } finally {
    await Promise.all([
      writeFile(sprintFile, sprint),
      writeFile(catalogFile, catalog)
    ]);
    await browser?.close();
    await server.stop();
    await rm(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
