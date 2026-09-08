import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { enableWriteAheadLog } from '../content-cache';

/**
 * The one thing this function must never do: create the database.
 *
 * `new DatabaseSync` on a missing path writes an empty 4 kB file. Content then
 * finds a database where it expected none, never creates its schema, and every
 * query afterwards dies with `no such table: _development_cache` — which is
 * exactly what CI hit, and what no local machine can reproduce once it has
 * built a single time.
 *
 * Asserted on the FILESYSTEM rather than on the return value: the bug was never
 * about what this reports, only about what it leaves behind.
 */
const roots: string[] = [];

function nuxt() {
  const rootDir = mkdtempSync(join(tmpdir(), 'duxt-wal-'));
  roots.push(rootDir);
  return { options: { rootDir, runtimeConfig: {} } } as never;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('enableWriteAheadLog', () => {
  it('creates no database where there is none', () => {
    const options = nuxt() as unknown as { options: { rootDir: string } };
    const file = join(options.options.rootDir, '.data/content/contents.sqlite');

    expect(enableWriteAheadLog(options as never)).toBe('skipped');
    expect(existsSync(file), 'the cache file was created').toBe(false);
  });

  it('leaves the directory alone too', () => {
    const options = nuxt() as unknown as { options: { rootDir: string } };

    enableWriteAheadLog(options as never);

    expect(existsSync(join(options.options.rootDir, '.data'))).toBe(false);
  });
});
