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
import { wikiBodyTokens } from '../wikilinks';
import { writeContentBundle } from '../../duxt/build/content/content-bundle';
import { createContentBundleRuntime } from '../../duxt/modules/runtime/content-bundles/runtime';

const wiki = fileURLToPath(new URL('..', import.meta.url));
const core = fileURLToPath(new URL('../../duxt', import.meta.url));

it('activates genuine Content body and links chunks without losing Wiki targets', async () => {
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
    // Parser-owned span evidence makes body the largest Wiki-page column.
    // A genuine data collection independently keeps the links-column path covered.
    writeFileSync(
      join(root, 'content.config.ts'),
      `import {defineContentConfig,defineCollection,z} from '@nuxt/content'; export default defineContentConfig({collections:{link_chunks:defineCollection({type:'data',source:{cwd:${JSON.stringify(root)},include:'link-chunks.json'},schema:z.object({links:z.array(z.object({target:z.string(),kind:z.literal('wiki')}))})})}})`
    );
    const expectedLinks = Array.from({ length: 4000 }, (_, index) => ({
      target: String.raw`Target${index}: Farmer's 🚀; C:\path`,
      kind: 'wiki'
    }));
    writeFileSync(
      join(root, 'link-chunks.json'),
      JSON.stringify({ links: expectedLinks })
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
    const wikiStatements = JSON.parse(
      gunzipSync(Buffer.from(dumps.docs!, 'base64')).toString()
    ) as string[];
    expect(
      wikiStatements.some((sql) =>
        sql.startsWith('UPDATE _content_docs SET body = CONCAT(body, ')
      )
    ).toBe(true);
    const statements = JSON.parse(
      gunzipSync(Buffer.from(dumps.link_chunks!, 'base64')).toString()
    ) as string[];
    expect(
      statements.some((sql) =>
        sql.startsWith('UPDATE _content_link_chunks SET links = CONCAT(links, ')
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
      sql.startsWith('UPDATE _content_link_chunks SET links = CONCAT(')
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
                  'UPDATE _content_link_chunks SET',
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
            link_chunks: gzipSync(JSON.stringify(tamper(statements))).toString(
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
      expect(runtime.dump('link_chunks'), name).toBe(dumps.link_chunks);
      expect(runtime.dump('docs'), name).toBe(dumps.docs);
      expect(runtime.media('/candidate.svg'), name).toBeUndefined();
    }
    const db = new DatabaseSync(filename);
    try {
      const row = db.prepare('SELECT links FROM _content_link_chunks').get()!;
      const links = JSON.parse(String(row.links));
      expect(links).toHaveLength(4000);
      expect(links).toEqual(expectedLinks);
      const wikiRow = db
        .prepare(
          "SELECT links, rawbody, body FROM _content_docs WHERE path = '/large'"
        )
        .get()!;
      expect(JSON.parse(String(wikiRow.links))).toEqual(expectedLinks);
      expect(
        wikiBodyTokens(JSON.parse(String(wikiRow.body))).map(
          (token) => token.target
        )
      ).toEqual(expectedLinks.map((link) => link.target));
      expect(wikiRow.rawbody).toBe(
        readFileSync(join(root, 'docs/large.md'), 'utf8')
      );

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
