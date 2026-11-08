import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';
import { resolveWikiTargets, wikiIncoming } from '../queries';
import { wikiPage } from '../metadata';

const wiki = fileURLToPath(new URL('..', import.meta.url));
const core = fileURLToPath(new URL('../../duxt', import.meta.url));

it('packs persisted wiki rows, reuses cached linkers, renames targets and leaves opt-out schemas untouched', () => {
  const root = mkdtempSync(join(wiki, '.wiki-pack-test-'));
  const write = (path: string, text: string) =>
    writeFileSync(join(root, path), text);
  const dump = () => {
    const id = readFileSync(join(root, 'bundles/current'), 'utf8').trim();
    return JSON.parse(
      gunzipSync(
        Buffer.from(
          readFileSync(join(root, `bundles/${id}/dumps/docs.txt`), 'utf8'),
          'base64'
        )
      ).toString()
    ) as string[];
  };
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
    return result.stdout + result.stderr;
  };
  const rows = () => {
    const db = new DatabaseSync(':memory:');
    try {
      for (const sql of dump()) db.exec(sql);
      return db
        .prepare('SELECT * FROM _content_docs ORDER BY path')
        .all()
        .map((row) =>
          wikiPage(
            {
              ...row,
              links: JSON.parse(String(row.links)),
              categories: JSON.parse(String(row.categories)),
              aliases: JSON.parse(String(row.aliases))
            },
            'docs'
          )!
        );
    } finally {
      db.close();
    }
  };
  const config = (enabled: boolean) =>
    write(
      'nuxt.config.ts',
      `import { appendFileSync } from 'node:fs';
export default defineNuxtConfig({ extends: ${JSON.stringify([core, ...(enabled ? [wiki] : [])])},
 site: { url: 'https://example.com' }, nitro: { prerender: { routes: [], crawlLinks: false } },
 hooks: { 'content:file:afterParse': (ctx) => appendFileSync(new URL('./parsed', import.meta.url), ctx.file.path + String.fromCharCode(10)) }
})`
    );
  try {
    mkdirSync(join(root, '.git'));
    mkdirSync(join(root, 'docs/category'), { recursive: true });
    write('package.json', '{"type":"module"}');
    config(true);
    write(
      'app.config.ts',
      "export default defineAppConfig({ duxt: { title: 'Wiki fixture', sources: [{ path: 'docs', history: false }] } })"
    );
    write(
      'docs/linker.md',
      '---\ntitle: Linker\ndescription: Cached link fixture.\ncategories: [Modes, Unpaged]\naliases: [Entry]\n---\n\n[[FAST#Part]] and [Target](/old).\n'
    );
    write(
      'docs/old.md',
      '---\ntitle: Élite_%\ndescription: Target fixture.\naliases: [Fast]\ncategories: [Modes]\n---\nTarget.\n'
    );
    write(
      'docs/category/modes.md',
      '---\ntitle: Modes\ndescription: Category fixture.\ncategories: [Catalog]\n---\nModes.\n'
    );
    write(
      'docs/category/catalog.md',
      '---\ntitle: Catalog\ndescription: Category fixture.\ncategories: [Modes]\n---\nCatalog.\n'
    );
    expect(pack()).toContain('category cycle');
    const first = rows();
    expect(first.find((row) => row.path === '/linker')).toMatchObject({
      links: [
        { target: 'FAST#Part', kind: 'wiki' },
        { target: '/old', kind: 'markdown' }
      ],
      categories: ['Modes', 'Unpaged'],
      aliases: ['Entry']
    });
    write('parsed', '');
    expect(pack()).toContain('category cycle');
    expect(readFileSync(join(root, 'parsed'), 'utf8')).toBe('');
    expect(rows()).toEqual(first);
    renameSync(join(root, 'docs/old.md'), join(root, 'docs/new.md'));
    write(
      'docs/new.md',
      '---\ntitle: Renamed\ndescription: Renamed target.\naliases: [Fast]\ncategories: [Modes]\n---\nTarget.\n'
    );
    write('parsed', '');
    pack();
    const parsed = readFileSync(join(root, 'parsed'), 'utf8');
    expect(parsed).toContain('new.md');
    expect(parsed).not.toContain('linker.md');
    const changed = rows();
    expect(
      resolveWikiTargets(changed, ['fast'])[0]!.pages.map((row) => row.path)
    ).toEqual(['/new']);
    expect(
      wikiIncoming(
        changed,
        changed.find((row) => row.path === '/new')!
      ).map((row) => row.path)
    ).toEqual(['/linker']);
    expect(changed.find((row) => row.path === '/linker')).toEqual(
      first.find((row) => row.path === '/linker')
    );
    config(false);
    pack();
    const schema = dump()
      .filter(
        (sql) => sql.includes('CREATE TABLE') && sql.includes('_content_docs')
      )
      .join('\n');
    expect(schema).not.toMatch(/\b(?:links|categories|aliases)\b/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 600_000);
