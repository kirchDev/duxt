import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { writeContentBundle } from '../build/content/content-bundle';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

it('publishes a complete immutable content-hash directory before replacing current', async () => {
  const root = mkdtempSync(join(tmpdir(), 'duxt-bundle-'));
  roots.push(root);
  const input = {
    compat: {
      databaseVersion: 'v3.5.0',
      checksumsStructure: { docs: 'schema' },
      tables: { docs: '_content_docs' },
      collectionMetaHash: 'meta',
      resolvedSourcesHash: 'sources'
    },
    usedComponents: ['Callout'],
    provenance: { commit: 'abc' },
    checksums: { docs: 'v3.5.0--one' },
    dumps: { docs: 'Content compressed bytes' },
    redirects: { '/old': { redirect: { to: '/new', statusCode: 301 } } },
    media: { '_duxt/media/image.svg': Buffer.from('<svg/>') }
  };
  const result = await writeContentBundle(input, root);
  expect(result.bundleId).toMatch(/^[a-f0-9]{64}$/);
  expect(readFileSync(join(root, 'current'), 'utf8').trim()).toBe(
    result.bundleId
  );
  const directory = join(root, result.bundleId);
  const readerDefault = join(root, 'reader-default');
  mkdirSync(readerDefault);
  expect(statSync(directory).mode & 0o777).toBe(
    statSync(readerDefault).mode & 0o777
  );
  rmSync(readerDefault, { recursive: true });
  expect(
    JSON.parse(readFileSync(join(directory, 'bundle.json'), 'utf8'))
  ).toMatchObject({
    format: 1,
    usedComponents: ['Callout'],
    provenance: { commit: 'abc' }
  });
  expect(readFileSync(join(directory, 'dumps/docs.txt'), 'utf8')).toBe(
    'Content compressed bytes'
  );
  expect(
    readFileSync(join(directory, 'media/_duxt/media/image.svg'), 'utf8')
  ).toBe('<svg/>');
  const sums = readFileSync(join(directory, 'SHA256SUMS'), 'utf8');
  expect(createHash('sha256').update(sums).digest('hex')).toBe(result.bundleId);
  for (const line of sums.trim().split('\n')) {
    const [hash, path] = line.split('  ');
    expect(
      createHash('sha256')
        .update(readFileSync(join(directory, path!)))
        .digest('hex')
    ).toBe(hash);
  }
  expect((await writeContentBundle(input, root)).bundleId).toBe(
    result.bundleId
  );
  expect(readdirSync(root).sort()).toEqual([result.bundleId, 'current'].sort());
});
