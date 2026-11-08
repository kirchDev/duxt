import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';
import { writeContentBundle } from '../../duxt/build/content/content-bundle';
import { createContentBundleRuntime } from '../../duxt/modules/runtime/content-bundles/runtime';

const wiki = fileURLToPath(new URL('..', import.meta.url));
const core = fileURLToPath(new URL('../../duxt', import.meta.url));

it('activates real Content chunks when a page has a large links column', async () => {
  const root = mkdtempSync(join(wiki, '.wiki-chunk-test-'));
  try {
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    writeFileSync(
      join(root, 'nuxt.config.ts'),
      `export default defineNuxtConfig({ extends: ${JSON.stringify([core, wiki])}, site: { url: 'https://example.com' } })`
    );
    writeFileSync(
      join(root, 'app.config.ts'),
      "export default defineAppConfig({ duxt: { sources: [{ path: 'docs', history: false }] } })"
    );
    writeFileSync(
      join(root, 'docs/large.md'),
      '---\ntitle: Large link fixture\ndescription: Content splits this real JSON column.\n---\n' +
        Array.from(
          { length: 4000 },
          (_, index) => String.raw`[[Target${index}: Farmer's 🚀; C:\path]]`
        ).join(' ')
    );
    const packed = spawnSync(
      process.execPath,
      [
        join(core, 'bin/duxt.mjs'),
        'content',
        'pack',
        '--publish',
        join(root, 'bundles')
      ],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 120_000,
        maxBuffer: 16 * 1024 * 1024
      }
    );
    expect(packed.status, packed.stdout + packed.stderr).toBe(0);
    const directory = join(root, 'bundles');
    const id = readFileSync(join(directory, 'current'), 'utf8').trim();
    const payload = join(directory, id);
    const manifest = JSON.parse(
      readFileSync(join(payload, 'bundle.json'), 'utf8')
    );
    const dumps = Object.fromEntries(
      readdirSync(join(payload, 'dumps')).map((name) => [
        name.slice(0, -4),
        readFileSync(join(payload, 'dumps', name), 'utf8')
      ])
    );
    const statements = JSON.parse(
      gunzipSync(Buffer.from(dumps.docs!, 'base64')).toString()
    ) as string[];
    expect(
      statements.some((sql) =>
        sql.startsWith('UPDATE _content_docs SET links = CONCAT(links, ')
      )
    ).toBe(true);
    const checksums = JSON.parse(
      readFileSync(join(payload, 'checksums'), 'utf8')
    );
    const filename = join(root, 'runtime.sqlite');
    const runtimeChecksums = { ...checksums };
    const runtime = createContentBundleRuntime({
      directory,
      filename,
      artifact: {
        compatHash: manifest.compatHash,
        availableComponents: manifest.usedComponents
      },
      compat: manifest.compat,
      checksums: runtimeChecksums,
      imageDumps: dumps,
      log: () => {}
    });
    await runtime.activateCurrent();
    expect(runtime.status().lastRejection).toBeNull();
    expect(runtime.status().active?.id).toBe(id);
    const updates = statements.filter((sql) =>
      sql.startsWith('UPDATE _content_docs SET links = CONCAT(')
    );
    expect(updates.length).toBeGreaterThan(1);
    const invalid: [string, (rows: string[]) => string[]][] = [
      [
        'all chunks omitted',
        (rows) => rows.filter((row) => !updates.includes(row))
      ],
      [
        'terminal chunk omitted',
        (rows) => rows.filter((row) => row !== updates.at(-1))
      ],
      [
        'duplicate chunk',
        (rows) =>
          rows.flatMap((row) => (row === updates[0] ? [row, row] : [row]))
      ],
      [
        'reversed chunks',
        (rows) => {
          const reversed = [...updates].reverse();
          return rows.map((row) =>
            updates.includes(row) ? reversed.shift()! : row
          );
        }
      ],
      [
        'wrong row id',
        (rows) =>
          rows.map((row) =>
            row === updates[0]
              ? row.replace(
                  / WHERE id = '(?:[^']|'')*'/,
                  " WHERE id = 'missing-row'"
                )
              : row
          )
      ],
      [
        'wrong prior offset',
        (rows) =>
          rows.map((row) =>
            row === updates[0]
              ? row.replace(
                  / AND "__hash__" = '([^']+)-[0-9]+';/,
                  ' AND "__hash__" = \'$1-1\';'
                )
              : row
          )
      ],
      [
        'unknown column',
        (rows) =>
          rows.map((row) =>
            row === updates[0]
              ? row.replace(
                  'SET links = CONCAT(links,',
                  'SET missing_column = CONCAT(missing_column,'
                )
              : row
          )
      ],
      [
        'wrong table',
        (rows) =>
          rows.map((row) =>
            row === updates[0]
              ? row.replace(
                  'UPDATE _content_docs SET',
                  'UPDATE _content_info SET'
                )
              : row
          )
      ],
      [
        'identity column',
        (rows) =>
          rows.map((row) =>
            row === updates[0]
              ? row.replace('SET links = CONCAT(links,', 'SET id = CONCAT(id,')
              : row
          )
      ],
      [
        'uppercase identity column',
        (rows) =>
          rows.map((row) =>
            row === updates[0]
              ? row.replace('SET links = CONCAT(links,', 'SET ID = CONCAT(ID,')
              : row
          )
      ],
      [
        'uppercase hash column',
        (rows) =>
          rows.map((row) =>
            row === updates[0]
              ? row.replace(
                  'SET links = CONCAT(links,',
                  'SET __HASH__ = CONCAT(__HASH__,'
                )
              : row
          )
      ],
      [
        'wrong concat column',
        (rows) =>
          rows.map((row) =>
            row === updates[0]
              ? row.replace('CONCAT(links,', 'CONCAT(body,')
              : row
          )
      ],
      [
        'appended statement',
        (rows) =>
          rows.map((row) =>
            row === updates[0]
              ? row.replace('; -- ', '; DELETE FROM _content_info; -- ')
              : row
          )
      ]
    ];
    for (const [name, tamper] of invalid) {
      const bad = await writeContentBundle(
        {
          compat: manifest.compat,
          usedComponents: manifest.usedComponents,
          provenance: { commit: name },
          checksums,
          dumps: {
            ...dumps,
            docs: gzipSync(JSON.stringify(tamper(statements))).toString(
              'base64'
            )
          },
          redirects: JSON.parse(
            readFileSync(join(payload, 'redirects.json'), 'utf8')
          ),
          media: { 'candidate.svg': new TextEncoder().encode('<svg/>') }
        },
        directory
      );
      await runtime.activateCurrent();
      expect(runtime.status().lastRejection?.id, name).toBe(bad.bundleId);
      if (name.startsWith('uppercase'))
        expect(runtime.status().lastRejection?.reason).toBe(
          'Unexpected Content dump statement.'
        );
      if (name === 'unknown column')
        expect(runtime.status().lastRejection?.reason).toContain(
          'missing_column'
        );
      if (
        [
          'duplicate chunk',
          'reversed chunks',
          'wrong row id',
          'wrong prior offset'
        ].includes(name)
      )
        expect(runtime.status().lastRejection?.reason).toContain(
          'exactly one row'
        );
      expect(runtime.status().active?.id, name).toBe(id);
      expect(runtimeChecksums, name).toEqual(checksums);
      expect(runtime.dump('docs'), name).toBe(dumps.docs);
      expect(runtime.media('/candidate.svg'), name).toBeUndefined();
    }
    const db = new DatabaseSync(filename);
    try {
      const row = db
        .prepare("SELECT links FROM _content_docs WHERE path = '/large'")
        .get()!;
      const links = JSON.parse(String(row.links));
      expect(links).toHaveLength(4000);
      expect(links[0]).toEqual({
        target: String.raw`Target0: Farmer's 🚀; C:\path`,
        kind: 'wiki'
      });
      expect(links[3999]).toEqual({
        target: String.raw`Target3999: Farmer's 🚀; C:\path`,
        kind: 'wiki'
      });
    } finally {
      db.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 180_000);
