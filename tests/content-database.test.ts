import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * THE ONE RULE THAT KEEPS THE LAYER PORTABLE ACROSS CONTENT'S ADAPTERS.
 *
 * Content v3 runs on five database adapters — `sqlite`, `d1`, `postgresql`,
 * `libsql` and `pglite` — and duxt claims to pass all of them through
 * untouched. That claim is only true for as long as nothing in the layer
 * reaches past `queryCollection()` for a row at runtime. The moment a server
 * route opens `contents.sqlite` itself, the layer stops working on D1 (a
 * Worker has no filesystem), on PostgreSQL and on a remote libsql — and it
 * fails there rather than here, in someone else's deploy.
 *
 * `content-cache.ts` already reads that file with `node:sqlite`, and it is
 * allowed to: it runs inside the BUILD, where the file exists by construction.
 * The distinction this file defends is therefore not "no SQLite anywhere" but
 * "no SQLite on a request path" — so the allowlist below is the whole point,
 * not an escape hatch. Adding a file to it is a deliberate statement that the
 * file never runs on a deployed server.
 *
 * Written up for consumers in `docs/2.concepts/11.databases.md`.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * A database driver, by the name a file would import it under.
 *
 * `db0` is in the list although duxt never uses it directly: it is Content's
 * own connector package, and a layer importing it is reaching around
 * `queryCollection()` by a longer route rather than a shorter one.
 */
const DRIVERS = [
  'node:sqlite',
  'better-sqlite3',
  '@libsql/client',
  '@electric-sql/pglite',
  'pg',
  'db0'
];

/**
 * The files that may open a database directly, and why each one is allowed.
 *
 * Every entry has to be code that runs during a build or from the command
 * line. Nothing under `server/` or `app/` can ever belong here — those are
 * request paths, and the test below refuses them outright rather than
 * consulting this list.
 */
const BUILD_TIME_ONLY: Record<string, string> = {
  'content-cache.ts':
    "Reads Content's parse cache during the build, and sets WAL on it. Never imported by a server route.",
  'scripts/nuxt-process-guard.ts':
    'A build-time lock over `.data/nuxt-process/ownership.sqlite`. Not published — it is not in the `files` allowlist.'
};

/** Directories with no source of ours in them. */
const SKIP = new Set([
  'node_modules',
  '.git',
  '.data',
  '.nuxt',
  '.output',
  'dist',
  'docs',
  'public'
]);

function sourceFiles(from: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(from)) {
    if (SKIP.has(entry)) continue;

    const path = join(from, entry);

    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
      continue;
    }

    if (/\.(ts|mts|mjs|js|vue)$/.test(entry)) found.push(path);
  }

  return found;
}

/**
 * Every module specifier a file imports.
 *
 * A regex rather than a parser, deliberately: the question is only ever "does
 * this string appear in an import position", and a `.vue` file would need a
 * second parser anyway. It reads static imports, dynamic `import()` and
 * `require()`, which is every form that reaches a driver.
 */
function importsOf(source: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /(?:^|[\s;}])(?:import|export)[\s\S]{0,200}?from\s*['"]([^'"]+)['"]/g,
    /(?:^|[\s;}])import\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) specifiers.push(match[1]);
    }
  }

  return specifiers;
}

/** A driver import, or undefined where the specifier is something else. */
function driverIn(specifiers: string[]): string | undefined {
  return DRIVERS.find((driver) =>
    specifiers.some(
      (specifier) => specifier === driver || specifier.startsWith(`${driver}/`)
    )
  );
}

const files = [
  ...sourceFiles(join(root, 'app')),
  ...sourceFiles(join(root, 'server')),
  ...sourceFiles(join(root, 'modules')),
  ...sourceFiles(join(root, 'scripts')),
  ...sourceFiles(join(root, 'bin')),
  ...readdirSync(root)
    .filter((entry) => /\.(ts|mts|mjs)$/.test(entry))
    .map((entry) => join(root, entry))
].map((path) => ({
  path: relative(root, path).replaceAll('\\', '/'),
  source: readFileSync(path, 'utf8')
}));

describe('the content database at runtime', () => {
  it('finds the layer sources it is supposed to be reading', () => {
    // A broken walk would make every assertion below pass over nothing, which
    // is the one failure mode an allowlist test cannot report on its own.
    expect(files.length).toBeGreaterThan(100);
    expect(files.map((file) => file.path)).toContain('content-cache.ts');
    expect(files.map((file) => file.path)).toContain(
      'server/middleware/raw-markdown.ts'
    );
  });

  it('opens no database driver on a request path', () => {
    const offenders = files
      .filter(
        (file) =>
          file.path.startsWith('server/') || file.path.startsWith('app/')
      )
      .map((file) => ({
        path: file.path,
        driver: driverIn(importsOf(file.source))
      }))
      .filter((file) => file.driver)
      .map((file) => `${file.path} imports ${file.driver}`);

    // Everything under server/ and app/ answers requests. A driver there is a
    // filesystem assumption, and it breaks D1, PostgreSQL and remote libsql.
    expect(offenders).toEqual([]);
  });

  it('reads the content cache file only from build-time code', () => {
    const offenders = files
      .filter(
        (file) =>
          file.path.startsWith('server/') || file.path.startsWith('app/')
      )
      .filter((file) => file.source.includes('contents.sqlite'))
      .map((file) => file.path);

    expect(offenders).toEqual([]);
  });

  it('keeps the list of files that open a database closed', () => {
    const opening = files
      .filter((file) => driverIn(importsOf(file.source)))
      .map((file) => file.path)
      .sort();

    // A new name here is not automatically wrong — it is unreviewed. Add it to
    // BUILD_TIME_ONLY with the sentence that says when it runs, or move the
    // read behind `queryCollection()`.
    expect(opening).toEqual(Object.keys(BUILD_TIME_ONLY).sort());
  });

  it('states, for every such file, why it never runs on a server', () => {
    for (const [path, reason] of Object.entries(BUILD_TIME_ONLY)) {
      expect(
        files.map((file) => file.path),
        `${path} still exists`
      ).toContain(path);
      expect(reason.length, `${path} carries a real reason`).toBeGreaterThan(
        40
      );
    }
  });
});
