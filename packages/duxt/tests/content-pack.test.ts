import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';
import { readContentManifest } from '../build/content/content-compatibility';
const layer = fileURLToPath(new URL('..', import.meta.url));

function git(root: string, ...args: string[]): string {
  const result = spawnSync(
    'git',
    [
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'user.name=History Author',
      '-c',
      'user.email=history@example.com',
      ...args
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z',
        GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z'
      }
    }
  );
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim();
}

it('packs a real consumer without a Nuxt bundle, preserving Content dumps and redirects', () => {
  const root = mkdtempSync(join(layer, '.content-pack-test-'));
  try {
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    writeFileSync(
      join(root, 'nuxt.config.ts'),
      `import { appendFileSync, existsSync, readFileSync } from 'node:fs';
export default defineNuxtConfig({
  extends: [${JSON.stringify(layer)}],
  site: { url: 'https://example.com' },
  nitro: { prerender: { routes: [], crawlLinks: false } },
  hooks: {
    'duxt:search:records': (records) => {
      const pointer = ${JSON.stringify(join(root, 'bundles/current'))};
      appendFileSync(${JSON.stringify(join(root, 'search-sync.jsonl'))}, JSON.stringify({
        published: existsSync(pointer) ? readFileSync(pointer, 'utf8').trim() : null,
        records
      }) + '\\n');
      if (existsSync(${JSON.stringify(join(root, 'fail-sync'))})) throw new Error('fixture provider unavailable');
    }
  }
})`
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
    const synchronized = readFileSync(join(root, 'search-sync.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(synchronized).toHaveLength(1);
    expect(synchronized[0].published).toBe(id);
    expect(synchronized[0].records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: '/introduction',
          title: 'Introduction',
          content: expect.stringContaining('Hello bundle.')
        })
      ])
    );
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
      timeout: 300000
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
    const beforeSync = readFileSync(join(root, 'search-sync.jsonl'), 'utf8');
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
      expect(readFileSync(join(root, 'search-sync.jsonl'), 'utf8')).toBe(
        beforeSync
      );
    }
    const blocked = join(root, 'blocked-publication');
    writeFileSync(blocked, 'A file cannot be a publication directory.');
    const publicationFailure = spawnSync(
      process.execPath,
      [join(layer, 'bin/duxt.mjs'), 'content', 'pack', '--publish', blocked],
      { cwd: root, encoding: 'utf8', timeout: 30000 }
    );
    expect(
      publicationFailure.status,
      publicationFailure.stdout + publicationFailure.stderr
    ).toBe(1);
    expect(publicationFailure.stderr).toContain('EEXIST');
    expect(readFileSync(join(root, 'search-sync.jsonl'), 'utf8')).toBe(
      beforeSync
    );
    writeFileSync(join(root, 'fail-sync'), 'fail');
    writeFileSync(
      join(root, 'docs/1.introduction.md'),
      readFileSync(join(root, 'docs/1.introduction.md'), 'utf8') +
        '\nPublished despite a failed search sync.\n'
    );
    const retryArgs = [
      join(layer, 'bin/duxt.mjs'),
      'content',
      'pack',
      '--publish',
      published
    ];
    const syncFailure = spawnSync(process.execPath, retryArgs, {
      cwd: root,
      encoding: 'utf8',
      timeout: 30000
    });
    expect(syncFailure.status, syncFailure.stdout + syncFailure.stderr).toBe(1);
    expect(syncFailure.stderr).toContain('duxt:search:records sync failed');
    expect(syncFailure.stderr).toContain('fixture provider unavailable');
    const publishedAfterFailure = readFileSync(
      join(published, 'current'),
      'utf8'
    ).trim();
    expect(publishedAfterFailure).not.toBe(id);
    expect(
      existsSync(join(published, publishedAfterFailure, 'bundle.json'))
    ).toBe(true);
    rmSync(join(root, 'fail-sync'));
    const retried = spawnSync(process.execPath, retryArgs, {
      cwd: root,
      encoding: 'utf8',
      timeout: 30000
    });
    expect(retried.status, retried.stdout + retried.stderr).toBe(0);
    expect(readFileSync(join(published, 'current'), 'utf8').trim()).toBe(
      publishedAfterFailure
    );
    const lastSync = JSON.parse(
      readFileSync(join(root, 'search-sync.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .at(-1)!
    );
    expect(lastSync.published).toBe(publishedAfterFailure);
    expect(lastSync.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining(
            'Published despite a failed search sync.'
          )
        })
      ])
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 600000);

it('refuses an empty documentation collection before publishing a bundle', () => {
  const root = mkdtempSync(join(layer, '.content-pack-test-'));
  try {
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    writeFileSync(
      join(root, 'nuxt.config.ts'),
      `import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export default defineNuxtConfig({
  extends: [fileURLToPath(new URL('../', import.meta.url))],
  hooks: {
    'duxt:search:records': () => writeFileSync(new URL('./unexpected-sync', import.meta.url), 'called')
  }
})`
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
    expect(existsSync(join(root, 'unexpected-sync'))).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 40000);

it('requires complete source history even when every parsed page was cached', () => {
  const root = mkdtempSync(join(layer, '.content-pack-test-'));
  try {
    git(root, 'init', '--quiet');
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    writeFileSync(
      join(root, 'nuxt.config.ts'),
      `import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export default defineNuxtConfig({
  extends: [fileURLToPath(new URL('../', import.meta.url))],
  hooks: {
    'content:file:afterParse': () => appendFileSync(new URL('./parsed-events', import.meta.url), 'parsed\\n')
  }
})`
    );
    writeFileSync(
      join(root, 'app.config.ts'),
      `export default defineAppConfig({ duxt: { locales: ['en-GB'], sources: [{ path: 'docs' }] } })`
    );
    writeFileSync(
      join(root, 'docs/index.md'),
      '---\ntitle: History\n---\nFull history.\n'
    );
    git(root, 'add', '.');
    git(root, 'commit', '--quiet', '-m', 'docs: initial fixture');
    git(
      root,
      'commit',
      '--quiet',
      '--allow-empty',
      '-m',
      'chore: second fixture commit'
    );
    const publish = join(root, 'bundles');
    const pack = (env = process.env) =>
      spawnSync(
        process.execPath,
        [join(layer, 'bin/duxt.mjs'), 'content', 'pack', '--publish', publish],
        { cwd: root, env, encoding: 'utf8', timeout: 30000 }
      );
    writeFileSync(
      join(root, '.git/shallow'),
      `${git(root, 'rev-parse', 'HEAD')}\n`
    );
    const unavailable = pack();
    expect(unavailable.status, unavailable.stdout + unavailable.stderr).toBe(1);
    expect(existsSync(join(publish, 'current'))).toBe(false);
    rmSync(join(root, '.git/shallow'));
    const first = pack();
    expect(first.status, first.stdout + first.stderr).toBe(0);
    const id = readFileSync(join(publish, 'current'), 'utf8');
    const parsedBefore = readFileSync(join(root, 'parsed-events'), 'utf8');
    const manifest = JSON.parse(
      readFileSync(join(publish, id.trim(), 'bundle.json'), 'utf8')
    );
    const dump = JSON.parse(
      gunzipSync(
        Buffer.from(
          readFileSync(join(publish, id.trim(), 'dumps/docs.txt'), 'utf8'),
          'base64'
        )
      ).toString()
    ) as string[];
    const database = new DatabaseSync(':memory:');
    try {
      database.exec(dump.join('\n'));
      const row = database
        .prepare(
          `SELECT lastUpdated, contributors FROM "${manifest.compat.tables.docs}"`
        )
        .get() as { lastUpdated: string; contributors: string };
      // Git spells UTC as `Z` or `+00:00` depending on its version.
      expect(Date.parse(row.lastUpdated)).toBe(
        Date.parse('2026-01-01T00:00:00Z')
      );
      expect(JSON.parse(row.contributors)).toMatchObject([
        { name: 'History Author', commits: 1 }
      ]);
    } finally {
      database.close();
    }
    const warm = pack();
    expect(warm.status, warm.stdout + warm.stderr).toBe(0);
    expect(readFileSync(join(root, 'parsed-events'), 'utf8')).toBe(
      parsedBefore
    );
    expect(readFileSync(join(publish, 'current'), 'utf8')).toBe(id);
    writeFileSync(
      join(root, '.git/shallow'),
      `${git(root, 'rev-parse', 'HEAD')}\n`
    );
    const shallow = pack();
    expect(shallow.status, shallow.stdout + shallow.stderr).toBe(1);
    expect(shallow.stderr).toContain('shallow');
    expect(readFileSync(join(root, 'parsed-events'), 'utf8')).toBe(
      parsedBefore
    );
    expect(readFileSync(join(publish, 'current'), 'utf8')).toBe(id);
    rmSync(join(root, '.git/shallow'));
    mkdirSync(join(root, 'no-git'));
    const missingGit = pack({ ...process.env, PATH: join(root, 'no-git') });
    expect(missingGit.status, missingGit.stdout + missingGit.stderr).toBe(1);
    expect(missingGit.stderr).toContain('git is unavailable');
    expect(readFileSync(join(publish, 'current'), 'utf8')).toBe(id);
    renameSync(join(root, '.git'), join(root, '.saved-git'));
    writeFileSync(
      join(root, '.git'),
      `gitdir: ${join(root, 'missing-repository')}\n`
    );
    const missingCheckout = pack();
    expect(
      missingCheckout.status,
      missingCheckout.stdout + missingCheckout.stderr
    ).toBe(1);
    expect(missingCheckout.stderr).toContain('no Git checkout');
    expect(readFileSync(join(publish, 'current'), 'utf8')).toBe(id);
    writeFileSync(
      join(root, 'app.config.ts'),
      `export default defineAppConfig({ duxt: { locales: ['en-GB'], sources: [{ path: 'docs', history: false }] } })`
    );
    const optedOut = pack({ ...process.env, PATH: join(root, 'no-git') });
    expect(optedOut.status, optedOut.stdout + optedOut.stderr).toBe(0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 90000);
