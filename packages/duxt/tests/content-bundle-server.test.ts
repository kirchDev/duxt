import { spawn, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { Worker } from 'node:worker_threads';
import { expect, it } from 'vitest';
import {
  canonicalJson,
  contentHash,
  writeContentBundle
} from '../build/content/content-bundle';
import { readContentManifest } from '../build/content/content-compatibility';
const layer = fileURLToPath(new URL('..', import.meta.url));

it('starts real Content on the default relative SQLite file with bundle checksums and dumps', async () => {
  const root = mkdtempSync(join(layer, '.content-runtime-test-'));
  let server: ReturnType<typeof spawn> | undefined;
  let output = '';
  try {
    for (const dir of [
      'content/docs',
      'content/notes',
      'server/api',
      'server/plugins',
      'server/middleware'
    ])
      mkdirSync(join(root, dir), { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    writeFileSync(
      join(root, 'nuxt.config.ts'),
      `export default defineNuxtConfig({ modules: ['@nuxt/content', ${JSON.stringify(join(layer, 'modules/content-compatibility.ts'))}, ${JSON.stringify(join(layer, 'modules/content-bundles.ts'))}], content: { experimental: { sqliteConnector: 'native' } }, runtimeConfig: { duxt: { contentBundles: { statusRoute: true } } }, nitro: { prerender: { routes: [], crawlLinks: false } }, devtools: { enabled: false } })`
    );
    writeFileSync(
      join(root, 'content.config.ts'),
      `import { defineContentConfig, defineCollection } from '@nuxt/content'; export default defineContentConfig({ collections: { docs: defineCollection({ type: 'page', source: 'docs/*.md' }), notes: defineCollection({ type: 'page', source: 'notes/*.md' }) } })`
    );
    for (const name of ['docs', 'notes'])
      writeFileSync(
        join(root, 'content', name, 'index.md'),
        '# ImageMarker\n\nImage content.\n'
      );
    writeFileSync(
      join(root, 'server/api/view.get.ts'),
      `export default defineEventHandler(async event => ({ docs: (await queryCollection(event, 'docs').first())?.title, notes: (await queryCollection(event, 'notes').first())?.title }))`
    );
    writeFileSync(
      join(root, 'server/plugins/dump-probe.ts'),
      `let reads = 0; export const dumpReads = () => reads; export default defineNitroPlugin(app => { app.hooks.hook('request', event => { if (/^\\/__nuxt_content\\/.+\\/sql_dump\\.txt$/.test(event.path.split('?')[0])) reads++; }); });`
    );
    writeFileSync(
      join(root, 'server/api/probe.get.ts'),
      `import { dumpReads } from '../plugins/dump-probe'; export default defineEventHandler(event => ({ dumps: dumpReads(), filename: new URL(useRuntimeConfig(event).content.database.filename, globalThis._importMeta_.url).pathname }));`
    );
    writeFileSync(
      join(root, 'server/middleware/status-fallback.ts'),
      `export default defineEventHandler(event => { if(event.path.split('?')[0] === '/__duxt/content-bundle') throw createError({ statusCode: 404 }); });`
    );
    const built = spawnSync(
      process.execPath,
      [join(layer, 'node_modules/nuxt/bin/nuxt.mjs'), 'build'],
      { cwd: root, encoding: 'utf8', timeout: 120000 }
    );
    expect(built.status, built.stdout + built.stderr).toBe(0);
    const artifact = JSON.parse(
      readFileSync(join(root, '.output/duxt-content-compat.json'), 'utf8')
    );
    const manifest = readContentManifest(
      readFileSync(join(root, '.nuxt/content/manifest.ts'), 'utf8')
    );
    const compat = {
      databaseVersion: Object.values(manifest.checksums)[0]!.split('--')[0]!,
      checksumsStructure: manifest.checksumsStructure,
      tables: manifest.tables,
      collectionMetaHash: contentHash(canonicalJson(manifest.collectionMeta)),
      resolvedSourcesHash: contentHash(canonicalJson([]))
    };
    async function parseBundle(title: string) {
      for (const name of ['docs', 'notes'])
        writeFileSync(
          join(root, 'content', name, 'index.md'),
          '# ' + title + '\n\nChanged bundle content.\n'
        );
      const buildDir = join(root, '.nuxt-' + title);
      const parsed = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `import { loadNuxt, buildNuxt } from 'nuxt/kit'; const nuxt = await loadNuxt({ cwd: process.cwd(), dev: false, overrides: { buildDir: ${JSON.stringify(buildDir)} } }); try { nuxt.options._prepare = true; await buildNuxt(nuxt); } finally { await nuxt.close(); }`
        ],
        { cwd: root, encoding: 'utf8', timeout: 30000 }
      );
      expect(parsed.status, parsed.stdout + parsed.stderr).toBe(0);
      const parsedManifest = readContentManifest(
        readFileSync(join(buildDir, 'content/manifest.ts'), 'utf8')
      );
      const compressed = readFileSync(
        join(buildDir, 'content/database.compressed.mjs'),
        'utf8'
      );
      const dumps: Record<string, string> = {};
      for (const collection of Object.keys(parsedManifest.checksums)) {
        const line = compressed
          .split('\n')
          .find((line) => line.startsWith(`export const ${collection} = `))!;
        dumps[collection] = JSON.parse(line.slice(line.indexOf(' = ') + 3));
        expect(parsedManifest.checksums[collection]).not.toBe(
          manifest.checksums[collection]
        );
      }
      return { checksums: parsedManifest.checksums, dumps };
    }
    const { checksums, dumps } = await parseBundle('BundleOne');
    const directory = join(root, 'bundles');
    const published = await writeContentBundle(
      {
        compat,
        usedComponents: [],
        provenance: { commit: 'bundle-one' },
        checksums,
        dumps,
        redirects: {},
        media: {}
      },
      directory
    );
    expect(published.compatHash).toBe(artifact.compatHash);
    expect(
      Object.values(dumps).every((dump) =>
        gunzipSync(Buffer.from(dump, 'base64')).toString().includes('BundleOne')
      )
    ).toBe(true);
    const socket = createServer();
    socket.listen(0, '127.0.0.1');
    await once(socket, 'listening');
    const port = (socket.address() as { port: number }).port;
    await new Promise<void>((resolve) => socket.close(() => resolve()));
    const start = (environment: Record<string, string> = {}) => {
      server = spawn(
        process.execPath,
        [join(root, '.output/server/index.mjs')],
        {
          cwd: root,
          env: {
            ...process.env,
            PORT: String(port),
            HOST: '127.0.0.1',
            DUXT_CONTENT_BUNDLE_DIR: directory,
            ...environment
          },
          stdio: ['ignore', 'pipe', 'pipe']
        }
      );
      server.stdout!.on('data', (data) => {
        output += data;
      });
      server.stderr!.on('data', (data) => {
        output += data;
      });
    };
    const stop = async () => {
      server?.kill('SIGTERM');
      if (server && server.exitCode === null) await once(server, 'exit');
      server = undefined;
    };
    start();
    const url = 'http://127.0.0.1:' + port;
    await expect
      .poll(
        async () => {
          try {
            return await (await fetch(url + '/api/view')).json();
          } catch {
            return null;
          }
        },
        { timeout: 30000, interval: 100 }
      )
      .toEqual({ docs: 'BundleOne', notes: 'BundleOne' });
    const probe = (await (await fetch(url + '/api/probe')).json()) as {
      dumps: number;
      filename: string;
    };
    expect(probe.dumps).toBe(0);
    expect(
      await (await fetch(url + '/__duxt/content-bundle')).json()
    ).toMatchObject({
      active: { id: published.bundleId, commit: 'bundle-one' },
      compatHash: artifact.compatHash
    });
    for (const [collection, dump] of Object.entries(dumps))
      expect(
        await (
          await fetch(url + '/__nuxt_content/' + collection + '/sql_dump.txt')
        ).text()
      ).toBe(dump);
    expect((await (await fetch(url + '/api/probe')).json()).dumps).toBe(
      Object.keys(dumps).length
    );
    expect(output).toContain('[duxt] content bundle ');
    await stop();
    const guard = new DatabaseSync(probe.filename);
    for (const table of Object.values(manifest.tables).filter(
      (table) => table !== '_content_info'
    ))
      guard.exec(
        `CREATE TRIGGER protect_${table} BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT, 'same bundle must not replay'); END`
      );
    guard.close();
    output = '';
    start();
    await expect
      .poll(
        async () => {
          try {
            return await (await fetch(url + '/api/view')).json();
          } catch {
            return null;
          }
        },
        { timeout: 30000, interval: 100 }
      )
      .toEqual({ docs: 'BundleOne', notes: 'BundleOne' });
    expect(output).toContain('already-active');
    expect((await (await fetch(url + '/api/probe')).json()).dumps).toBe(0);
    await stop();
    const unguard = new DatabaseSync(probe.filename);
    for (const table of Object.values(manifest.tables).filter(
      (table) => table !== '_content_info'
    ))
      unguard.exec(`DROP TRIGGER protect_${table}`);
    unguard.close();
    const reader = new Worker(
      `const { parentPort, workerData } = require('node:worker_threads'); const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync(workerData.filename); db.exec('PRAGMA busy_timeout=5000'); const query = db.prepare('SELECT (SELECT title FROM ' + workerData.docs + ' LIMIT 1) AS docs, (SELECT title FROM ' + workerData.notes + ' LIMIT 1) AS notes'); let views = 0; const seen = new Set(); let mixed = false; let stopped = false; function read() { if(stopped)return; for(let i=0;i<100;i++){ const row=query.get(); views++; seen.add(row.docs); if(row.docs !== row.notes) mixed=true; } if(!stopped)setImmediate(read); } parentPort.on('message', () => { stopped=true; db.close(); parentPort.postMessage({ views, seen: [...seen], mixed }); parentPort.close(); }); read(); parentPort.postMessage('ready');`,
      {
        eval: true,
        workerData: {
          filename: probe.filename,
          docs: manifest.tables.docs,
          notes: manifest.tables.notes
        }
      }
    );
    await once(reader, 'message');
    try {
      const secondPayload = await parseBundle('BundleTwo');
      const second = await writeContentBundle(
        {
          compat,
          usedComponents: [],
          provenance: { commit: 'bundle-two' },
          ...secondPayload,
          redirects: {},
          media: {}
        },
        directory
      );
      output = '';
      start();
      await expect
        .poll(
          async () => {
            try {
              return await (await fetch(url + '/api/view')).json();
            } catch {
              return null;
            }
          },
          { timeout: 30000, interval: 100 }
        )
        .toEqual({ docs: 'BundleTwo', notes: 'BundleTwo' });
      expect(
        await (await fetch(url + '/__duxt/content-bundle')).json()
      ).toMatchObject({ active: { id: second.bundleId } });
      expect((await (await fetch(url + '/api/probe')).json()).dumps).toBe(0);
      const summary = once(reader, 'message');
      reader.postMessage('stop');
      const [result] = await summary;
      expect(result.views).toBeGreaterThan(0);
      expect(result.mixed).toBe(false);
      expect(result.seen.sort()).toEqual(['BundleOne', 'BundleTwo']);
      await once(reader, 'exit');
      await stop();
    } finally {
      await reader.terminate();
    }
    const invalid = await writeContentBundle(
      {
        compat: { ...compat, collectionMetaHash: 'different' },
        usedComponents: [],
        provenance: { commit: 'incompatible' },
        checksums,
        dumps,
        redirects: {},
        media: {}
      },
      directory
    );
    output = '';
    start();
    await expect
      .poll(
        async () => {
          try {
            return await (await fetch(url + '/api/view')).json();
          } catch {
            return null;
          }
        },
        { timeout: 30000, interval: 100 }
      )
      .toEqual({ docs: 'ImageMarker', notes: 'ImageMarker' });
    expect(
      await (await fetch(url + '/__duxt/content-bundle')).json()
    ).toMatchObject({
      active: null,
      lastRejection: {
        id: invalid.bundleId,
        reason: expect.stringContaining('hash differs')
      }
    });
    expect(
      (await (await fetch(url + '/api/probe')).json()).dumps
    ).toBeGreaterThan(0);
    await stop();
    output = '';
    start({ NUXT_DUXT_CONTENT_BUNDLES_STATUS_ROUTE: 'false' });
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(url + '/__duxt/content-bundle')).status;
          } catch {
            return null;
          }
        },
        { timeout: 30000, interval: 100 }
      )
      .toBe(404);
  } catch (error) {
    throw new Error(String(error) + '\n' + output, { cause: error });
  } finally {
    server?.kill('SIGTERM');
    if (server && server.exitCode === null) await once(server, 'exit');
    rmSync(root, { recursive: true, force: true });
  }
}, 180000);
