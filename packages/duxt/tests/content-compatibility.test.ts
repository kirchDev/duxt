import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Nuxt } from '@nuxt/schema';
import { expect, it } from 'vitest';
import type { DuxtResolvedSource } from '../build/sources/sources-resolve';
import {
  duxtSectionInput,
  resolveGeneratedSections,
  sectionPages
} from '../build/sections/sections-resolve';
import { openapiSectionType } from '../build/sections/sections-openapi';
import {
  assertContentCompatibility,
  contentCompatHash
} from '../build/content/content-bundle';
import {
  contentCompatibility,
  readContentManifest
} from '../build/content/content-compatibility';
const compat = {
  databaseVersion: 'v3.5.0',
  checksumsStructure: { docs: 'schema' },
  tables: { docs: '_content_docs' },
  collectionMetaHash: 'meta',
  resolvedSourcesHash: 'sources'
};
it('accepts component subsets without including them in the structural hash', () => {
  const expected = {
    compatHash: contentCompatHash(compat),
    availableComponents: ['Callout', 'Tabs']
  };
  expect(() =>
    assertContentCompatibility(compat, ['Callout', 'Tabs'], expected)
  ).not.toThrow();
  expect(() => assertContentCompatibility(compat, [], expected)).not.toThrow();
  expect(() =>
    assertContentCompatibility(compat, ['NewWidget'], expected)
  ).toThrow('NewWidget');
  for (const changed of [
    { ...compat, databaseVersion: 'v4' },
    { ...compat, checksumsStructure: { docs: 'changed' } },
    { ...compat, tables: { docs: 'changed' } },
    { ...compat, collectionMetaHash: 'changed' },
    { ...compat, resolvedSourcesHash: 'changed' }
  ])
    expect(() => assertContentCompatibility(changed, [], expected)).toThrow(
      'hash differs'
    );
  expect(contentCompatHash({ ...compat, tables: { b: 'b', a: 'a' } })).toBe(
    contentCompatHash({ ...compat, tables: { a: 'a', b: 'b' } })
  );
});
it('reads only literal manifest data and refuses an executable expression', () => {
  const literal =
    'export const checksums = {"docs":"v3.5.0--one"}\nexport const checksumsStructure = {"docs":"schema"}\nexport const tables = {"docs":"_content_docs"}\nexport default {"docs":{"type":"page","fields":{}}}';
  expect(readContentManifest(literal).checksums).toEqual({
    docs: 'v3.5.0--one'
  });
  expect(() =>
    readContentManifest(
      literal.replace('{"docs":"v3.5.0--one"}', 'process.exit(9)')
    )
  ).toThrow();
});

it('keeps generated content changes compatible while source declarations remain the same', async () => {
  const root = await mkdtemp(join(tmpdir(), 'duxt-compat-'));
  try {
    await mkdir(join(root, 'content'));
    await writeFile(
      join(root, 'content/manifest.ts'),
      'export const checksums = {"docs":"v3.5.0--one"}\nexport const checksumsStructure = {"docs":"schema"}\nexport const tables = {"docs":"_content_docs"}\nexport default {"docs":{"type":"page","fields":{}}}'
    );
    const hash = async (sources: DuxtResolvedSource[]) =>
      (
        await contentCompatibility({
          options: {
            buildDir: root,
            runtimeConfig: { content: { databaseVersion: 'v3.5.0' } },
            appConfig: { duxt: { resolvedSources: sources } },
            build: {
              templates: [
                {
                  filename: 'content/components.ts',
                  options: { manifest: { components: [] } }
                }
              ]
            }
          },
          apps: { default: { components: [] } }
        } as unknown as Nuxt)
      ).artifact.compatHash;
    const [entry] = resolveGeneratedSections([
      {
        path: 'docs',
        generated: [{ type: 'openapi', path: 'api.json', label: 'API' }]
      }
    ]);
    const paths: Record<string, unknown> = {
      '/one': { get: { responses: { '200': { description: 'OK' } } } }
    };
    const spec = {
      openapi: '3.1.0',
      info: { title: 'Fixture', version: '1' },
      paths
    };
    sectionPages(
      entry!,
      openapiSectionType,
      duxtSectionInput('api.json', JSON.stringify(spec))
    );
    const initial = await hash([entry!]);
    const report = structuredClone(entry!.generated!.report);
    paths['/two'] = { get: { responses: { '200': { description: 'Added' } } } };
    paths['/one'] = {
      get: {
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Missing' }
              }
            }
          }
        }
      }
    };
    sectionPages(
      entry!,
      openapiSectionType,
      duxtSectionInput('api.json', JSON.stringify(spec))
    );
    expect(entry!.generated!.report!.pages).toBeGreaterThan(report!.pages);
    expect(entry!.generated!.report!.warnings.length).toBeGreaterThan(
      report!.warnings.length
    );
    expect(await hash([entry!])).toBe(initial);
    const withoutReport = structuredClone(entry!);
    delete withoutReport.generated!.report;
    expect(await hash([withoutReport])).toBe(initial);
    const added = {
      ...entry!,
      collection: 'extra',
      prefix: '/extra',
      path: 'extra.json'
    };
    expect(await hash([entry!, added])).not.toBe(initial);
    expect(await hash([])).not.toBe(initial);
    for (const changed of [
      { ...entry!, collection: 'renamed' },
      { ...entry!, prefix: '/renamed' },
      { ...entry!, ref: 'v2', refKind: 'tag' as const, version: 'v2' },
      { ...entry!, locale: 'de', isDefaultLocale: false },
      {
        ...entry!,
        generated: {
          ...entry!.generated!,
          options: { title: 'Changed declaration' }
        }
      }
    ])
      expect(await hash([changed])).not.toBe(initial);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
