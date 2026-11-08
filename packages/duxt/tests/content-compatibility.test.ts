import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Nuxt } from '@nuxt/schema';
import { expect, it } from 'vitest';
import type { DuxtResolvedSource } from '../build/sources/sources-resolve';
import {
  duxtSectionInput,
  resolveGeneratedSections,
  sectionPages
} from '../build/sections/sections-resolve';
import { openapiSectionType } from '../build/openapi/section';
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

it('retains compiled local MDC components while distinguishing native spans from authored components', async () => {
  const root = await mkdtemp(join(tmpdir(), 'duxt-component-compat-'));
  try {
    await mkdir(join(root, 'content'));
    await writeFile(
      join(root, 'content/manifest.ts'),
      'export const checksums = {"docs":"v3--one"}\nexport const checksumsStructure = {"docs":"schema"}\nexport const tables = {"docs":"_content_docs"}\nexport default {"docs":{"type":"page","fields":{}}}'
    );
    const database = new DatabaseSync(join(root, 'cache.sqlite'));
    database.exec(
      'CREATE TABLE _development_cache (id TEXT PRIMARY KEY, value TEXT)'
    );
    const page = (
      tag: string,
      text = 'Syntax highlighting',
      settings: Record<string, unknown> = {}
    ) => {
      database
        .prepare('INSERT OR REPLACE INTO _development_cache VALUES (?, ?)')
        .run(
          'docs/page.md',
          JSON.stringify({
            path: '/page',
            body: {
              type: 'minimark',
              value: [[tag, {}, text]]
            },
            ...settings
          })
        );
    };
    const aliases: Record<string, string> = {};
    const required = ['DemoDiagrams', 'ProseSpan'];
    const nuxt = {
      options: {
        rootDir: root,
        buildDir: root,
        runtimeConfig: {
          content: {
            databaseVersion: 'v3',
            localDatabase: { filename: join(root, 'cache.sqlite') }
          },
          public: { mdc: { components: { map: aliases } } }
        },
        appConfig: {},
        build: {
          templates: [
            {
              filename: 'content/components.ts',
              options: {
                manifest: { components: required }
              }
            }
          ]
        }
      },
      apps: {
        default: {
          components: [
            {
              pascalName: 'DemoDiagrams',
              filePath: join(root, 'app/components/DemoDiagrams.vue')
            },
            {
              pascalName: 'UnusedLocal',
              filePath: join(root, 'app/components/UnusedLocal.vue')
            }
          ]
        }
      }
    } as unknown as Nuxt;
    try {
      page('span');
      const image = await contentCompatibility(nuxt);
      expect(image.usedComponents).toEqual(['DemoDiagrams']);
      expect(image.artifact.availableComponents).toContain('DemoDiagrams');
      expect(image.artifact.availableComponents).not.toContain('UnusedLocal');
      expect(() =>
        assertContentCompatibility(
          image.compat,
          image.usedComponents,
          image.artifact
        )
      ).not.toThrow();
      for (const unknown of ['UnusedLocal', 'NewWidget'])
        expect(() =>
          assertContentCompatibility(image.compat, [unknown], image.artifact)
        ).toThrow(unknown);
      page('prose-span');
      const authored = await contentCompatibility(nuxt);
      expect(authored.usedComponents).toContain('ProseSpan');
      expect(() =>
        assertContentCompatibility(
          authored.compat,
          authored.usedComponents,
          image.artifact
        )
      ).toThrow('ProseSpan');
      page('span');
      aliases.span = 'ProseSpan';
      expect((await contentCompatibility(nuxt)).usedComponents).toContain(
        'ProseSpan'
      );
      delete aliases.span;
      nuxt.apps.default!.components.push({
        pascalName: 'ProseSpan',
        filePath: join(root, 'app/components/ProseSpan.vue')
      } as (typeof nuxt.apps.default.components)[number]);
      // Content imported this real component from the original parser manifest,
      // even though its native span never needs to invoke it.
      const compiledSpan = await contentCompatibility(nuxt);
      expect(compiledSpan.artifact.availableComponents).toContain('ProseSpan');
      const fragment = 'Text[Fragment';
      required.push(fragment);
      page('p', '[[');
      const textual = await contentCompatibility(nuxt);
      expect(textual.usedComponents).not.toContain(fragment);
      expect(() =>
        assertContentCompatibility(
          textual.compat,
          textual.usedComponents,
          compiledSpan.artifact
        )
      ).not.toThrow();
      required.push('UnshippedWidget');
      const unknown = await contentCompatibility(nuxt);
      expect(unknown.usedComponents).toContain('UnshippedWidget');
      expect(() =>
        assertContentCompatibility(
          unknown.compat,
          unknown.usedComponents,
          compiledSpan.artifact
        )
      ).toThrow('UnshippedWidget');
      required.pop();
      page(fragment);
      const unusualNode = await contentCompatibility(nuxt);
      expect(unusualNode.usedComponents).toContain(fragment);
      expect(() =>
        assertContentCompatibility(
          unusualNode.compat,
          unusualNode.usedComponents,
          compiledSpan.artifact
        )
      ).toThrow(fragment);
      for (const settings of [
        { mdc: { components: { map: { span: fragment } } } },
        { meta: { mdc: { components: { map: { span: fragment } } } } }
      ]) {
        page('p', '[[', settings);
        const mapped = await contentCompatibility(nuxt);
        expect(mapped.usedComponents).toContain(fragment);
        expect(() =>
          assertContentCompatibility(
            mapped.compat,
            mapped.usedComponents,
            compiledSpan.artifact
          )
        ).toThrow(fragment);
      }
      page('p', '[[');
      aliases.span = fragment;
      expect((await contentCompatibility(nuxt)).usedComponents).toContain(
        fragment
      );
      delete aliases.span;
      const options = nuxt.options as unknown as Record<string, unknown>;
      for (const [key, value] of [
        ['mdc', { components: { map: { span: fragment } } }],
        ['content', { renderer: { alias: { span: fragment } } }]
      ] as const) {
        options[key] = value;
        expect((await contentCompatibility(nuxt)).usedComponents).toContain(
          fragment
        );
        delete options[key];
      }
      required.splice(required.indexOf('ProseSpan'), 1);
      const runtime = nuxt.options.runtimeConfig.content as {
        localDatabase: { filename: string };
      };
      runtime.localDatabase.filename = join(root, 'missing.sqlite');
      const missingCache = await contentCompatibility(nuxt);
      expect(missingCache.usedComponents).toContain(fragment);
      expect(() =>
        assertContentCompatibility(
          missingCache.compat,
          missingCache.usedComponents,
          compiledSpan.artifact
        )
      ).toThrow(fragment);
      const corrupt = join(root, 'corrupt.sqlite');
      await writeFile(corrupt, 'not a SQLite database');
      runtime.localDatabase.filename = corrupt;
      const unreadableCache = await contentCompatibility(nuxt);
      expect(unreadableCache.usedComponents).toContain(fragment);
      expect(() =>
        assertContentCompatibility(
          unreadableCache.compat,
          unreadableCache.usedComponents,
          compiledSpan.artifact
        )
      ).toThrow(fragment);
    } finally {
      database.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('keeps generated content changes compatible while source declarations remain the same', async () => {
  const root = await mkdtemp(join(tmpdir(), 'duxt-compat-'));
  try {
    await mkdir(join(root, 'content'));
    await writeFile(
      join(root, 'content/manifest.ts'),
      'export const checksums = {"docs":"v3.5.0--one"}\nexport const checksumsStructure = {"docs":"schema"}\nexport const tables = {"docs":"_content_docs"}\nexport default {"docs":{"type":"page","fields":{}}}'
    );
    const hash = async (
      sources: DuxtResolvedSource[],
      resolvedPageTypes: Record<
        string,
        { layout: string; template: string }
      > = {
        docs: { layout: 'docs', template: 'DuxtDocsPage' }
      }
    ) =>
      (
        await contentCompatibility({
          options: {
            buildDir: root,
            runtimeConfig: { content: { databaseVersion: 'v3.5.0' } },
            appConfig: {
              duxt: { resolvedSources: sources, resolvedPageTypes }
            },
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
    expect(
      await hash([entry!], {
        docs: { template: 'DuxtDocsPage', layout: 'docs' }
      })
    ).toBe(initial);
    expect(
      await hash([entry!], {
        docs: { layout: 'docs', template: 'DifferentRenderer' }
      })
    ).not.toBe(initial);
    expect(
      await hash([entry!], {
        docs: { layout: 'docs', template: 'DuxtDocsPage' },
        article: { layout: 'wiki', template: 'WikiArticle' }
      })
    ).not.toBe(initial);
    expect(await hash([{ ...entry!, pageType: 'article' }])).not.toBe(initial);
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
