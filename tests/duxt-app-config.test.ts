import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readDuxtBuildConfig } from '../duxt-app-config';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function site(baseUrl: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'duxt-app-config-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'app'));
  write(dir, baseUrl);

  return dir;
}

function write(dir: string, baseUrl: string) {
  writeFileSync(
    join(dir, 'app', 'app.config.ts'),
    `export default defineAppConfig({ duxt: { sources: [{ path: 'docs', options: { tryIt: { baseUrl: '${baseUrl}' } } }] } });\n`
  );
}

describe('readDuxtBuildConfig', () => {
  it('reads an edited app.config again rather than the first one it loaded', () => {
    // `nuxi dev` restarts Nuxt in the same process, so a module cache here kept
    // the options the dev server started with.
    const dir = site('https://example.test');
    expect(JSON.stringify(readDuxtBuildConfig([dir]))).toContain(
      'https://example.test'
    );

    write(dir, '/');
    const again = JSON.stringify(readDuxtBuildConfig([dir]));

    expect(again).toContain('"baseUrl":"/"');
    expect(again).not.toContain('https://example.test');
  });
});
