import { DatabaseSync } from 'node:sqlite';
import { lstat, readFile, readdir } from 'node:fs/promises';
import {
  mkdirSync,
  lstatSync,
  symlinkSync,
  renameSync,
  readlinkSync,
  unlinkSync,
  existsSync
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join, posix, resolve, extname } from 'node:path';
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

interface Media {
  bytes: Buffer;
  type: string;
  etag: string;
}
const imageTypes: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.apng': 'image/apng',
  '.ico': 'image/x-icon'
};
interface Bundle {
  id: string;
  commit: string;
  media: Map<string, Media>;
  checksums: Record<string, string>;
  dumps: Record<string, string>;
  statements: Record<string, string[]>;
  redirects: Record<string, { redirect: { to: string; statusCode: 301 } }>;
}
interface Options {
  pollSeconds?: number;
  beforeActivate?: () => Promise<void>;
  onActivate?: () => Promise<void>;
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
    const localPath = (path: unknown): path is string =>
      typeof path === 'string' &&
      path.startsWith('/') &&
      !path.startsWith('//') &&
      !/[\\\r\n]/.test(path);
    const redirects = JSON.parse(text('redirects.json'));
    if (
      !redirects ||
      Array.isArray(redirects) ||
      typeof redirects !== 'object' ||
      Object.entries(redirects).some(
        ([path, rule]) =>
          !localPath(path) ||
          !(rule as { redirect?: { to?: unknown; statusCode?: unknown } })
            ?.redirect ||
          !localPath((rule as { redirect: { to: unknown } }).redirect.to) ||
          (rule as { redirect: { statusCode: unknown } }).redirect
            .statusCode !== 301
      )
    )
      throw new Error('Invalid bundle redirects.');
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
      statements,
      redirects,
      media: new Map(
        [...payload]
          .filter(([path]) => path.startsWith('media/'))
          .map(([path, bytes]) => [
            path.slice(6),
            {
              bytes,
              type:
                imageTypes[extname(path).toLowerCase()] ??
                'application/octet-stream',
              etag: '"' + contentHash(bytes) + '"'
            }
          ])
      )
    };
  }

  async function activate() {
    let id: string | null = null;
    let candidate: Bundle | undefined;
    let commit: string | null = null;
    let db: DatabaseSync | undefined;
    const activePath = join(options.directory, 'active');
    const stagingPath = join(options.directory, '.active-' + randomUUID());
    let oldTarget: string | undefined;
    let switched = false;
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
      // Fail before touching SQLite if an operator-owned directory occupies the managed link.
      try {
        if (!lstatSync(activePath).isSymbolicLink())
          throw new Error('Managed active path must be a symlink.');
        oldTarget = readlinkSync(activePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      symlinkSync(resolve(options.directory, id), stagingPath, 'dir');
      await options.beforeActivate?.();
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
        renameSync(stagingPath, activePath);
        switched = true;
        await options.onActivate?.();
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
        if (switched) {
          if (oldTarget) {
            symlinkSync(oldTarget, stagingPath, 'dir');
            renameSync(stagingPath, activePath);
          } else unlinkSync(activePath);
        }
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
      if (existsSync(stagingPath)) unlinkSync(stagingPath);
    }
  }
  let inFlight: Promise<void> | undefined;
  function activateCurrent(): Promise<void> {
    return (inFlight ??= activate().finally(() => {
      inFlight = undefined;
    }));
  }
  return {
    activateCurrent,
    settled: () => inFlight ?? Promise.resolve(),
    startPolling: () => {
      const seconds = options.pollSeconds ?? 30;
      if (!Number.isFinite(seconds) || seconds <= 0)
        throw new Error('contentBundles.pollSeconds must be positive.');
      const timer = setInterval(() => {
        void activateCurrent();
      }, seconds * 1000);
      timer.unref();
      return () => clearInterval(timer);
    },
    status: () => ({
      active: active ? { id: active.id, commit: active.commit } : null,
      compatHash: options.artifact.compatHash,
      lastRejection
    }),
    media: (path: string) => {
      try {
        return active?.media.get(decodeURIComponent(path).replace(/^\//, ''));
      } catch {
        return undefined;
      }
    },
    redirect: (path: string) => active?.redirects[path]?.redirect,
    dump: (collection: string) => active?.dumps[collection]
  };
}
