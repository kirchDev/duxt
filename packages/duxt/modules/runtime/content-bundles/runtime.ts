import { DatabaseSync } from 'node:sqlite';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { gunzipSync } from 'node:zlib';
import {
  assertContentCompatibility,
  canonicalJson,
  contentHash
} from '../../../build/content/content-bundle';
import type {
  ContentBundleCompat,
  ContentCompatibilityArtifact
} from '../../../build/content/content-bundle';

interface Bundle {
  id: string;
  commit: string;
  checksums: Record<string, string>;
  dumps: Record<string, string>;
  statements: Record<string, string[]>;
}
interface Options {
  directory: string;
  filename: string;
  compat: Pick<
    ContentBundleCompat,
    'databaseVersion' | 'checksumsStructure' | 'tables'
  >;
  artifact: ContentCompatibilityArtifact;
  checksums: Record<string, string>;
  imageDumps: Record<string, string>;
  log?: (line: string) => void;
}
const identifier = /^[a-f0-9]{64}$/;
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
const decode = (dump: string): string[] => {
  const rows: unknown = JSON.parse(
    gunzipSync(Buffer.from(dump, 'base64')).toString('utf8')
  );
  if (
    !Array.isArray(rows) ||
    !rows.length ||
    !rows.every((row) => typeof row === 'string')
  )
    throw new Error('Invalid Content SQL dump.');
  return rows;
};
const structure = (rows: string[]) =>
  rows.filter((row) => row.endsWith(' -- structure'));
const statement = (row: string) => {
  const match = / -- [A-Za-z0-9_-]+$/.exec(row);
  if (!match) throw new Error('Unknown Content SQL dump suffix.');
  return row.slice(0, match.index);
};

/** Node/SQLite only. The module never registers this code for another adapter or platform. */
export function createContentBundleRuntime(options: Options) {
  let active: Bundle | undefined;
  let lastRejection: {
    id: string | null;
    commit: string | null;
    reason: string;
  } | null = null;
  const rejected = new Set<string>();
  const log = options.log ?? console.info;
  const collections = Object.keys(options.compat.checksumsStructure).sort();
  const info = quote(options.compat.tables.info!);
  const record = (id: string | null, commit: string | null, reason: string) =>
    log('[duxt] content bundle ' + JSON.stringify({ id, commit, reason }));

  async function readBundle(
    id: string,
    provenance: (commit: string) => void
  ): Promise<Bundle> {
    if (!identifier.test(id)) throw new Error('Invalid bundle id.');
    const root = join(options.directory, id);
    if (!(await lstat(root)).isDirectory())
      throw new Error('Bundle is not a directory.');
    const sums = await readFile(join(root, 'SHA256SUMS'), 'utf8');
    if (contentHash(sums) !== id)
      throw new Error('Bundle id does not match SHA256SUMS.');
    const payload = new Map<string, Buffer>();
    for (const line of sums.trimEnd().split('\n')) {
      const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
      if (!match) throw new Error('Invalid SHA256SUMS entry.');
      const hash = match[1]!;
      const path = match[2]!;
      if (
        path === 'SHA256SUMS' ||
        path.includes('\\') ||
        path.includes('\r') ||
        path.startsWith('/') ||
        posix.normalize(path) !== path ||
        path
          .split('/')
          .some((part) => !part || part === '.' || part === '..') ||
        payload.has(path)
      )
        throw new Error('Invalid bundle file path.');
      // Every component is checked: a symlink in a parent directory escapes a file-only check.
      let at = root;
      for (const part of path.split('/')) {
        at = join(at, part);
        if ((await lstat(at)).isSymbolicLink())
          throw new Error('Bundle symlinks are not supported.');
      }
      if (!(await lstat(at)).isFile())
        throw new Error('Bundle payload is not a regular file.');
      const bytes = await readFile(at);
      if (contentHash(bytes) !== hash)
        throw new Error('Bundle file hash differs: ' + path);
      payload.set(path, bytes);
    }
    async function walk(path: string): Promise<string[]> {
      const found: string[] = [];
      for (const entry of await readdir(join(root, path), {
        withFileTypes: true
      })) {
        const name = path ? path + '/' + entry.name : entry.name;
        if (entry.isDirectory()) found.push(...(await walk(name)));
        else if (!entry.isFile())
          throw new Error('Bundle contains a non-regular file.');
        else found.push(name);
      }
      return found;
    }
    const paths = (await walk(''))
      .filter((path) => path !== 'SHA256SUMS')
      .sort();
    if (canonicalJson(paths) !== canonicalJson([...payload.keys()].sort()))
      throw new Error('SHA256SUMS does not list the complete payload.');
    const known = new Set([
      'bundle.json',
      'checksums',
      'redirects.json',
      ...collections.map((collection) => 'dumps/' + collection + '.txt')
    ]);
    if (paths.some((path) => !known.has(path) && !path.startsWith('media/')))
      throw new Error('Unknown bundle payload file.');
    const text = (path: string) => {
      const bytes = payload.get(path);
      if (!bytes) throw new Error('Missing bundle file: ' + path);
      return bytes.toString('utf8');
    };
    const manifest = JSON.parse(text('bundle.json'));
    provenance(
      typeof manifest.provenance?.commit === 'string'
        ? manifest.provenance.commit
        : 'unknown'
    );
    if (manifest.format !== 1)
      throw new Error('Unknown content bundle format.');
    if (
      !Array.isArray(manifest.usedComponents) ||
      !manifest.usedComponents.every(
        (name: unknown) => typeof name === 'string'
      )
    )
      throw new Error('Invalid usedComponents.');
    assertContentCompatibility(
      manifest.compat,
      manifest.usedComponents,
      options.artifact
    );
    if (manifest.compatHash !== options.artifact.compatHash)
      throw new Error('Bundle compatibility hash differs.');
    const checksums = JSON.parse(text('checksums')) as Record<string, string>;
    if (
      canonicalJson(Object.keys(checksums).sort()) !==
      canonicalJson(collections)
    )
      throw new Error('Bundle collections differ.');
    // These payloads share the format even though serving media/redirects is outside this importer.
    JSON.parse(text('redirects.json'));
    const dumps: Record<string, string> = {};
    const statements: Record<string, string[]> = {};
    for (const collection of collections) {
      if (
        typeof checksums[collection] !== 'string' ||
        !checksums[collection]!.startsWith(
          options.compat.databaseVersion + '--'
        )
      )
        throw new Error('Invalid Content checksum.');
      dumps[collection] = text('dumps/' + collection + '.txt');
      const rows = decode(dumps[collection]!);
      if (
        rows.at(-1) !==
        `UPDATE _content_info SET ready = true WHERE id = 'checksum_${collection}'; -- meta`
      )
        throw new Error('Content dump does not end ready.');
      if (
        canonicalJson(structure(rows)) !==
        canonicalJson(structure(decode(options.imageDumps[collection]!)))
      )
        throw new Error('Content dump structure differs: ' + collection);
      statements[collection] = rows
        .filter((row) => !row.endsWith(' -- structure'))
        .map(statement);
      const table = options.compat.tables[collection]!;
      for (const sql of statements[collection]!) {
        if (
          !sql.startsWith('INSERT INTO ' + table + ' ') &&
          !sql.startsWith('INSERT INTO _content_info ') &&
          sql !==
            `UPDATE _content_info SET ready = true WHERE id = 'checksum_${collection}';`
        )
          throw new Error('Unexpected Content dump statement.');
      }
    }
    return {
      id,
      commit:
        typeof manifest.provenance?.commit === 'string'
          ? manifest.provenance.commit
          : 'unknown',
      checksums,
      dumps,
      statements
    };
  }

  async function activateCurrent() {
    let id: string | null = null;
    let candidate: Bundle | undefined;
    let commit: string | null = null;
    let db: DatabaseSync | undefined;
    try {
      const pointer = join(options.directory, 'current');
      if (!(await lstat(pointer)).isFile())
        throw new Error('Bundle current pointer must be a regular file.');
      const current = await readFile(pointer, 'utf8');
      id = current.trim();
      if (!/^[a-f0-9]{64}\n$/.test(current))
        throw new Error('Invalid bundle current pointer.');
      if (rejected.has(id) || active?.id === id) return;
      candidate = await readBundle(id, (value) => {
        commit = value;
      });
      mkdirSync(dirname(options.filename), { recursive: true });
      db = new DatabaseSync(options.filename);
      db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
      // A fresh deployment has no Content tables. Only the image's trusted structure is used.
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const collection of collections)
          for (const row of structure(
            decode(options.imageDumps[collection]!)
          )) {
            if (!row.startsWith('DROP ')) db.prepare(statement(row)).run();
          }
        db.exec(
          'CREATE TABLE IF NOT EXISTS _duxt_content_bundle (id INTEGER PRIMARY KEY CHECK (id = 1), bundle TEXT NOT NULL)'
        );
        const previous = db
          .prepare('SELECT bundle FROM _duxt_content_bundle WHERE id = 1')
          .get();
        const matches = collections.every((collection) => {
          const row = db!
            .prepare(
              `SELECT version, structureVersion, ready FROM ${info} WHERE id = ?`
            )
            .get('checksum_' + collection);
          return Boolean(
            row &&
            row.version === candidate!.checksums[collection] &&
            row.structureVersion ===
              options.compat.checksumsStructure[collection] &&
            row.ready === 1
          );
        });
        const unchanged = previous?.bundle === id && matches;
        if (!unchanged) {
          for (const collection of collections) {
            db.prepare(
              'DELETE FROM ' + quote(options.compat.tables[collection]!)
            ).run();
            db.prepare(`DELETE FROM ${info} WHERE id = ?`).run(
              'checksum_' + collection
            );
            // prepare/run executes exactly one statement; dumps cannot commit our transaction.
            for (const sql of candidate.statements[collection]!)
              db.prepare(sql).run();
            const after = db
              .prepare(
                `SELECT version, structureVersion, ready FROM ${info} WHERE id = ?`
              )
              .get('checksum_' + collection);
            if (
              !after ||
              after.version !== candidate.checksums[collection] ||
              after.structureVersion !==
                options.compat.checksumsStructure[collection] ||
              after.ready !== 1
            )
              throw new Error(
                'Imported Content metadata differs: ' + collection
              );
          }
          db.prepare(
            'INSERT OR REPLACE INTO _duxt_content_bundle VALUES (1, ?)'
          ).run(id);
        }
        db.exec('COMMIT');
        Object.assign(options.checksums, candidate.checksums);
        active = candidate;
        record(
          id,
          candidate.commit,
          unchanged ? 'already-active' : 'activated'
        );
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      if (id) rejected.add(id);
      lastRejection = {
        id,
        commit: candidate?.commit ?? commit,
        reason: error instanceof Error ? error.message : String(error)
      };
      record(id, lastRejection.commit, lastRejection.reason);
    } finally {
      db?.close();
    }
  }
  return {
    activateCurrent,
    status: () => ({
      active: active ? { id: active.id, commit: active.commit } : null,
      compatHash: options.artifact.compatHash,
      lastRejection
    }),
    dump: (collection: string) => active?.dumps[collection]
  };
}
