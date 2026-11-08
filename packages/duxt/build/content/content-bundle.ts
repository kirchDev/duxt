import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  chmod,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile
} from 'node:fs/promises';
import { join, posix } from 'node:path';

export interface ContentBundleCompat {
  databaseVersion: string;
  checksumsStructure: Record<string, string>;
  tables: Record<string, string>;
  collectionMetaHash: string;
  resolvedSourcesHash: string;
  /** Registered layout/template descriptors are part of the app image. */
  pageTypesHash?: string;
}

export interface ContentCompatibilityArtifact {
  compatHash: string;
  availableComponents: string[];
}

export interface ContentBundleInput {
  compat: ContentBundleCompat;
  usedComponents: string[];
  provenance: Record<string, unknown>;
  checksums: Record<string, string>;
  /** Bytes from Content's compressed per-collection dump, without decoding. */
  dumps: Record<string, string>;
  redirects: Record<string, unknown>;
  media: Record<string, Uint8Array>;
}

/** Object key order must not give the same schema two compatibility hashes. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export const contentHash = (value: string | Uint8Array) =>
  createHash('sha256').update(value).digest('hex');
export const contentCompatHash = (compat: ContentBundleCompat) =>
  contentHash(
    canonicalJson({
      databaseVersion: compat.databaseVersion,
      checksumsStructure: compat.checksumsStructure,
      tables: compat.tables,
      collectionMetaHash: compat.collectionMetaHash,
      resolvedSourcesHash: compat.resolvedSourcesHash,
      pageTypesHash: compat.pageTypesHash
    })
  );

export function assertContentCompatibility(
  compat: ContentBundleCompat,
  usedComponents: string[],
  expected: ContentCompatibilityArtifact
): void {
  if (
    !expected ||
    typeof expected.compatHash !== 'string' ||
    !Array.isArray(expected.availableComponents) ||
    !expected.availableComponents.every((name) => typeof name === 'string')
  )
    throw new Error('Invalid duxt content compatibility artefact.');
  if (contentCompatHash(compat) !== expected.compatHash)
    throw new Error(
      'Content compatibility hash differs from the app; build a new app image.'
    );
  const missing = usedComponents.filter(
    (name) => !expected.availableComponents.includes(name)
  );
  if (missing.length)
    throw new Error(
      `Content requires unavailable MDC components: ${missing.join(', ')}. Build a new app image.`
    );
}

function safePath(path: string): string {
  if (
    !path ||
    path.includes('\\') ||
    path.includes('\n') ||
    path.includes('\r') ||
    path.startsWith('/') ||
    posix.normalize(path) !== path ||
    path.split('/').some((part) => part === '.' || part === '..')
  )
    throw new Error(`Invalid bundle file path: ${path}`);
  return path;
}

/** Publish all files first; the single current file is the activation boundary. */
export async function writeContentBundle(
  input: ContentBundleInput,
  directory: string
) {
  await mkdir(directory, { recursive: true });
  const temporary = await mkdtemp(join(directory, '.pack-'));
  const pointer = join(directory, `.current-${randomUUID()}`);
  try {
    const files: Record<string, string | Uint8Array> = {
      'bundle.json':
        canonicalJson({
          format: 1,
          provenance: input.provenance,
          compat: input.compat,
          compatHash: contentCompatHash(input.compat),
          usedComponents: [...new Set(input.usedComponents)].sort()
        }) + '\n',
      checksums: canonicalJson(input.checksums) + '\n',
      'redirects.json': canonicalJson(input.redirects) + '\n'
    };
    for (const [collection, dump] of Object.entries(input.dumps)) {
      if (!/^[A-Za-z0-9_-]+$/.test(collection))
        throw new Error(`Invalid collection name: ${collection}`);
      files[`dumps/${collection}.txt`] = dump;
    }
    for (const [path, bytes] of Object.entries(input.media))
      files[`media/${safePath(path)}`] = bytes;
    const paths = Object.keys(files).sort();
    const sums = paths
      .map((path) => `${contentHash(files[path]!)}  ${path}\n`)
      .join('');
    const bundleId = contentHash(sums);
    files.SHA256SUMS = sums;
    for (const [path, bytes] of Object.entries(files)) {
      const target = join(temporary, path);
      await mkdir(join(target, '..'), { recursive: true });
      await writeFile(target, bytes);
    }
    // mkdtemp keeps incomplete payloads private. Publication uses ordinary
    // directory permissions so another uid can read the completed artefact.
    await chmod(temporary, 0o777 & ~process.umask());
    const target = join(directory, bundleId);
    try {
      await rename(temporary, target);
    } catch (error) {
      if (
        !['EEXIST', 'ENOTEMPTY'].includes(
          (error as NodeJS.ErrnoException).code ?? ''
        )
      )
        throw error;
      // Never repair or overwrite a supposedly immutable directory in place.
      for (const [path, bytes] of Object.entries(files)) {
        if (
          !Buffer.from(await readFile(join(target, path))).equals(
            Buffer.from(bytes)
          )
        )
          throw new Error(
            `Existing content bundle ${bundleId} failed integrity validation: ${path}`
          );
      }
    }
    await writeFile(pointer, `${bundleId}\n`);
    await rename(pointer, join(directory, 'current'));
    return {
      bundleId,
      directory: target,
      compatHash: contentCompatHash(input.compat)
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(pointer, { force: true });
  }
}
