import assert from 'node:assert/strict';
import { ensureFullHistory } from './full-history.ts';
import {
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { startBuiltServer } from './built-server.ts';
import { assertWikiFixture } from './wiki-assertions.ts';

const site = fileURLToPath(new URL('..', import.meta.url));
const fixture = join(site, 'fixtures/wiki-fixture');
const original = join(fixture, 'docs/target.md');
const renamed = join(fixture, 'docs/renamed.md');
const source = readFileSync(original, 'utf8');
const parsed = join(fixture, 'parsed.log');
const bundles = mkdtempSync(join(tmpdir(), 'duxt-wiki-bundles-'));
const origin = 'http://127.0.0.1:3127';
const server = startBuiltServer({
  port: 3127,
  origin,
  env: {
    NUXT_SITE_URL: origin,
    NUXT_PUBLIC_I18N_BASE_URL: origin,
    DUXT_CONTENT_BUNDLE_DIR: bundles,
    NUXT_DUXT_CONTENT_BUNDLES_POLL_SECONDS: '1',
    NUXT_DUXT_CONTENT_BUNDLES_STATUS_ROUTE: 'true'
  }
});
const pack = () => {
  ensureFullHistory();
  const packed = spawnSync(
    process.execPath,
    [
      join(site, '../../packages/duxt/bin/duxt.mjs'),
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
  assert.equal(packed.status, 0, packed.stdout + packed.stderr);
};
const activated = async () => {
  const expected = readFileSync(join(bundles, 'current'), 'utf8').trim();
  const deadline = Date.now() + 60_000;
  let status: {
    active?: { id: string };
    lastRejection?: { id: string; reason: string };
  } = {};
  while (Date.now() < deadline) {
    const response = await fetch(`${origin}/__duxt/content-bundle`, {
      signal: AbortSignal.timeout(10_000)
    });
    assert.equal(response.status, 200, await response.clone().text());
    status = (await response.json()) as typeof status;
    if (status.active?.id === expected) return;
    if (status.lastRejection?.id === expected)
      assert.fail(`Bundle rejected: ${status.lastRejection.reason}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(`Bundle was not activated: ${JSON.stringify(status)}`);
};

try {
  await server.ready();
  const initial = await assertWikiFixture(origin);
  writeFileSync(parsed, '');
  pack();
  await activated();
  const primed = readFileSync(join(bundles, 'current'), 'utf8');
  console.log(
    `Wiki cache primed: ${readFileSync(parsed, 'utf8').split('\n').filter(Boolean).length} parse events.`
  );
  writeFileSync(parsed, '');
  pack();
  assert.equal(
    readFileSync(parsed, 'utf8'),
    '',
    'the unchanged second pack parses no files'
  );
  assert.equal(
    readFileSync(join(bundles, 'current'), 'utf8'),
    primed,
    'the warm pack publishes identical data'
  );
  assert.deepEqual(await assertWikiFixture(origin), initial);
  renameSync(original, renamed);
  // A body no earlier run wrote. Content keeps a parse-cache row for every file
  // it ever parsed, and a row for this path from a previous run — on a machine
  // or a CI cache that kept `.data` — would let the pack skip the parse this
  // check exists to observe.
  writeFileSync(
    renamed,
    source.replace('title: Élite_%', 'title: Renamed') +
      `\n<!-- check-wiki run ${process.pid}-${Date.now()} -->\n`
  );
  writeFileSync(parsed, '');
  pack();
  const events = readFileSync(parsed, 'utf8');
  assert.match(events, /wiki-fixture\/docs\/renamed\.md/);
  assert.doesNotMatch(events, /wiki-fixture\/docs\/index\.md/);
  await activated();
  const deadline = Date.now() + 20_000;
  while (true) {
    try {
      await assertWikiFixture(origin, true);
      break;
    } catch (error) {
      if (Date.now() > deadline) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  console.log(
    'Wiki check passed — real rows, batched title/alias/path/incoming queries, warm cache and renamed target through bundles without reparsing its linker.'
  );
} catch (error) {
  if (server.stderr().trim()) console.error(server.stderr());
  throw error;
} finally {
  rmSync(renamed, { force: true });
  writeFileSync(original, source);
  rmSync(parsed, { force: true });
  await server.stop();
  rmSync(bundles, { recursive: true, force: true });
}
