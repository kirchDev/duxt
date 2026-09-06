import { existsSync } from 'node:fs';
import { join } from 'node:path';
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

export function readContentCache(
  nuxt: Nuxt,
  collections: Iterable<string>
): CachedPage[] | undefined {
  const configured = (
    nuxt.options.runtimeConfig as {
      content?: { localDatabase?: { filename?: string } };
    }
  ).content?.localDatabase?.filename;

  const file =
    configured && existsSync(configured)
      ? configured
      : join(nuxt.options.rootDir, '.data/content/contents.sqlite');

  if (!existsSync(file)) return undefined;

  const names = new Set(collections);
  const pages: CachedPage[] = [];
  const database = new DatabaseSync(file, { readOnly: true });

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
