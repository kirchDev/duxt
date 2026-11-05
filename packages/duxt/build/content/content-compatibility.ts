import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Nuxt } from '@nuxt/schema';
import { isContentComponent } from './content-components';
import type { DuxtResolvedSource } from '../sources/sources-resolve';
import {
  canonicalJson,
  contentHash,
  contentCompatHash
} from './content-bundle';
import type {
  ContentBundleCompat,
  ContentCompatibilityArtifact
} from './content-bundle';

/** Content emits JSON literals; never execute a generated manifest to read it. */
export function readContentManifest(source: string) {
  function literal(name: string): Record<string, string> {
    const expression =
      name === 'default' ? 'export default ' : `export const ${name} = `;
    const start = source.indexOf(expression);
    if (start < 0)
      throw new Error(`Content manifest no longer exports ${name}.`);
    const rest = source.slice(start + expression.length);
    const next = rest.indexOf('\nexport ');
    return JSON.parse(
      (next < 0 ? rest : rest.slice(0, next)).trim().replace(/;$/, '')
    );
  }
  return {
    checksums: literal('checksums'),
    checksumsStructure: literal('checksumsStructure'),
    tables: literal('tables'),
    collectionMeta: literal('default')
  };
}

/** Only declarations affect compatibility; parser reports describe this bundle's content. */
function sourceStructure(source: DuxtResolvedSource) {
  const generated = source.generated;
  return {
    collection: source.collection,
    prefix: source.prefix,
    repo: source.repo,
    version: source.version,
    name: source.name,
    isDefault: source.isDefault,
    repository: source.repository,
    repositoryUrl: source.repositoryUrl,
    ref: source.ref,
    originPath: source.originPath,
    refKind: source.refKind,
    path: source.path,
    locale: source.locale,
    isDefaultLocale: source.isDefaultLocale,
    status: source.status,
    history: source.history,
    flavor: source.flavor,
    generated: generated && {
      type: generated.type,
      label: generated.label,
      slug: generated.slug,
      declaration: generated.declaration,
      navigation: generated.navigation,
      icon: generated.icon,
      layout: generated.layout,
      options: generated.options,
      versioning: generated.versioning,
      localisation: generated.localisation,
      remote: generated.remote
    }
  };
}

export async function contentCompatibility(nuxt: Nuxt): Promise<{
  compat: ContentBundleCompat;
  artifact: ContentCompatibilityArtifact;
  usedComponents: string[];
  checksums: Record<string, string>;
}> {
  const manifest = readContentManifest(
    await readFile(join(nuxt.options.buildDir, 'content/manifest.ts'), 'utf8')
  );
  const runtime = nuxt.options.runtimeConfig.content as
    | { databaseVersion?: string }
    | undefined;
  if (!runtime?.databaseVersion || !Object.keys(manifest.checksums).length)
    throw new Error('Content has not produced collection checksums.');
  const duxt = nuxt.options.appConfig.duxt as
    | { resolvedSources?: DuxtResolvedSource[] }
    | undefined;
  const compat: ContentBundleCompat = {
    databaseVersion: runtime.databaseVersion,
    checksumsStructure: manifest.checksumsStructure,
    tables: manifest.tables,
    collectionMetaHash: contentHash(canonicalJson(manifest.collectionMeta)),
    resolvedSourcesHash: contentHash(
      canonicalJson((duxt?.resolvedSources ?? []).map(sourceStructure))
    )
  };
  const template = nuxt.options.build.templates.find(
    (entry) =>
      typeof entry !== 'string' && entry.filename === 'content/components.ts'
  );
  const components =
    typeof template === 'object'
      ? (
          template.options as
            | { manifest?: { components?: string[] } }
            | undefined
        )?.manifest?.components
      : undefined;
  if (!Array.isArray(components))
    throw new Error(
      'Content no longer exposes the parsed MDC component manifest.'
    );
  const availableComponents = [
    ...new Set(
      (nuxt.apps.default?.components ?? [])
        .filter(
          (component) =>
            !component.island &&
            !component.filePath.endsWith('.css') &&
            (component.global || isContentComponent(nuxt, component))
        )
        .map((component) => component.pascalName)
    )
  ].sort();
  return {
    compat,
    artifact: { compatHash: contentCompatHash(compat), availableComponents },
    usedComponents: [...new Set(components)].sort(),
    checksums: manifest.checksums
  };
}
