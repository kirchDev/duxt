import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { brunoZipEntries, brunoZipPath, zipStore } from '../bruno-zip';
import { duxtSectionInput } from '../sections-resolve';

/** The archive, as the `unzip` on this machine reads it back. */
function unzipped(zip: Uint8Array): string[] {
  const dir = mkdtempSync(join(tmpdir(), 'duxt-zip-'));
  const file = join(dir, 'collection.zip');

  writeFileSync(file, zip);

  return execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .sort();
}

describe('zipStore', () => {
  it('writes an archive a real unzip can list', () => {
    // The format is written by hand rather than pulled in as a dependency, so
    // the only test worth having is the one that hands it to something else.
    const zip = zipStore([
      { name: 'bruno.json', data: '{"name":"Shipments"}' },
      { name: 'users/get.bru', data: 'meta {\n  name: Get\n}\n' }
    ]);

    expect(unzipped(zip)).toEqual(['bruno.json', 'users/get.bru']);
  });

  it('extracts to the same bytes it was given', () => {
    const body = '{\n  "name": "Ada Lovelace ✎"\n}\n';
    const dir = mkdtempSync(join(tmpdir(), 'duxt-zip-'));
    const file = join(dir, 'c.zip');

    writeFileSync(file, zipStore([{ name: 'a/b.json', data: body }]));
    execFileSync('unzip', ['-q', file, '-d', dir]);

    expect(
      execFileSync('cat', [join(dir, 'a/b.json')], { encoding: 'utf8' })
    ).toBe(body);
  });

  it('is byte-identical for the same input', () => {
    // A timestamp of "now" would make every build produce a different archive,
    // so a documentation site that rebuilds nightly would ship a new download
    // for a collection nobody touched.
    const files = [{ name: 'a.bru', data: 'x' }];

    expect(zipStore(files)).toEqual(zipStore(files));
  });
});

describe('brunoZipEntries', () => {
  const input = duxtSectionInput('api', {
    'bruno.json': '{}',
    'collection.bru': 'headers {\n}\n',
    'users/get.bru': 'get {\n  url: /x\n}\n',
    'environments/prod.bru': 'vars {\n  TOKEN: hunter2\n}\n'
  });

  it('carries the collection and leaves every environment out', () => {
    // The ZIP is the canonical way to acquire the collection, and it is still
    // published on the open web: an environment file is where the keys are.
    expect(brunoZipEntries(input).map((entry) => entry.name)).toEqual([
      'bruno.json',
      'collection.bru',
      'users/get.bru'
    ]);
  });
});

describe('brunoZipPath', () => {
  it('names the archive after the collection, not the prefix', () => {
    // A prefix is shared by two languages on purpose; a collection name is the
    // one identity unique per version AND per locale.
    expect(brunoZipPath('demo_api_v2_de')).toBe(
      '/_duxt/bruno/demo_api_v2_de.zip'
    );
  });
});
