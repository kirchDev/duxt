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
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import {
  browserPath,
  missingBrowser,
  hydrated
} from '../../../apps/www/scripts/browser';
import { expect, it } from 'vitest';
import {
  canonicalJson,
  contentHash,
  writeContentBundle,
  assertContentCompatibility
} from '../build/content/content-bundle';
import { readContentManifest } from '../build/content/content-compatibility';
const { chromium } = createRequire(
  new URL('../../../apps/www/package.json', import.meta.url)
)(
  'playwright-core'
) as typeof import('../../../apps/www/node_modules/playwright-core');
const layer = fileURLToPath(new URL('..', import.meta.url));

it('renders runtime MDC and refreshes stale browser dumps only on a full load', async () => {
  const root = mkdtempSync(join(layer, '.content-browser-test-'));
  let server: ReturnType<typeof spawn> | undefined;
  let output = '';
  try {
    const put = (path: string, content: string) => {
      const parts = path.split('/');
      parts.pop();
      mkdirSync(join(root, ...parts), { recursive: true });
      writeFileSync(join(root, path), content);
    };
    put('package.json', '{"type":"module"}');
    put(
      'base/nuxt.config.ts',
      `export default defineNuxtConfig({ extends: ['../nested'] })`
    );
    put('nested/nuxt.config.ts', 'export default defineNuxtConfig({})');
    put(
      'base/app/components/content/LayerBadge.vue',
      '<template><strong data-layer-badge>Layer content <slot /></strong></template>'
    );
    put(
      'nested/app/components/content/NestedBadge.vue',
      '<template><em data-nested-badge>Nested content <slot /></em></template>'
    );
    put(
      'base/app/components/content/ConsumerBadge.vue',
      '<template><b>Wrong overridden component</b></template>'
    );
    put(
      'app/components/content/ConsumerBadge.vue',
      '<template><aside data-consumer-badge>Consumer content <slot /></aside></template>'
    );
    put(
      'app/components/ui/UnusedPanel.vue',
      '<template><aside>UI only</aside></template>'
    );
    put(
      'nuxt.config.ts',
      `export default defineNuxtConfig({ extends: ['./base'], modules: ['@nuxt/content', ${JSON.stringify(join(layer, 'modules/content-compatibility.ts'))}, ${JSON.stringify(join(layer, 'modules/content-bundles.ts'))}], content: { experimental: { sqliteConnector: 'native' } }, runtimeConfig: { duxt: { contentBundles: { statusRoute: true, pollSeconds: 0.05 } } }, nitro: { prerender: { routes: [], crawlLinks: false } }, devtools: { enabled: false } })`
    );
    put(
      'content.config.ts',
      `import { defineContentConfig, defineCollection } from '@nuxt/content'; export default defineContentConfig({ collections: { docs: defineCollection({ type: 'page', source: 'docs/*.md' }) } })`
    );
    put(
      'app/app.vue',
      `<script setup>const { data: page } = await useAsyncData('page', () => queryCollection('docs').first()); const again = ref(''); async function queryAgain() { await navigateTo('/after-switch'); again.value = (await queryCollection('docs').first())?.title; }</script><template><ContentRenderer v-if="page" :value="page" /><MDC :value="'::layer-badge\\nDefault probe.\\n::'" /><ClientOnly><output id="first-query">{{ $bundleFirstQuery }}</output><button @click="queryAgain">Query again</button><output id="again">{{ again }}</output></ClientOnly></template>`
    );
    put(
      'app/plugins/query.client.ts',
      `export default defineNuxtPlugin({ name: 'first-query', enforce: 'pre', async setup() { const rows = await queryCollection('docs').all(); return { provide: { bundleFirstQuery: rows[0]?.title } }; } });`
    );
    put('content/docs/index.md', '# ImageMarker\n\nImage content.\n');
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
    const imageCompressed = readFileSync(
      join(root, '.nuxt/content/database.compressed.mjs'),
      'utf8'
    );
    const imageLine = imageCompressed
      .split('\n')
      .find((line) => line.startsWith('export const docs = '))!;
    const imageDump = JSON.parse(imageLine.slice(imageLine.indexOf(' = ') + 3));
    const imageComponents = readFileSync(
      join(root, '.nuxt/content/components.ts'),
      'utf8'
    );
    const compat = {
      databaseVersion: Object.values(manifest.checksums)[0]!.split('--')[0]!,
      checksumsStructure: manifest.checksumsStructure,
      tables: manifest.tables,
      collectionMetaHash: contentHash(canonicalJson(manifest.collectionMeta)),
      resolvedSourcesHash: contentHash(canonicalJson([]))
    };
    const parse = async (title: string, component = 'layer-badge') => {
      put(
        'content/docs/index.md',
        '# ' +
          title +
          '\n\n::' +
          component +
          '\nA runtime slot.\n::\n\n::nested-badge\nNested slot.\n::\n\n::consumer-badge\nConsumer slot.\n::\n'
      );
      const buildDir = join(root, '.nuxt-' + title);
      const parsed = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `import { loadNuxt, buildNuxt } from 'nuxt/kit'; import { writeFile } from 'node:fs/promises'; import { createJiti } from 'jiti'; const { contentCompatibility } = await createJiti(import.meta.url).import(${JSON.stringify(join(layer, 'build/content/content-compatibility.ts'))}); const nuxt = await loadNuxt({ cwd: process.cwd(), dev: false, overrides: { buildDir: ${JSON.stringify(buildDir)} } }); try { nuxt.options._prepare = true; await buildNuxt(nuxt); const result = await contentCompatibility(nuxt); await writeFile(${JSON.stringify(join(buildDir, 'compat.json'))}, JSON.stringify(result)); } finally { await nuxt.close(); }`
        ],
        { cwd: root, encoding: 'utf8', timeout: 30000 }
      );
      expect(parsed.status, parsed.stdout + parsed.stderr).toBe(0);
      const result = JSON.parse(
        readFileSync(join(buildDir, 'compat.json'), 'utf8')
      );
      const compressed = readFileSync(
        join(buildDir, 'content/database.compressed.mjs'),
        'utf8'
      );
      const line = compressed
        .split('\n')
        .find((line) => line.startsWith('export const docs = '))!;
      return {
        ...result,
        dumps: { docs: JSON.parse(line.slice(line.indexOf(' = ') + 3)) }
      };
    };
    const first = await parse('BundleOne');
    expect(first.usedComponents).toEqual(
      expect.arrayContaining(['LayerBadge', 'NestedBadge', 'ConsumerBadge'])
    );
    // No build-time Markdown referenced these components; only their code shipped.
    for (const name of ['LayerBadge', 'NestedBadge', 'ConsumerBadge'])
      expect(imageComponents).not.toContain(name + ': () =>');
    const directory = join(root, 'bundles');
    const publish = (payload: typeof first) =>
      writeContentBundle(
        {
          compat,
          usedComponents: payload.usedComponents,
          checksums: payload.checksums,
          dumps: payload.dumps,
          provenance: { commit: 'runtime' },
          redirects: {},
          media: {}
        },
        directory
      );
    const published = await publish(first);
    const socket = createServer();
    socket.listen(0, '127.0.0.1');
    await once(socket, 'listening');
    const port = (socket.address() as { port: number }).port;
    await new Promise<void>((resolve) => socket.close(() => resolve()));
    const start = (dir: string) => {
      server = spawn(
        process.execPath,
        [join(root, '.output/server/index.mjs')],
        {
          cwd: root,
          env: {
            ...process.env,
            PORT: String(port),
            HOST: '127.0.0.1',
            DUXT_CONTENT_BUNDLE_DIR: dir,
            NUXT_DUXT_CONTENT_BUNDLES_DIR: ''
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
    const url = 'http://127.0.0.1:' + port;
    start('');
    await expect
      .poll(
        async () => {
          try {
            return await (await fetch(url)).text();
          } catch {
            return '';
          }
        },
        { timeout: 30000 }
      )
      .toContain('ImageMarker');
    const ordinary = await (await fetch(url)).text();
    expect(ordinary).toContain('<LayerBadge>');
    expect(ordinary).not.toContain('data-layer-badge');
    expect(ordinary).not.toContain('duxtContentBundleChecksums');
    server!.kill('SIGTERM');
    await once(server!, 'exit');
    server = undefined;
    start(directory);
    await expect
      .poll(
        async () => {
          try {
            return await (await fetch(url + '/__duxt/content-bundle')).json();
          } catch {
            return null;
          }
        },
        { timeout: 30000 }
      )
      .toMatchObject({ active: { id: published.bundleId } });
    const html = await (await fetch(url)).text();
    expect(html).toContain('data-layer-badge');
    expect(html).toContain('data-nested-badge');
    expect(html).toContain('data-consumer-badge');
    expect(html).toContain('A runtime slot.');
    expect(html).not.toContain('Wrong overridden component');
    const executablePath = browserPath();
    expect(
      executablePath,
      missingBrowser('content bundle browser test')
    ).not.toBeNull();
    const browser = await chromium.launch({
      executablePath: executablePath!,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    try {
      const context = await browser.newContext();
      // Prime Content's real localStorage keys with the image's actual dump.
      await context.addInitScript(
        ({ checksum, dump }) => {
          if (!localStorage.getItem('bundle-test-primed')) {
            localStorage.setItem('content_checksum_docs', checksum);
            localStorage.setItem('content_collection_docs', dump);
            localStorage.setItem('bundle-test-primed', 'yes');
          }
        },
        { checksum: manifest.checksums.docs, dump: imageDump }
      );
      const page = await context.newPage();
      const dumpRequests: string[] = [];
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('request', (request) => {
        if (request.url().includes('/__nuxt_content/docs/sql_dump.txt'))
          dumpRequests.push(request.url());
      });
      await page.goto(url);
      await hydrated(page);
      expect(await page.locator('#first-query').textContent()).toBe(
        'BundleOne'
      );
      expect(await page.locator('[data-nested-badge]').count()).toBe(1);
      expect(await page.locator('[data-consumer-badge]').count()).toBe(1);
      expect(dumpRequests).toHaveLength(1);
      expect(new URL(dumpRequests[0]!).searchParams.get('v')).toBe(
        first.checksums.docs
      );
      expect(
        await page.evaluate(() => localStorage.getItem('content_checksum_docs'))
      ).toBe(first.checksums.docs);
      const second = await parse('BundleTwo');
      const next = await publish(second);
      await expect
        .poll(
          async () =>
            (await (await fetch(url + '/__duxt/content-bundle')).json()).active
        )
        .toMatchObject({ id: next.bundleId });
      await page.getByRole('button', { name: 'Query again' }).click();
      await expect
        .poll(() => page.locator('#again').textContent())
        .toBe('BundleOne');
      expect(new URL(page.url()).pathname).toBe('/after-switch');
      expect(dumpRequests).toHaveLength(1);
      await page.reload();
      await hydrated(page);
      expect(await page.locator('#first-query').textContent()).toBe(
        'BundleTwo'
      );
      expect(dumpRequests).toHaveLength(2);
      expect(new URL(dumpRequests[1]!).searchParams.get('v')).toBe(
        second.checksums.docs
      );
      expect(
        await page.evaluate(() => localStorage.getItem('content_checksum_docs'))
      ).toBe(second.checksums.docs);
      expect(
        await page.evaluate(() =>
          localStorage.getItem('content_collection_docs')
        )
      ).toBe(second.dumps.docs);
      expect(pageErrors).toEqual([]);
      await context.close();
    } finally {
      await browser.close();
    }
    for (const component of ['absent-badge', 'ui-unused-panel']) {
      const invalid = await parse(component, component);
      expect(() =>
        assertContentCompatibility(compat, invalid.usedComponents, artifact)
      ).toThrow(/component/i);
      const rejected = await publish(invalid);
      await expect
        .poll(
          async () =>
            (await (await fetch(url + '/__duxt/content-bundle')).json())
              .lastRejection
        )
        .toMatchObject({
          id: rejected.bundleId,
          reason: expect.stringMatching(/component/i)
        });
      expect(await (await fetch(url)).text()).toContain('data-layer-badge');
    }
  } catch (error) {
    throw new Error(String(error) + '\n' + output, { cause: error });
  } finally {
    server?.kill('SIGTERM');
    if (server && server.exitCode === null) await once(server, 'exit');
    rmSync(root, { recursive: true, force: true });
  }
}, 180000);
