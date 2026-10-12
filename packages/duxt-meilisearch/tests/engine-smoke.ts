/** Run with node in a disposable Meilisearch fixture; never a production host. */
import assert from 'node:assert/strict';
import { syncMeilisearch } from '../sync.ts';
import { searchMeilisearch } from '../search.ts';

const host = process.env.MEILISEARCH_HOST;
const syncKey = process.env.MEILISEARCH_SYNC_KEY;
const searchKey = process.env.MEILISEARCH_SEARCH_KEY;
const taskKey = process.env.MEILISEARCH_TASK_KEY;
if (
  !host ||
  !syncKey ||
  !searchKey ||
  process.env.DUXT_MEILI_FIXTURE !== 'true'
)
  throw new Error('Explicit disposable fixture configuration is required');
const options = {
  host,
  syncKey,
  taskKey,
  index: 'docs',
  enabled: true,
  deployment: 'production' as const,
  taskTimeoutMs: 30_000
};
const browser = { host, index: 'docs', searchKey };
const original = Object.freeze({
  id: 'stable_english',
  url: '/v1/guide#intro',
  title: 'Introduction',
  content: 'Normalized plaintext',
  source: '/',
  version: 'v1',
  locale: 'en'
});
const translation = Object.freeze({
  id: 'stable_german',
  url: '/de/v1/guide#intro',
  title: 'Einführung',
  content: 'Normalisierter Klartext',
  source: '/',
  version: 'v1',
  locale: 'de'
});
const generated = Object.freeze({
  id: 'stable_api',
  url: '/api/v2/get',
  title: 'Get resource',
  content: 'Generated operation',
  source: '/api',
  version: 'v2',
  locale: 'en'
});
const first = await syncMeilisearch(
  Object.freeze([original, translation, generated]),
  options
);
assert.equal(first.skipped, false);
assert.equal(first.cleanupFailed, false);
assert.deepEqual(
  await searchMeilisearch('Einführung', browser, [
    { source: '/', version: 'v1', locale: 'de' }
  ]),
  [translation]
);
assert.deepEqual(
  await searchMeilisearch('Generated', browser, [
    { source: '/api', version: 'v2', locale: 'en' }
  ]),
  [generated]
);
assert.equal(
  (
    await searchMeilisearch('Generated', browser, [
      { source: '/', version: 'v1', locale: 'en' }
    ])
  ).length,
  0
);
const updated = Object.freeze({
  ...original,
  title: 'Updated introduction',
  content: 'Updated normalized plaintext'
});
await syncMeilisearch(Object.freeze([updated]), options);
assert.deepEqual(
  await searchMeilisearch('Updated', browser, [
    { source: '/', version: 'v1', locale: 'en' }
  ]),
  [updated]
);
assert.equal(
  (
    await searchMeilisearch('Einführung', browser, [
      { source: '/', version: 'v1', locale: 'de' }
    ])
  ).length,
  0
);
assert.equal(
  (
    await searchMeilisearch('Generated', browser, [
      { source: '/api', version: 'v2', locale: 'en' }
    ])
  ).length,
  0
);
// The real engine accepts this HTTP request, then rejects the invalid id in its
// asynchronous task. An HTTP-acceptance-only implementation would publish it.
await assert.rejects(
  syncMeilisearch([{ ...original, id: 'invalid/id' }], options),
  /task .* failed/
);
assert.deepEqual(
  await searchMeilisearch('Updated', browser, [
    { source: '/', version: 'v1', locale: 'en' }
  ]),
  [updated]
);
const denied = await fetch(`${host}/indexes/docs/documents`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${searchKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify([generated]),
  signal: AbortSignal.timeout(5000)
});
assert.equal(denied.status, 403);
await syncMeilisearch([], options);
assert.equal(
  (
    await searchMeilisearch('Updated', browser, [
      { source: '/', version: 'v1', locale: 'en' }
    ])
  ).length,
  0
);
console.log(
  JSON.stringify({
    initialSnapshot: true,
    stableIdAndProvenance: true,
    sourceVersionLocaleFilters: true,
    replacementAndStaleRemoval: true,
    failedAsyncTaskPreservesPrevious: true,
    searchOnlyKeyWriteDenied: true,
    emptySnapshot: true
  })
);
