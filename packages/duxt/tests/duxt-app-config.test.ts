import { spawn } from 'node:child_process';
import { once } from 'node:events';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  readDuxtBuildConfig,
  readDuxtSiteBuildConfig
} from '../build/config/duxt-app-config';

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
  it('reports alongside an actual live Nuxt owner without changing its identity', async () => {
    const consumer = site('/');
    const guard = fileURLToPath(
      new URL(
        '../../../apps/www/scripts/nuxt-process-guard.ts',
        import.meta.url
      )
    );
    writeFileSync(
      join(consumer, 'nuxt.config.ts'),
      `import { claimNuxtProcess } from ${JSON.stringify(guard)}; claimNuxtProcess(${JSON.stringify(consumer)}, 'another reader'); export default {};`
    );
    const { rememberDuxtBuildDirectories } =
      await import('../build/config/duxt-app-config');
    rememberDuxtBuildDirectories(consumer, [consumer]);
    const child = spawn(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import { claimNuxtProcess } from ${JSON.stringify(guard)}; claimNuxtProcess(${JSON.stringify(consumer)}, 'fixture dev'); console.log('owned'); setInterval(() => {}, 1000);`
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    try {
      await Promise.race([
        once(child.stdout!, 'data'),
        once(child, 'exit').then(() => {
          throw new Error('owner exited before holding the site');
        })
      ]);
      const ownerFile = join(consumer, '.data/nuxt-process/owner.json');
      const owner = readFileSync(ownerFile, 'utf8');
      const { duxtReport } = await import('../build/cli/report');
      const report = await duxtReport({ rootDir: consumer });
      expect(report.sources).not.toHaveLength(0);
      expect(readFileSync(ownerFile, 'utf8')).toBe(owner);
    } finally {
      child.kill();
      await once(child, 'exit');
    }
  });

  it('reads prepared layer metadata without re-executing a running site config', async () => {
    const consumer = site('/');
    const extension = site('https://extension.test');
    const guard = "throw new Error('another Nuxt process owns this site');";
    writeFileSync(join(consumer, 'nuxt.config.ts'), guard);
    writeFileSync(
      join(extension, 'duxt.build.ts'),
      `export default { sourceFlavors: { prepared: { normalise() {} } } };`
    );
    const { rememberDuxtBuildDirectories } =
      await import('../build/config/duxt-app-config');
    rememberDuxtBuildDirectories(consumer, [consumer, extension]);
    const config = await readDuxtSiteBuildConfig(consumer, { prepared: true });
    expect(typeof config?.sourceFlavors?.prepared?.normalise).toBe('function');
    writeFileSync(
      join(consumer, 'nuxt.config.ts'),
      guard + '\n// edited layer identity'
    );
    await expect(
      readDuxtSiteBuildConfig(consumer, { prepared: true })
    ).rejects.toThrow(/nuxt prepare/);
  });
  it('gets a real extension section, flavor and schema solely through extends', async () => {
    const consumer = site('/');
    const fixture = fileURLToPath(
      new URL('../../../apps/www/layers/build-extension', import.meta.url)
    );
    writeFileSync(
      join(consumer, 'nuxt.config.ts'),
      `export default { extends: [${JSON.stringify(fixture)}] };`
    );
    const config = await readDuxtSiteBuildConfig(consumer);
    expect(config?.sectionTypes?.['fixture-section']?.versioning).toBe(
      'per-version'
    );
    expect(typeof config?.sourceFlavors?.['fixture-flavor']?.normalise).toBe(
      'function'
    );
    const { z } = await import('@nuxt/content');
    expect(Object.keys(config?.pageSchema?.(z) ?? {})).toContain(
      'extensionFixture'
    );
  });
  it('discovers extends for standalone CLIs invoked from another working directory', async () => {
    const extension = site('https://extension.test');
    const consumer = site('/');
    writeFileSync(join(extension, 'nuxt.config.ts'), 'export default {};');
    writeFileSync(
      join(extension, 'duxt.build.ts'),
      `export default { sectionTypes: { inherited: { marker: 'extension' } } };`
    );
    writeFileSync(
      join(consumer, 'nuxt.config.ts'),
      `export default { extends: [${JSON.stringify(extension)}] };`
    );
    writeFileSync(
      join(consumer, 'duxt.build.ts'),
      `export default { sectionTypes: { inherited: { marker: 'site' } } };`
    );
    const config = await readDuxtSiteBuildConfig(consumer);
    expect(config?.sectionTypes).toMatchObject({
      inherited: { marker: 'site' }
    });
  });
  it('merges build-only contributions from every layer with the site winning', async () => {
    const base = site('https://base.test');
    const extension = site('https://extension.test');
    const consumer = site('/');
    writeFileSync(
      join(base, 'duxt.build.ts'),
      `export default { sectionTypes: { base: { marker: 'base' }, shared: { marker: 'base', obsolete: true } }, sourceFlavors: { custom: { normalise() {} } }, pageSchema: z => ({ baseField: z.string().optional() }) };`
    );
    writeFileSync(
      join(extension, 'duxt.build.ts'),
      `export default { sectionTypes: { extra: { marker: 'extension' }, shared: { marker: 'extension' } }, pageSchema: z => ({ extraField: z.number().optional() }) };`
    );
    writeFileSync(
      join(consumer, 'duxt.build.ts'),
      `export default { sectionTypes: { shared: { marker: 'site' } }, pageSchema: z => ({ extraField: z.string().optional() }) };`
    );
    const config = readDuxtBuildConfig([consumer, extension, base]);
    expect(config?.sectionTypes).toMatchObject({
      base: { marker: 'base' },
      extra: { marker: 'extension' },
      shared: { marker: 'site' }
    });
    expect(config?.sectionTypes?.shared).toEqual({ marker: 'site' });
    const { z } = await import('@nuxt/content');
    const fields = config?.pageSchema?.(z);
    expect(fields?.baseField?.safeParse('base').success).toBe(true);
    expect(fields?.extraField?.safeParse('site').success).toBe(true);
    expect(fields?.extraField?.safeParse(42).success).toBe(false);
    expect(Object.keys(config?.sourceFlavors ?? {})).toContain('custom');
    expect(config?.sources?.[0]?.options).toMatchObject({
      tryIt: { baseUrl: '/' }
    });
  });
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
