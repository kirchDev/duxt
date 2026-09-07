import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Nuxt } from '@nuxt/schema';

/**
 * Every parsed page, out of Content's own cache.
 *
 * The one place the build can see what Content actually produced. NOT the
 * `content:file:afterParse` hook, which was the obvious choice and is the wrong
 * one: Content skips the parse for every file whose checksum is unchanged, so
 * on the second build that hook fires for nothing and a validator built on it
 * reports an empty site. The cache holds the parsed document either way, remote
 * sources included — Content downloads a repository into `.data/content/` and
 * nothing else on disk describes what came back.
 *
 * Returns undefined rather than an empty list when there is no cache to read.
 * A `nuxt prepare` run parses nothing, and "no pages" there is not a finding.
 */
export interface CachedPage {
  collection: string;
  path: string;
  file: string;
  content: Record<string, unknown>;
}

/**
 * Where Content keeps its parse cache.
 *
 * Read from the runtime config where Content has already put it there, and
 * from Content's own default where it has not — which is the case for anything
 * running before Content's setup, `enableWriteAheadLog` included.
 */
function cacheFile(nuxt: Nuxt): string {
  const configured = (
    nuxt.options.runtimeConfig as {
      content?: { localDatabase?: { filename?: string } };
    }
  ).content?.localDatabase?.filename;

  return configured && existsSync(configured)
    ? configured
    : join(nuxt.options.rootDir, '.data/content/contents.sqlite');
}

export function readContentCache(
  nuxt: Nuxt,
  collections: Iterable<string>
): CachedPage[] | undefined {
  const file = cacheFile(nuxt);

  if (!existsSync(file)) return undefined;

  const names = new Set(collections);
  const pages: CachedPage[] = [];

  /**
   * WAIT for Content rather than failing next to it.
   *
   * SQLite's default journal mode locks the whole FILE while a writer holds it,
   * so a reader gets SQLITE_BUSY immediately — `readOnly` does not help, it is
   * the writer that excludes us. Content writes its parse cache from a
   * `Promise.all` over the collections, and the build's own hooks read that
   * cache; with a handful of files the write is over before anyone reads, and
   * at six hundred it is not. The result was `database is locked` from
   * whichever module read first, on a site whose only sin was having enough
   * pages.
   *
   * A busy timeout turns the race into a wait: the reader retries internally
   * until the writer commits. Fifteen seconds is far longer than a parse pass
   * needs and still fails loudly if something genuinely holds the file — a
   * stray dev server, say.
   */
  const database = new DatabaseSync(file, {
    readOnly: true,
    timeout: 15_000
  });

  try {
    const rows = database
      .prepare('SELECT id, value FROM _development_cache')
      .all() as { id: string; value: string }[];

    for (const row of rows) {
      const collection = row.id.split('/')[0] ?? '';
      // The cache carries a version marker and, after a config change, rows of
      // collections that no longer exist.
      if (!names.has(collection)) continue;

      let content: Record<string, unknown>;
      try {
        content = JSON.parse(row.value) as Record<string, unknown>;
      } catch {
        continue;
      }

      const path = typeof content.path === 'string' ? content.path : undefined;
      if (!path) continue;

      pages.push({
        collection,
        path,
        file: typeof content.id === 'string' ? content.id : row.id,
        content
      });
    }
  } finally {
    database.close();
  }

  return pages;
}

/**
 * Put Content's cache database into WAL mode, before Content opens it.
 *
 * The failure this removes: a `nuxt build` the kernel or a Ctrl-C left behind
 * keeps `contents.sqlite` open, and every following build then fails with
 * `database is locked` — a message naming neither the process nor the file.
 * The busy timeout above covers the layer's own reader; Content's cache WRITER
 * has no such patience, and a build cannot ask it for any.
 *
 * SQLite's default rollback journal locks the whole FILE while a writer holds
 * it, so any reader is excluded outright. Write-ahead logging lets readers and
 * one writer coexist, which is the actual shape of a build: Content writing the
 * parse cache while this layer's modules read it. Measured on this repo's own
 * site while translating — 237 lock errors went to zero.
 *
 * The mode lives in the FILE HEADER, not in a connection, so setting it once
 * holds for every process that opens the file afterwards — Content's included,
 * which is why this can be done from a module and does not need a patch.
 *
 * Creates the file when it is not there yet, so a first build gets WAL too.
 * Safe: Content opens the path either way and probes for its cache table with
 * a `SELECT` in a try/catch, so an empty database is the same to it as no file.
 *
 * Best-effort throughout. A database that cannot be opened, a filesystem that
 * does not support WAL (a network mount is the usual one) and a read-only
 * checkout each leave the build exactly as it was before this ran.
 */
export function enableWriteAheadLog(nuxt: Nuxt): 'wal' | 'skipped' {
  const file = cacheFile(nuxt);

  try {
    mkdirSync(dirname(file), { recursive: true });

    const database = new DatabaseSync(file, { timeout: 15_000 });

    try {
      const [row] = database.prepare('PRAGMA journal_mode = WAL').all() as {
        journal_mode?: string;
      }[];

      return row?.journal_mode?.toLowerCase() === 'wal' ? 'wal' : 'skipped';
    } finally {
      database.close();
    }
  } catch {
    // Nothing here is worth failing a build over: the busy timeout on the
    // reader is what this improves upon, not what it replaces.
    return 'skipped';
  }
}
