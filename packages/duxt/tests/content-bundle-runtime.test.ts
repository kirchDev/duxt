import {
  existsSync,
  readFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, expect, it } from 'vitest';
import {
  writeContentBundle,
  contentCompatHash
} from '../build/content/content-bundle';
import { createContentBundleRuntime } from '../modules/runtime/content-bundles/runtime';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
async function fixture(pollSeconds?: number) {
  const root = mkdtempSync(join(tmpdir(), 'duxt-import-'));
  roots.push(root);
  const filename = join(root, 'runtime.sqlite');
  const compat = {
    databaseVersion: 'v3',
    checksumsStructure: { docs: 's', notes: 's' },
    tables: {
      info: '_content_info',
      docs: '_content_docs',
      notes: '_content_notes'
    },
    collectionMetaHash: 'meta',
    resolvedSourcesHash: 'sources'
  };
  const checksums = { docs: 'v3--image', notes: 'v3--image' };
  const dump = (collection: string, value: string) =>
    gzipSync(
      JSON.stringify([
        'CREATE TABLE IF NOT EXISTS _content_info (id TEXT PRIMARY KEY, version TEXT, structureVersion TEXT, ready BOOLEAN); -- structure',
        `INSERT INTO _content_info VALUES ('checksum_${collection}', 'v3--${value}', 's', false); -- meta`,
        `DROP TABLE IF EXISTS _content_${collection}; -- structure`,
        `CREATE TABLE IF NOT EXISTS _content_${collection} (id TEXT); -- structure`,
        `INSERT INTO _content_${collection} VALUES ('${value}'); -- row`,
        `UPDATE _content_info SET ready = true WHERE id = 'checksum_${collection}'; -- meta`
      ])
    ).toString('base64');
  const imageDumps = {
    docs: dump('docs', 'image'),
    notes: dump('notes', 'image')
  };
  const input = {
    compat,
    usedComponents: [],
    provenance: { commit: 'one' },
    checksums: { docs: 'v3--one', notes: 'v3--one' },
    dumps: { docs: dump('docs', 'one'), notes: dump('notes', 'one') },
    redirects: {},
    media: {}
  };
  const published = await writeContentBundle(input, root);
  const logs: string[] = [];
  const runtime = createContentBundleRuntime({
    pollSeconds,
    directory: root,
    filename,
    artifact: {
      compatHash: contentCompatHash(compat),
      availableComponents: []
    },
    compat,
    checksums,
    imageDumps,
    log: (line) => logs.push(line)
  });
  const view = () => {
    const db = new DatabaseSync(filename);
    try {
      return db
        .prepare(
          'SELECT id FROM _content_docs UNION ALL SELECT id FROM _content_notes'
        )
        .all()
        .map((row) => row.id);
    } finally {
      db.close();
    }
  };
  return {
    root,
    filename,
    compat,
    checksums,
    dump,
    input,
    published,
    logs,
    runtime,
    view
  };
}

it('imports every collection and then publishes matching checksums and dump bytes', async () => {
  const { runtime, published, checksums, view, dump, logs } = await fixture();
  await runtime.activateCurrent();
  expect(runtime.status().active).toEqual({
    id: published.bundleId,
    commit: 'one'
  });
  expect(checksums).toEqual({ docs: 'v3--one', notes: 'v3--one' });
  expect(view()).toEqual(['one', 'one']);
  expect(runtime.dump('docs')).toBe(dump('docs', 'one'));
  expect(logs).toHaveLength(1);
  expect(logs[0]).toBe(
    '[duxt] content bundle ' +
      JSON.stringify({
        id: published.bundleId,
        commit: 'one',
        reason: 'activated'
      })
  );
});

it('rolls back earlier collections and keeps old checksums when the last collection fails', async () => {
  const { root, runtime, published, input, dump, checksums, view } =
    await fixture();
  await runtime.activateCurrent();
  const bad = await writeContentBundle(
    {
      ...input,
      provenance: { commit: 'broken' },
      checksums: { docs: 'v3--two', notes: 'v3--two' },
      dumps: {
        docs: dump('docs', 'two'),
        notes: gzipSync(
          gunzipSync(Buffer.from(dump('notes', 'two'), 'base64'))
            .toString()
            .replace("VALUES ('two')", "VALUES ('two', 'extra')")
        ).toString('base64')
      }
    },
    root
  );
  await runtime.activateCurrent();
  expect(runtime.status().lastRejection?.id).toBe(bad.bundleId);
  expect(runtime.status().active?.id).toBe(published.bundleId);
  expect(checksums).toEqual({ docs: 'v3--one', notes: 'v3--one' });
  expect(view()).toEqual(['one', 'one']);
});

it('retains the active bundle on incompatible structure and never retries its rejected id', async () => {
  const { root, runtime, input, published, checksums, logs, view } =
    await fixture();
  await runtime.activateCurrent();
  const incompatible = await writeContentBundle(
    { ...input, compat: { ...input.compat, collectionMetaHash: 'changed' } },
    root
  );
  await runtime.activateCurrent();
  expect(runtime.status().lastRejection).toMatchObject({
    id: incompatible.bundleId,
    commit: 'one',
    reason: expect.stringContaining('hash differs')
  });
  expect(runtime.status().active?.id).toBe(published.bundleId);
  expect(checksums).toEqual({ docs: 'v3--one', notes: 'v3--one' });
  expect(view()).toEqual(['one', 'one']);
  const count = logs.length;
  await runtime.activateCurrent();
  expect(logs).toHaveLength(count);
});

it('rejects components absent from the image before opening its database', async () => {
  const { root, runtime, filename, input } = await fixture();
  await writeContentBundle(
    { ...input, usedComponents: ['MissingWidget'] },
    root
  );
  await runtime.activateCurrent();
  expect(runtime.status().lastRejection?.reason).toContain('MissingWidget');
  expect(existsSync(filename)).toBe(false);
});

it('rejects a changed payload hash before opening its database', async () => {
  const { root, runtime, filename, published } = await fixture();
  writeFileSync(join(root, published.bundleId, 'dumps/docs.txt'), 'changed');
  await runtime.activateCurrent();
  expect(runtime.status().lastRejection?.reason).toContain('file hash differs');
  expect(existsSync(filename)).toBe(false);
});

it('rejects decompression and ready-ending failures without changing the active content', async () => {
  const { root, runtime, input, dump, view, published } = await fixture();
  await runtime.activateCurrent();
  for (const invalid of [
    'invalid-gzip',
    gzipSync(
      JSON.stringify(
        JSON.parse(
          gunzipSync(Buffer.from(dump('notes', 'two'), 'base64')).toString()
        ).slice(0, -1)
      )
    ).toString('base64')
  ]) {
    await writeContentBundle(
      { ...input, dumps: { ...input.dumps, notes: invalid } },
      root
    );
    await runtime.activateCurrent();
    expect(runtime.status().active?.id).toBe(published.bundleId);
    expect(runtime.status().lastRejection).not.toBeNull();
    expect(view()).toEqual(['one', 'one']);
  }
});

it('settles an empty publication directory with a rejection and no database side effects', async () => {
  const { root, runtime, filename, logs } = await fixture();
  unlinkSync(join(root, 'current'));
  await runtime.activateCurrent();
  expect(runtime.status().active).toBeNull();
  expect(runtime.status().lastRejection?.reason).toContain('ENOENT');
  expect(existsSync(filename)).toBe(false);
  expect(logs).toHaveLength(1);
});

it('polls a changed current pointer and coalesces simultaneous activation requests', async () => {
  const { runtime, root, input, dump, logs } = await fixture(0.02);
  await Promise.all(Array.from({ length: 8 }, () => runtime.activateCurrent()));
  expect(logs).toHaveLength(1);
  const stop = runtime.startPolling();
  try {
    const second = await writeContentBundle(
      {
        ...input,
        provenance: { commit: 'two' },
        checksums: { docs: 'v3--two', notes: 'v3--two' },
        dumps: { docs: dump('docs', 'two'), notes: dump('notes', 'two') }
      },
      root
    );
    await expect.poll(() => runtime.status().active?.id).toBe(second.bundleId);
    expect(runtime.dump('docs')).toBe(dump('docs', 'two'));
    expect(logs).toHaveLength(2);
  } finally {
    stop();
  }
});

it('switches active media and redirects together and retains them after a failed activation', async () => {
  const { runtime, root, input, dump } = await fixture();
  await runtime.activateCurrent();
  const second = await writeContentBundle(
    {
      ...input,
      provenance: { commit: 'two' },
      checksums: { docs: 'v3--two', notes: 'v3--two' },
      dumps: { docs: dump('docs', 'two'), notes: dump('notes', 'two') },
      redirects: { '/old': { redirect: { to: '/new', statusCode: 301 } } },
      media: { 'picture.svg': Buffer.from('blue') }
    },
    root
  );
  await runtime.activateCurrent();
  expect(runtime.redirect('/old')).toEqual({ to: '/new', statusCode: 301 });
  expect(readFileSync(join(root, 'active/media/picture.svg'), 'utf8')).toBe(
    'blue'
  );
  await writeContentBundle(
    { ...input, dumps: { ...input.dumps, notes: 'broken' } },
    root
  );
  await runtime.activateCurrent();
  expect(runtime.status().active?.id).toBe(second.bundleId);
  expect(runtime.redirect('/old')?.to).toBe('/new');
  expect(readFileSync(join(root, 'active/media/picture.svg'), 'utf8')).toBe(
    'blue'
  );
});

it('rejects an unwritable active media switch before changing the database or dump', async () => {
  const { runtime, root, view } = await fixture();
  mkdirSync(join(root, 'active'));
  await runtime.activateCurrent();
  expect(runtime.status().active).toBeNull();
  expect(runtime.status().lastRejection).not.toBeNull();
  expect(runtime.dump('docs')).toBeUndefined();
  expect(() => view()).toThrow();
});

it('rejects redirects to another origin before activating their bundle', async () => {
  const { runtime, root, input } = await fixture();
  await writeContentBundle(
    {
      ...input,
      redirects: {
        '/old': {
          redirect: { to: '//elsewhere.example/page', statusCode: 301 }
        }
      }
    },
    root
  );
  await runtime.activateCurrent();
  expect(runtime.status().active).toBeNull();
  expect(runtime.status().lastRejection?.reason).toContain('redirects');
});
