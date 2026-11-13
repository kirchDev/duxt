import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, expect, it } from 'vitest';
import { readContentCacheAt } from '../build/content/content-cache';

/**
 * The parse cache keeps a row for every file Content ever parsed, including
 * files that were moved or deleted since. Content's collection tables are
 * rebuilt from the files that exist, so only rows they still hold are pages.
 */

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function cache(withTable: boolean) {
  const dir = mkdtempSync(join(tmpdir(), 'duxt-cache-'));
  dirs.push(dir);
  const file = join(dir, 'contents.sqlite');
  const db = new DatabaseSync(file);
  db.exec(
    'CREATE TABLE _development_cache (id TEXT PRIMARY KEY, value TEXT, checksum TEXT)'
  );
  const insert = db.prepare(
    'INSERT INTO _development_cache (id, value, checksum) VALUES (?, ?, ?)'
  );
  for (const [id, path] of [
    ['docs/1.guide.md', '/guide'],
    ['docs/2.moved.md', '/moved'],
    ['docs/3.kept.md', '/kept']
  ])
    insert.run(id, JSON.stringify({ id, path }), 'x');
  if (withTable) {
    db.exec('CREATE TABLE "_content_docs" (id TEXT PRIMARY KEY, path TEXT)');
    const live = db.prepare(
      'INSERT INTO "_content_docs" (id, path) VALUES (?, ?)'
    );
    live.run('docs/1.guide.md', '/guide');
    live.run('docs/3.kept.md', '/kept');
  }
  db.close();
  return file;
}

it('drops a cached page whose file the last parse no longer had', () => {
  expect(
    readContentCacheAt(cache(true), ['docs'])!.map((page) => page.path)
  ).toEqual(['/guide', '/kept']);
});

it('reads every row of a collection that has no table yet', () => {
  expect(
    readContentCacheAt(cache(false), ['docs'])!.map((page) => page.path)
  ).toEqual(['/guide', '/moved', '/kept']);
});
