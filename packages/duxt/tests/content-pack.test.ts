import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { expect, it } from 'vitest';
import { readContentManifest } from '../build/content/content-compatibility';
const layer = fileURLToPath(new URL('..', import.meta.url));
it('packs a real consumer without a Nuxt bundle, preserving Content dumps and redirects', () => {
  const root = mkdtempSync(join(layer, '.content-pack-test-'));
  try {
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    writeFileSync(
      join(root, 'nuxt.config.ts'),
      `export default defineNuxtConfig({ extends: [${JSON.stringify(layer)}], site: { url: 'https://example.com' }, nitro: { prerender: { routes: [], crawlLinks: false } } })`
    );
    writeFileSync(
      join(root, 'app.config.ts'),
      `export default defineAppConfig({ duxt: { title: 'Pack fixture', locales: ['en-GB'], sources: [{ path: 'docs', history: false }] } })`
    );
    writeFileSync(
      join(root, 'docs/1.introduction.md'),
      '---\ntitle: Introduction\ndescription: The pack fixture.\nredirectFrom: [/old]\n---\n\nHello bundle.\n\n::callout\nContent.\n::\n'
    );
    mkdirSync(join(root, 'docs/_assets'));
    writeFileSync(
      join(root, 'docs/_assets/example.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'
    );
    writeFileSync(
      join(root, 'docs/1.introduction.md'),
      readFileSync(join(root, 'docs/1.introduction.md'), 'utf8') +
        '\n![Example](./_assets/example.svg)\n'
    );
    const result = spawnSync(
      process.execPath,
      [
        join(layer, 'bin/duxt.mjs'),
        'content',
        'pack',
        '--publish',
        join(root, 'bundles')
      ],
      { cwd: root, encoding: 'utf8', timeout: 120000 }
    );
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain('Compatibility:');
    expect(
      readdirSync(root).some((name) => name.startsWith('.nuxt-pack-'))
    ).toBe(false);
    expect(existsSync(join(root, '.output/server/index.mjs'))).toBe(false);
    const published = join(root, 'bundles');
    const id = readFileSync(join(published, 'current'), 'utf8').trim();
    const media = readdirSync(join(published, id, 'media'), {
      recursive: true
    }) as string[];
    expect(media.some((path) => path.endsWith('.svg'))).toBe(true);
    const bundle = JSON.parse(
      readFileSync(join(published, id, 'bundle.json'), 'utf8')
    );
    const contentModule = readFileSync(
      createRequire(import.meta.url).resolve('@nuxt/content'),
      'utf8'
    );
    const databaseVersion = /const databaseVersion = "([^"]+)"/.exec(
      contentModule
    )![1]!;
    expect(bundle.compat.databaseVersion).toBe(databaseVersion);
    const checksums = JSON.parse(
      readFileSync(join(published, id, 'checksums'), 'utf8')
    );
    for (const [collection, checksum] of Object.entries(checksums)) {
      expect(checksum).toMatch(new RegExp(`^${databaseVersion}--`));
      const dump = JSON.parse(
        gunzipSync(
          Buffer.from(
            readFileSync(
              join(published, id, `dumps/${collection}.txt`),
              'utf8'
            ),
            'base64'
          )
        ).toString()
      ) as string[];
      expect(dump[0]).toMatch(/CREATE TABLE.*_content_info.* -- structure$/);
      expect(dump[1]).toContain(`'checksum_${collection}'`);
      expect(dump[1]).toMatch(/false.* -- meta$/);
      expect(dump.at(-1)).toBe(
        `UPDATE _content_info SET ready = true WHERE id = 'checksum_${collection}'; -- meta`
      );
      expect(dump.some((line) => line.endsWith(' -- structure'))).toBe(true);
      expect(dump.some((line) => / -- [A-Za-z0-9_-]+$/.test(line))).toBe(true);
    }
    expect(bundle.usedComponents).toContain('Callout');
    expect(
      JSON.parse(readFileSync(join(published, id, 'redirects.json'), 'utf8'))
    ).toMatchObject({
      '/old': { redirect: { to: '/introduction', statusCode: 301 } }
    });
    const nuxt = join(layer, 'node_modules/nuxt/bin/nuxt.mjs');
    const built = spawnSync(process.execPath, [nuxt, 'build'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 120000
    });
    expect(built.status, built.stdout + built.stderr).toBe(0);
    const artifactPath = join(root, '.output/duxt-content-compat.json');
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
    expect(artifact.compatHash).toBe(bundle.compatHash);
    expect(artifact.availableComponents).toContain('Callout');
    const manifest = readContentManifest(
      readFileSync(join(root, '.nuxt/content/manifest.ts'), 'utf8')
    );
    expect(manifest.checksums).toEqual(checksums);
    expect(manifest.checksumsStructure).toEqual(
      bundle.compat.checksumsStructure
    );
    expect(manifest.tables).toEqual(bundle.compat.tables);
    const compressed = readFileSync(
      join(root, '.nuxt/content/database.compressed.mjs'),
      'utf8'
    );
    for (const collection of Object.keys(checksums)) {
      const line = compressed
        .split('\n')
        .find((line) => line.startsWith(`export const ${collection} = `))!;
      const dump = JSON.parse(line.slice(line.indexOf(' = ') + 3));
      expect(
        readFileSync(join(published, id, `dumps/${collection}.txt`), 'utf8')
      ).toBe(dump);
    }
    const accepted = spawnSync(
      process.execPath,
      [
        join(layer, 'bin/duxt.mjs'),
        'content',
        'pack',
        '--expect',
        artifactPath
      ],
      { cwd: root, encoding: 'utf8', timeout: 120000 }
    );
    expect(accepted.status, accepted.stdout + accepted.stderr).toBe(0);
    const active = join(root, '.output/duxt-content');
    const before = readFileSync(join(active, 'current'), 'utf8');
    for (const expected of [
      { ...artifact, compatHash: 'different' },
      { ...artifact, availableComponents: [] }
    ]) {
      writeFileSync(join(root, 'wrong.json'), JSON.stringify(expected));
      const rejected = spawnSync(
        process.execPath,
        [
          join(layer, 'bin/duxt.mjs'),
          'content',
          'pack',
          '--expect',
          join(root, 'wrong.json')
        ],
        { cwd: root, encoding: 'utf8', timeout: 30000 }
      );
      expect(rejected.status, rejected.stdout + rejected.stderr).toBe(1);
      expect(rejected.stderr).toMatch(
        /hash differs|unavailable MDC components/
      );
      expect(readFileSync(join(active, 'current'), 'utf8')).toBe(before);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 300000);

it('refuses an empty documentation collection before publishing a bundle', () => {
  const root = mkdtempSync(join(layer, '.content-pack-test-'));
  try {
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    writeFileSync(
      join(root, 'nuxt.config.ts'),
      `export default defineNuxtConfig({ extends: [${JSON.stringify(layer)}] })`
    );
    writeFileSync(
      join(root, 'app.config.ts'),
      `export default defineAppConfig({ duxt: { sources: [{ path: 'docs', history: false }] } })`
    );
    const result = spawnSync(
      process.execPath,
      [join(layer, 'bin/duxt.mjs'), 'content', 'pack'],
      { cwd: root, encoding: 'utf8', timeout: 30000 }
    );
    expect(result.status, result.stdout + result.stderr).toBe(1);
    expect(result.stderr).toContain('did not validate');
    expect(existsSync(join(root, '.output/duxt-content/current'))).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 40000);
