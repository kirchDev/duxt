import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import { loadNuxtConfig } from 'nuxt/kit';
import type { DuxtBuildConfig } from '../../build/config/duxt-app-config';
import type { DuxtResolvedSource } from '../../build/sources/sources-resolve';

interface WwwSearchConfig {
  sources: DuxtBuildConfig['sources'];
  title: DuxtBuildConfig['title'];
  manifest: DuxtResolvedSource[];
}

/** Read real Node-mode site configuration without sharing its build owner or receipt. */
export function wwwSearchConfig(): WwwSearchConfig {
  const repository = fileURLToPath(new URL('../../../../', import.meta.url));
  const site = join(repository, 'apps/www');
  const temporary = mkdtempSync(join(tmpdir(), 'duxt-www-search-config-'));
  const isolatedSite = join(temporary, 'apps/www');
  mkdirSync(isolatedSite, { recursive: true });
  try {
    for (const name of ['scripts', 'packages', 'node_modules'])
      symlinkSync(join(repository, name), join(temporary, name), 'dir');
    for (const entry of readdirSync(site, { withFileTypes: true })) {
      if (
        ['.data', '.nuxt', '.output'].includes(entry.name) ||
        entry.name.startsWith('.env')
      )
        continue;
      const target = join(isolatedSite, entry.name);
      if (entry.name === 'nuxt.config.ts')
        copyFileSync(join(site, entry.name), target);
      else if (entry.name === 'node_modules') {
        mkdirSync(target);
        for (const dependency of readdirSync(join(site, entry.name)))
          if (dependency !== '.cache')
            symlinkSync(
              join(site, entry.name, dependency),
              join(target, dependency)
            );
      } else symlinkSync(join(site, entry.name), target);
    }
    const output = execFileSync(
      process.execPath,
      [
        fileURLToPath(import.meta.url),
        '--read-www-search-config',
        isolatedSite
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          NITRO_PRESET: 'node-server'
        },
        timeout: 15_000,
        maxBuffer: 4 * 1024 * 1024
      }
    );
    const result = output
      .split('\n')
      .find((line) => line.startsWith('WWW_SEARCH_CONFIG '));
    if (!result)
      throw new Error('The real site config produced no search manifest');
    return JSON.parse(
      result.slice('WWW_SEARCH_CONFIG '.length)
    ) as WwwSearchConfig;
  } finally {
    // The child has exited, releasing its SQLite ownership before cleanup.
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[2] === '--read-www-search-config') {
  const rootDir = process.argv[3];
  if (!rootDir) throw new Error('A temporary site directory is required');
  const config = await loadNuxtConfig({ cwd: rootDir, dotenv: false });
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    nativeModules: ['nuxt', '@nuxt/kit']
  });
  const { readDuxtBuildConfig } = jiti(
    '../../build/config/duxt-app-config.ts'
  ) as typeof import('../../build/config/duxt-app-config');
  const { duxtManifest } = jiti(
    '../../build/sections/sections-resolve.ts'
  ) as typeof import('../../build/sections/sections-resolve');
  const content = readDuxtBuildConfig(
    config._layers
      .flatMap((layer) => [layer.config.rootDir, layer.config.srcDir])
      .filter((directory): directory is string => Boolean(directory))
  );
  if (!content) throw new Error('The real site must have a build config');
  console.log(
    'WWW_SEARCH_CONFIG ' +
      JSON.stringify({
        sources: content.sources,
        title: content.title,
        manifest: duxtManifest(
          content.sources ?? [],
          content.sourceOptions,
          content.sectionTypes
        )
      } satisfies WwwSearchConfig)
  );
}
