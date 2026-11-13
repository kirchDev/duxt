import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  existsSync,
  unlinkSync,
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
import { expect, it, onTestFailed } from 'vitest';
import {
  canonicalJson,
  contentHash,
  writeContentBundle
} from '../build/content/content-bundle';
import { readContentManifest } from '../build/content/content-compatibility';
const layer = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require(
  require.resolve('sharp', { paths: [require.resolve('@nuxt/image')] })
);

it('refreshes real Content, media, redirects, MCP and caches without restarting', async () => {
  const root = mkdtempSync(join(layer, '.content-runtime-test-'));
  let server: ReturnType<typeof spawn> | undefined;
  let output = '';
  // A request to the built server that never answers used to hang the whole
  // test until vitest's own limit, which reports neither the request nor the
  // server's output. Each request now carries its own deadline and is named
  // while it is open, and a failure of any kind prints both.
  const open: string[] = [];
  onTestFailed(() => {
    console.error(
      `[content-bundle-server] requests still open: ${open.join(', ') || 'none'}\n` +
        `--- server output (last 8000 characters) ---\n${output.slice(-8000)}`
    );
  });
  const fetch = async (input: string, init: RequestInit = {}) => {
    const label = `${init.method ?? 'GET'} ${input.replace(/^http:\/\/127\.0\.0\.1:\d+/, '')}`;
    open.push(label);
    try {
      return await globalThis.fetch(input, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(60000)
      });
    } catch (error) {
      throw new Error(`${label} failed: ${String(error)}`, { cause: error });
    } finally {
      open.splice(open.indexOf(label), 1);
    }
  };
  try {
    for (const dir of [
      'content/docs',
      'content/notes',
      'server/api',
      'server/plugins',
      'server/middleware',
      'server/mcp/tools',
      'public',
      'app'
    ])
      mkdirSync(join(root, dir), { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    writeFileSync(
      join(root, 'nuxt.config.ts'),
      `export default defineNuxtConfig({ modules: ['@nuxt/content', '@nuxt/image', '@nuxtjs/mcp-toolkit', 'nuxt-og-image', '@nuxtjs/sitemap', ${JSON.stringify(join(layer, 'modules/content-compatibility.ts'))}, ${JSON.stringify(join(layer, 'modules/content-bundles.ts'))}, ${JSON.stringify(join(layer, 'modules/redirects.ts'))}], routeRules: { '/**': { headers: { 'x-consumer': 'keep' } }, '/operator-owned': { redirect: '/operator-choice' }, '/operator-page': { headers: { 'x-owned': 'yes' } } }, content: { experimental: { sqliteConnector: 'native' } }, mcp: { sessions: true }, runtimeConfig: { duxt: { contentBundles: { statusRoute: true, pollSeconds: 0.05 } } }, site: { url: 'https://fixture.example' }, ogImage: { fonts: [], security: { secret: false }, publish: { storage: 'published-og', baseURL: 'https://images.example' } }, sitemap: { sources: ['/api/sitemap'] }, nitro: { storage: { 'published-og': { driver: 'memory' } }, experimental: { asyncContext: true }, prerender: { routes: [], crawlLinks: false } }, devtools: { enabled: false } })`
    );
    writeFileSync(
      join(root, 'app/app.vue'),
      '<template><NuxtImg src="/runtime.png" width="16" /></template>'
    );
    for (const tool of ['list-pages', 'read-page'])
      writeFileSync(
        join(root, 'server/mcp/tools', tool + '.ts'),
        readFileSync(
          join(layer, 'server/mcp/tools', tool + '.ts'),
          'utf8'
        ).replaceAll('../../utils/', layer + '/server/utils/')
      );
    writeFileSync(
      join(root, 'server/mcp/tools/held-view.ts'),
      `import { writeFile, access } from 'node:fs/promises'; export default defineMcpTool({ name: 'held_view', annotations: { readOnlyHint: true }, async handler() { const event = useEvent(); const docs = (await queryCollection(event, 'docs').first()).title; await writeFile(${JSON.stringify(join(root, 'tool-started'))}, 'started'); while (true) { try { await access(${JSON.stringify(join(root, 'tool-release'))}); break; } catch { await new Promise(resolve => setTimeout(resolve, 10)); } } await globalThis.$fetch('/api/view'); return { content: [{ type: 'text', text: JSON.stringify({ docs, notes: (await queryCollection(event, 'notes').first()).title }) }] }; } });`
    );
    writeFileSync(
      join(root, 'server/fixture-paths.json'),
      JSON.stringify({ adminStarted: join(root, 'admin-started') })
    );
    writeFileSync(
      join(root, 'server/api/await-activation.post.ts'),
      `import { writeFile } from 'node:fs/promises'; import fixturePaths from '../fixture-paths.json'; export default defineEventHandler(async () => { await writeFile(fixturePaths.adminStarted, 'started'); while (true) { const status = await globalThis.$fetch('/__duxt/content-bundle'); if (status.active?.commit === 'bundle-two') return status.active; await new Promise(resolve => setTimeout(resolve, 10)); } });`
    );
    const ogRoot = fileURLToPath(import.meta.resolve('nuxt-og-image')).replace(
      /module\.mjs$/,
      ''
    );
    writeFileSync(
      join(root, 'server/api/cache.post.ts'),
      `import { useOgImageBufferCache } from ${JSON.stringify(ogRoot + 'runtime/server/util/cache.js')}; import { htmlPayloadCache } from '#og-image-cache'; import { getPublishedImageCache } from ${JSON.stringify(ogRoot + 'runtime/server/og-image/cache/published.js')}; export default defineEventHandler(async event => { const config = useRuntimeConfig(); const cache = await useOgImageBufferCache({ key: 'fixture', e: event, _nitro: useNitroApp() }, { cacheMaxAgeSeconds: 60, baseCacheKey: config['nuxt-og-image'].baseCacheKey }); await cache.update(Buffer.from('old image')); await htmlPayloadCache.setItem('fixture', { title: 'old' }); getPublishedImageCache(useNitroApp()).remember('fixture', { expiresAt: Date.now() + 60000, url: 'https://images.example/old.png' }, Date.now()); await useStorage('published-og').setItem('manifest:fixture.png.json', { objectKey: 'old.png', expiresAt: Date.now() + 60000 }); return { og: await useStorage(config['nuxt-og-image'].baseCacheKey).getKeys(), html: await htmlPayloadCache.getKeys(), sitemap: await useStorage('sitemap').getKeys(), published: await useStorage('published-og').getKeys() }; });`
    );
    writeFileSync(
      join(root, 'server/api/cache.get.ts'),
      `import { htmlPayloadCache } from '#og-image-cache'; import { getPublishedImageCache } from ${JSON.stringify(ogRoot + 'runtime/server/og-image/cache/published.js')}; export default defineEventHandler(async () => ({ og: await useStorage(useRuntimeConfig()['nuxt-og-image'].baseCacheKey).getKeys(), html: await htmlPayloadCache.getKeys(), sitemap: await useStorage('sitemap').getKeys(), published: await useStorage('published-og').getKeys(), remembered: !!getPublishedImageCache(useNitroApp()).get('fixture', Date.now()) }));`
    );
    writeFileSync(
      join(root, 'server/api/late-cache.get.ts'),
      `import { writeFile, access } from 'node:fs/promises'; export default defineEventHandler(async event => { const value = (await queryCollection(event, 'docs').first()).title; await writeFile(${JSON.stringify(join(root, 'cache-started'))}, 'started'); while (true) { try { await access(${JSON.stringify(join(root, 'cache-release'))}); break; } catch { await new Promise(resolve => setTimeout(resolve, 10)); } } await globalThis.$fetch('/api/view'); await useStorage('sitemap').setItem('late', value); return value; });`
    );
    writeFileSync(
      join(root, 'server/api/late-read.post.ts'),
      `import { writeFile, access } from 'node:fs/promises'; export default defineEventHandler(async event => { const docs = (await queryCollection(event, 'docs').first()).title; await writeFile(${JSON.stringify(join(root, 'post-started'))}, 'started'); while (true) { try { await access(${JSON.stringify(join(root, 'post-release'))}); break; } catch { await new Promise(resolve => setTimeout(resolve, 10)); } } await globalThis.$fetch('/api/view'); return { docs, notes: (await queryCollection(event, 'notes').first()).title }; });`
    );
    writeFileSync(
      join(root, 'server/api/late-get.get.ts'),
      `import { writeFile, access } from 'node:fs/promises'; export default defineEventHandler(async event => { const docs = (await queryCollection(event, 'docs').first()).title; await writeFile(${JSON.stringify(join(root, 'get-started'))}, 'started'); while (true) { try { await access(${JSON.stringify(join(root, 'get-release'))}); break; } catch { await new Promise(resolve => setTimeout(resolve, 10)); } } await globalThis.$fetch('/api/view'); return { docs, notes: (await queryCollection(event, 'notes').first()).title }; });`
    );
    writeFileSync(
      join(root, 'server/api/sitemap.get.ts'),
      `export default defineEventHandler(async event => (await queryCollection(event, 'docs').select('path').all()).map(row => ({ loc: row.path })));`
    );
    writeFileSync(
      join(root, 'content.config.ts'),
      `import { defineContentConfig, defineCollection, z } from '@nuxt/content'; export default defineContentConfig({ collections: { docs: defineCollection({ type: 'page', source: 'docs/*.md', schema: z.object({ search: z.boolean().optional(), rawbody: z.string().optional(), redirectFrom: z.array(z.string()).optional() }) }), notes: defineCollection({ type: 'page', source: 'notes/*.md', schema: z.object({ search: z.boolean().optional(), rawbody: z.string().optional(), redirectFrom: z.array(z.string()).optional() }) }) } })`
    );
    for (const name of ['docs', 'notes'])
      writeFileSync(
        join(root, 'content', name, 'index.md'),
        '---\nredirectFrom: ["/image-old"]\n---\n# ImageMarker\n\nImage content.\n'
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
      if (title === 'BundleTwo')
        writeFileSync(
          join(root, 'content/docs/new-page.md'),
          '# NewOnlyPage\n\nNew page content.\n'
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
    const gifs: Record<string, Buffer> = {};
    for (const color of ['red', 'blue'])
      gifs[color] = await sharp({
        create: { width: 16, height: 8, channels: 3, background: color }
      })
        .gif()
        .toBuffer();
    const directory = join(root, 'bundles');
    const published = await writeContentBundle(
      {
        compat,
        usedComponents: [],
        provenance: { commit: 'bundle-one' },
        checksums,
        dumps,
        redirects: {
          '/operator-page': {
            redirect: { to: '/bundle-choice', statusCode: 301 }
          },
          '/operator-owned': {
            redirect: { to: '/bundle-choice', statusCode: 301 }
          },
          '/bundle-query': {
            redirect: { to: '/docs?keep=target&same=old', statusCode: 301 }
          },
          '/bundle-old': { redirect: { to: '/docs', statusCode: 301 } }
        },
        media: {
          'runtime.png': await sharp({
            create: { width: 64, height: 32, channels: 3, background: 'red' }
          })
            .png()
            .toBuffer(),
          '_duxt/media/fixture/pass.svg': Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg"><title>red</title></svg>'
          ),
          '_duxt/media/fixture/pass.gif': gifs.red
        }
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
            NUXT_IPX_FS_DIR: JSON.stringify([
              join(directory, 'active/media'),
              join(root, '.output/public')
            ]),
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
    const transform = async () => {
      const response = await fetch(url + '/_ipx/w_16/runtime.png');
      expect(response.status).toBe(200);
      const bytes = Buffer.from(await response.arrayBuffer());
      expect(await sharp(bytes).metadata()).toMatchObject({
        width: 16,
        height: 8
      });
      return sharp(bytes).raw().toBuffer();
    };
    const passThrough = async (color: string) => {
      const svg = await fetch(url + '/_duxt/media/fixture/pass.svg');
      expect(svg.headers.get('x-consumer')).toBe('keep');
      expect(svg.status, await svg.clone().text()).toBe(200);
      expect(svg.headers.get('content-type')).toContain('image/svg+xml');
      expect(await svg.text()).toBe(
        '<svg xmlns="http://www.w3.org/2000/svg"><title>' +
          color +
          '</title></svg>'
      );
      const gif = await fetch(url + '/_duxt/media/fixture/pass.gif');
      expect(gif.headers.get('content-type')).toContain('image/gif');
      expect(Buffer.from(await gif.arrayBuffer())).toEqual(gifs[color]);
      expect(
        (await fetch(url + '/_duxt/media/fixture/missing.svg')).status
      ).toBe(404);
      expect(
        (await fetch(url + '/_duxt/media/fixture/%252e%252e%252fbundle.json'))
          .status
      ).toBe(404);
    };
    await passThrough('red');
    const red = await transform();
    expect(red[0]).toBeGreaterThan(200);
    expect(red[2]).toBeLessThan(50);
    expect(
      (
        await fetch(url + '/operator-owned', { redirect: 'manual' })
      ).headers.get('location')
    ).toBe('/operator-choice');
    const ownedPage = await fetch(url + '/operator-page', {
      redirect: 'manual'
    });
    expect(ownedPage.status).not.toBe(301);
    expect(ownedPage.headers.get('x-owned')).toBe('yes');
    expect(
      (await fetch(url + '/image-old', { redirect: 'manual' })).status
    ).not.toBe(301);
    expect(
      (await fetch(url + '/bundle-old', { redirect: 'manual' })).headers.get(
        'location'
      )
    ).toBe('/docs');
    const bundleQuery = await fetch(
      url + '/bundle-query?same=new&q=nuxt%20content&q=ipx',
      { redirect: 'manual' }
    );
    expect(bundleQuery.headers.get('x-consumer')).toBe('keep');
    const bundleLocation = new URL(bundleQuery.headers.get('location')!, url);
    expect(bundleLocation.pathname).toBe('/docs');
    expect(bundleLocation.searchParams.get('keep')).toBe('target');
    expect(bundleLocation.searchParams.getAll('same')).toEqual(['new']);
    expect(bundleLocation.searchParams.getAll('q')).toEqual([
      'nuxt content',
      'ipx'
    ]);
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
    start();
    await expect
      .poll(async () => {
        try {
          return await (await fetch(url + '/api/view')).json();
        } catch {
          return null;
        }
      })
      .toEqual({ docs: 'BundleOne', notes: 'BundleOne' });
    const mcpHeaders: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream'
    };
    const initialized = await fetch(url + '/mcp', {
      method: 'POST',
      headers: mcpHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'bundle-test', version: '0' }
        }
      })
    });
    expect(initialized.ok).toBe(true);
    await initialized.text();
    const session = initialized.headers.get('mcp-session-id');
    if (session) mcpHeaders['mcp-session-id'] = session;
    await (
      await fetch(url + '/mcp', {
        method: 'POST',
        headers: mcpHeaders,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        })
      })
    ).text();
    expect(session).toBeTruthy();
    const streamController = new AbortController();
    const sessionStream = await fetch(url + '/mcp', {
      headers: { ...mcpHeaders, accept: 'text/event-stream' },
      signal: streamController.signal
    });
    expect(sessionStream.status).toBe(200);
    let sessionClosed = false;
    const streamReader = sessionStream.body!.getReader();
    const streamDone = (async () => {
      try {
        while (!(await streamReader.read()).done) {}
      } catch {
        // Aborting the test's long-lived stream is its normal cleanup.
      } finally {
        sessionClosed = true;
      }
    })();
    let callId = 2;
    const tool = async (name: string, args: Record<string, unknown>) => {
      const response = await fetch(url + '/mcp', {
        method: 'POST',
        headers: mcpHeaders,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: callId++,
          method: 'tools/call',
          params: { name, arguments: args }
        })
      });
      expect(response.status).toBe(200);
      const text = await response.text();
      const payload = JSON.parse(
        text.startsWith('event:') || text.startsWith('data:')
          ? text
              .split('\n')
              .find((line) => line.startsWith('data:'))!
              .slice(5)
          : text
      );
      expect(payload.error).toBeUndefined();
      expect(payload.result.isError, text).not.toBe(true);
      return payload.result.content
        .map((item: { text?: string }) => item.text ?? '')
        .join('\n');
    };
    expect(await tool('list_pages', {})).toContain('/docs');
    expect(await tool('list_pages', {})).not.toContain('new-page');
    expect((await fetch(url + '/sitemap.xml')).status).toBe(200);
    const primed = await (
      await fetch(url + '/api/cache', { method: 'POST' })
    ).json();
    expect(primed.og.length).toBeGreaterThan(0);
    expect(primed.html.length).toBeGreaterThan(0);
    expect(primed.sitemap.length).toBeGreaterThan(0);
    expect(primed.published.length).toBeGreaterThan(0);
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
      const admin = fetch(url + '/api/await-activation', {
        method: 'POST',
        signal: AbortSignal.timeout(30000)
      });
      await expect
        .poll(() => existsSync(join(root, 'admin-started')))
        .toBe(true);

      const late = fetch(url + '/api/late-cache');
      await expect
        .poll(() => existsSync(join(root, 'cache-started')))
        .toBe(true);
      const latePost = fetch(url + '/api/late-read', {
        method: 'POST',
        headers: { accept: 'application/json, text/event-stream' }
      });
      await expect
        .poll(() => existsSync(join(root, 'post-started')))
        .toBe(true);
      const lateTool = tool('held_view', {});
      await expect
        .poll(() => existsSync(join(root, 'tool-started')))
        .toBe(true);
      const lateGet = fetch(url + '/api/late-get', {
        headers: { accept: 'application/json, text/event-stream' }
      });
      await expect.poll(() => existsSync(join(root, 'get-started'))).toBe(true);
      const second = await writeContentBundle(
        {
          compat,
          usedComponents: [],
          provenance: { commit: 'bundle-two' },
          ...secondPayload,
          redirects: {
            '/bundle-new': {
              redirect: { to: '/docs/new-page', statusCode: 301 }
            }
          },
          media: {
            'runtime.png': await sharp({
              create: { width: 64, height: 32, channels: 3, background: 'blue' }
            })
              .png()
              .toBuffer(),
            '_duxt/media/fixture/pass.svg': Buffer.from(
              '<svg xmlns="http://www.w3.org/2000/svg"><title>blue</title></svg>'
            ),
            '_duxt/media/fixture/pass.gif': gifs.blue
          }
        },
        directory
      );
      output = '';
      // The old request writes after at least one polling interval has elapsed.
      await new Promise((resolve) => setTimeout(resolve, 150));
      writeFileSync(join(root, 'cache-release'), 'release');
      expect(await (await late).text()).toBe('BundleOne');
      // A finite POST holds the same view after the GET render has finished.
      await new Promise((resolve) => setTimeout(resolve, 150));
      writeFileSync(join(root, 'post-release'), 'release');
      expect(await (await latePost).json()).toEqual({
        docs: 'BundleOne',
        notes: 'BundleOne'
      });
      // The finite tool call retains its view while its session stream stays open.
      await new Promise((resolve) => setTimeout(resolve, 150));
      writeFileSync(join(root, 'tool-release'), 'release');
      expect(JSON.parse(await lateTool)).toEqual({
        docs: 'BundleOne',
        notes: 'BundleOne'
      });
      // This finite GET is the last reader; the open MCP stream reads no content.
      await new Promise((resolve) => setTimeout(resolve, 150));
      writeFileSync(join(root, 'get-release'), 'release');
      expect(await (await lateGet).json()).toEqual({
        docs: 'BundleOne',
        notes: 'BundleOne'
      });
      expect(await (await admin).json()).toMatchObject({
        id: second.bundleId,
        commit: 'bundle-two'
      });
      expect(sessionClosed).toBe(false);
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
      ).toMatchObject({ active: { id: second.bundleId }, warnings: [] });
      expect(await (await fetch(url + '/api/cache')).json()).toEqual({
        og: [],
        html: [],
        sitemap: [],
        published: [],
        remembered: false
      });
      expect(await tool('list_pages', {})).toContain('/docs/new-page');
      expect(await tool('read_page', { path: '/docs/new-page' })).toContain(
        'New page content.'
      );
      await passThrough('blue');
      const blue = await transform();
      expect(blue[2]).toBeGreaterThan(200);
      expect(blue[0]).toBeLessThan(50);
      expect(
        (await fetch(url + '/bundle-new', { redirect: 'manual' })).headers.get(
          'location'
        )
      ).toBe('/docs/new-page');
      expect(
        (await fetch(url + '/bundle-old', { redirect: 'manual' })).status
      ).not.toBe(301);
      expect(await (await fetch(url + '/sitemap.xml')).text()).toContain(
        '/docs/new-page'
      );
      expect((await (await fetch(url + '/api/probe')).json()).dumps).toBe(0);
      const summary = once(reader, 'message');
      reader.postMessage('stop');
      const [result] = await summary;
      expect(result.views).toBeGreaterThan(0);
      expect(result.mixed).toBe(false);
      expect(result.seen.sort()).toEqual(['BundleOne', 'BundleTwo']);
      await once(reader, 'exit');
      expect(
        (await fetch(url + '/mcp', { method: 'DELETE', headers: mcpHeaders }))
          .status
      ).toBe(200);
      await streamDone;
      await stop();
    } finally {
      streamController.abort();
      await streamDone;
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
    writeFileSync(join(directory, 'current'), published.bundleId + '\n');
    start({ NUXT_IPX_FS_DIR: '../public' });
    await expect
      .poll(async () => {
        try {
          return await (await fetch(url + '/__duxt/content-bundle')).json();
        } catch {
          return null;
        }
      })
      .toMatchObject({
        active: { id: published.bundleId },
        warnings: [expect.stringContaining('NUXT_IPX_FS_DIR')]
      });
    expect(await (await fetch(url + '/api/view')).json()).toEqual({
      docs: 'BundleOne',
      notes: 'BundleOne'
    });
    expect(output).toContain('[duxt] content bundle');
    await stop();
    start({ DUXT_CONTENT_BUNDLE_DIR: '', NUXT_DUXT_CONTENT_BUNDLES_DIR: '' });
    await expect
      .poll(async () => {
        try {
          return (
            await fetch(url + '/image-old', { redirect: 'manual' })
          ).headers.get('location');
        } catch {
          return null;
        }
      })
      .toBe('/docs');
    const imageQuery = await fetch(
      url + '/image-old?campaign=docs&q=nuxt%20content&q=ipx',
      { redirect: 'manual' }
    );
    expect(imageQuery.headers.get('x-consumer')).toBe('keep');
    const imageLocation = new URL(imageQuery.headers.get('location')!, url);
    expect(imageLocation.pathname).toBe('/docs');
    expect(imageLocation.searchParams.get('campaign')).toBe('docs');
    expect(imageLocation.searchParams.getAll('q')).toEqual([
      'nuxt content',
      'ipx'
    ]);
    await stop();
    unlinkSync(join(root, 'content/docs/new-page.md'));
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
  // At least the sum of the budgets inside it: a full `nuxt build` (120 s), the
  // prepare pass (30 s) and five polls of up to 30 s each. 180 s was less than
  // that sum, and under CI's parallel package tests the build alone came close
  // enough that the test timed out while every step was still within its own.
}, 300000);
