import { spawnSync } from 'node:child_process';
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
import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';

const wiki = fileURLToPath(new URL('..', import.meta.url));
const core = fileURLToPath(new URL('../../duxt', import.meta.url));

it('packs real parsed infobox facts and adds types and keys without changing the image schema', () => {
  const root = mkdtempSync(join(wiki, '.infobox-pack-test-'));
  const write = (path: string, value: string) =>
    writeFileSync(join(root, path), value);
  const pack = () => {
    const result = spawnSync(
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
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const id = readFileSync(join(root, 'bundles/current'), 'utf8').trim();
    const sql = JSON.parse(
      gunzipSync(
        Buffer.from(
          readFileSync(join(root, `bundles/${id}/dumps/docs.txt`), 'utf8'),
          'base64'
        )
      ).toString()
    ) as string[];
    const db = new DatabaseSync(':memory:');
    try {
      sql.forEach((statement) => db.exec(statement));
      const row = db
        .prepare('SELECT * FROM _content_docs WHERE path = ?')
        .get('/sprint')!;
      return {
        facts: row.infobox ? JSON.parse(String(row.infobox)) : null,
        schema: sql.filter((statement) => statement.includes('CREATE TABLE')),
        manifest: JSON.parse(
          readFileSync(join(root, `bundles/${id}/bundle.json`), 'utf8')
        )
      };
    } finally {
      db.close();
    }
  };
  try {
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'docs'));
    write('package.json', '{"type":"module"}');
    write(
      'nuxt.config.ts',
      `export default defineNuxtConfig({ extends: ${JSON.stringify([core, wiki])}, site: { url: 'https://example.com' }, nitro: { prerender: { routes: [], crawlLinks: false } } })`
    );
    write(
      'app.config.ts',
      "export default defineAppConfig({ duxt: { title: 'Infobox fixture', sources: [{ path: 'docs', history: false }] } })"
    );
    write(
      'docs/sprint.md',
      `---
title: Sprint
description: Grouped body facts.
---

::infobox{type="mode" title="Sprint"}
:::infobox-row{label="Zustand" key="status"}
**Available**
:::
:::infobox-group{title="Facts" collapsed}
::::infobox-row{label="Release"}
[Release notes](/sprint) and [[Sprint|label]]
::::
:::
::
`
    );
    const first = pack();
    expect(first.schema.length).toBeGreaterThan(0);
    expect(first.manifest.compatHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.facts).toEqual({
      type: 'mode',
      values: { status: 'Available', Release: 'Release notes and label' }
    });
    const original = readFileSync(join(root, 'docs/sprint.md'), 'utf8');
    write(
      'docs/sprint.md',
      original
        .replace('type="mode"', 'type="new-type"')
        .replace(
          ':::infobox-group',
          ':::infobox-row{label="New field" key="new-key"}\nContent only\n:::\n:::infobox-group'
        )
    );
    const next = pack();
    expect(next.facts).toEqual({
      type: 'new-type',
      values: {
        status: 'Available',
        Release: 'Release notes and label',
        'new-key': 'Content only'
      }
    });
    expect(next.schema).toEqual(first.schema);
    expect(next.manifest.compatHash).toBe(first.manifest.compatHash);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 300_000);
