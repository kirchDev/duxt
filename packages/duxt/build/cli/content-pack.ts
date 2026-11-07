import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadNuxt, buildNuxt } from 'nuxt/kit';
import { duxtReport } from './report';
import { emitDuxtSearchRecords } from '../../modules/search-records';
import { assertDuxtHistory, staleDuxtHistory } from '../../modules/git-meta';
import {
  assertContentCompatibility,
  writeContentBundle
} from '../content/content-bundle';
import { contentCompatibility } from '../content/content-compatibility';
import {
  readContentCache,
  invalidateContentCache
} from '../content/content-cache';
import { documentationMediaDirectory } from '../sources/documentation-media';
import { redirectRules, localeSegments } from '../../modules/redirects';
import type { DuxtResolvedSource } from '../sources/sources-resolve';

export interface ContentPackOptions {
  publish?: string;
  expect?: string;
}
export interface ContentPackResult {
  bundleId: string;
  directory: string;
  compatHash: string;
}

async function mediaFiles(
  directory: string,
  prefix = ''
): Promise<Record<string, Uint8Array>> {
  if (!existsSync(directory)) return {};
  const files: Record<string, Uint8Array> = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory())
      Object.assign(files, await mediaFiles(path, relative));
    else if (entry.isFile()) files[relative] = await readFile(path);
    else
      throw new Error(`Documentation media must be regular files: ${relative}`);
  }
  return files;
}

/** Production parsing first, then template preparation only (ADR-0013). */
export async function duxtContentPack(
  options: ContentPackOptions = {}
): Promise<ContentPackResult> {
  const root = process.cwd();
  const buildDir = await mkdtemp(join(root, '.nuxt-pack-'));
  let nuxt: Awaited<ReturnType<typeof loadNuxt>> | undefined;
  try {
    nuxt = await loadNuxt({ cwd: root, dev: false, overrides: { buildDir } });
    nuxt.options._prepare = true;
    await buildNuxt(nuxt);
    assertDuxtHistory(nuxt, true);
    const staleHistory = staleDuxtHistory(nuxt);
    if (staleHistory.length) {
      const remoteRoot = (
        nuxt.options.content as { _remoteSourceRootDir?: string } | undefined
      )?._remoteSourceRootDir;
      invalidateContentCache(nuxt, staleHistory);
      await nuxt.close();
      nuxt = undefined;
      await rm(join(buildDir, 'content'), { recursive: true, force: true });
      nuxt = await loadNuxt({
        cwd: root,
        dev: false,
        overrides: {
          buildDir,
          _prepare: false,
          ...(remoteRoot
            ? { content: { _remoteSourceRootDir: remoteRoot } }
            : {})
        }
      });
      nuxt.options._prepare = true;
      await buildNuxt(nuxt);
    }
    assertDuxtHistory(nuxt);
    const unresolvedHistory = staleDuxtHistory(nuxt);
    if (unresolvedHistory.length)
      throw new Error(
        `duxt: source history metadata could not be refreshed: ${unresolvedHistory.join(', ')}. No bundle was published.`
      );
    const { findings } = duxtReport({ rootDir: root });
    if (findings.errors.length)
      throw new Error(
        `duxt: the documentation did not validate.\n  - ${findings.errors.join('\n  - ')}`
      );
    const { compat, usedComponents, checksums } =
      await contentCompatibility(nuxt);
    if (options.expect)
      assertContentCompatibility(
        compat,
        usedComponents,
        JSON.parse(await readFile(resolve(options.expect), 'utf8'))
      );
    const sources =
      (
        nuxt.options.appConfig.duxt as
          | { resolvedSources?: DuxtResolvedSource[] }
          | undefined
      )?.resolvedSources ?? [];
    const pages = readContentCache(
      nuxt,
      sources.map((source) => source.collection)
    );
    if (!pages) throw new Error('Content parse cache is missing.');
    const prefixes = new Map(
      sources.map((source) => [source.collection, source.prefix])
    );
    const redirects = redirectRules(
      pages.map((page) => ({
        path: page.path,
        prefix: prefixes.get(page.collection) ?? '',
        redirectFrom: Array.isArray(page.content.redirectFrom)
          ? (page.content.redirectFrom as string[])
          : []
      })),
      localeSegments(nuxt)
    );
    const dumps: Record<string, string> = {};
    const compressed = await readFile(
      join(buildDir, 'content/database.compressed.mjs'),
      'utf8'
    );
    for (const line of compressed.split('\n')) {
      const match = /^export const ([A-Za-z0-9_]+) = ("[^"]*")$/.exec(line);
      if (match) dumps[match[1]!] = JSON.parse(match[2]!);
    }
    if (Object.keys(checksums).some((collection) => !dumps[collection]))
      throw new Error('Content compressed dump is missing a collection.');
    let commit: string | null = null;
    try {
      commit = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
    } catch {
      /* A deployed packer need not retain .git. */
    }
    const runtime = nuxt.options.runtimeConfig.content as { version?: string };
    const layerPackage = JSON.parse(
      await readFile(new URL('../../package.json', import.meta.url), 'utf8')
    ) as { version: string };
    const bundle = await writeContentBundle(
      {
        compat,
        usedComponents,
        checksums,
        dumps,
        redirects,
        media: await mediaFiles(documentationMediaDirectory(root)),
        provenance: {
          commit,
          contentVersion: runtime.version,
          duxtVersion: layerPackage.version
        }
      },
      resolve(options.publish ?? '.output/duxt-content')
    );
    try {
      await emitDuxtSearchRecords(nuxt);
    } catch (error) {
      throw new Error(
        `duxt: duxt:search:records sync failed after publishing bundle ${bundle.bundleId}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
    return bundle;
  } finally {
    try {
      await nuxt?.close();
    } finally {
      await rm(buildDir, { recursive: true, force: true });
    }
  }
}
