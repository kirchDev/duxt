import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Nuxt } from '@nuxt/schema';
import { isContentComponent } from './content-components';
import { readContentCache } from './content-cache';
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
    pageType: source.pageType,
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

/** Content's parser maps native span to ProseSpan; its renderer leaves span native. */
function requiresProseSpan(node: unknown): boolean {
  const named = (tag: unknown) =>
    typeof tag === 'string' &&
    tag.toLowerCase().replace(/[-_]/g, '') === 'prosespan';
  if (Array.isArray(node))
    return (
      (Boolean(node[1]) &&
        typeof node[1] === 'object' &&
        !Array.isArray(node[1]) &&
        named(node[0])) ||
      node.some(requiresProseSpan)
    );
  if (!node || typeof node !== 'object') return false;
  const value = node as Record<string, unknown>;
  if (named(value.tag)) return true;
  // An explicit runtime/document mapping also replaces the native fallback.
  const components = value.components as
    | {
        span?: unknown;
        Span?: unknown;
        map?: { span?: unknown; Span?: unknown };
      }
    | undefined;
  if (
    components?.span ||
    components?.Span ||
    components?.map?.span ||
    components?.map?.Span
  )
    return true;
  return Object.values(value).some(requiresProseSpan);
}

const componentKey = (name: string) => name.toLowerCase().replace(/[-_]/g, '');

function hasComponentNode(node: unknown, name: string): boolean {
  const named = (tag: unknown) =>
    typeof tag === 'string' && componentKey(tag) === componentKey(name);
  if (Array.isArray(node)) {
    if (
      named(node[0]) &&
      node[1] &&
      typeof node[1] === 'object' &&
      !Array.isArray(node[1])
    )
      return true;
    return node.some((child) => hasComponentNode(child, name));
  }
  if (!node || typeof node !== 'object') return false;
  const value = node as Record<string, unknown>;
  return (
    named(value.tag) ||
    Object.values(value).some((child) => hasComponentNode(child, name))
  );
}

function mappingReferences(value: unknown, name: string): boolean {
  if (typeof value === 'string')
    return componentKey(value) === componentKey(name);
  if (Array.isArray(value))
    return value.some((entry) => mappingReferences(entry, name));
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, entry]) =>
      componentKey(key) === componentKey(name) || mappingReferences(entry, name)
  );
}

const mdcMappings = (value: unknown) =>
  value && typeof value === 'object'
    ? (value as { components?: unknown }).components
    : undefined;

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
    | {
        resolvedSources?: DuxtResolvedSource[];
        resolvedPageTypes?: Record<
          string,
          { layout: string; template: string }
        >;
      }
    | undefined;
  const compat: ContentBundleCompat = {
    databaseVersion: runtime.databaseVersion,
    checksumsStructure: manifest.checksumsStructure,
    tables: manifest.tables,
    collectionMetaHash: contentHash(canonicalJson(manifest.collectionMeta)),
    ...(duxt?.resolvedPageTypes
      ? { pageTypesHash: contentHash(canonicalJson(duxt.resolvedPageTypes)) }
      : {}),
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
  const used = new Set(components);
  const mdc = (
    nuxt.options.runtimeConfig.public as { mdc?: unknown } | undefined
  )?.mdc;
  const configured = nuxt.options as unknown as {
    mdc?: unknown;
    content?: { renderer?: { alias?: unknown } };
  };
  // Content scans SQL strings for tags; split literal text can look like a component.
  // Valid names remain requirements even when no static AST node corroborates them.
  const fragments = [...used].filter(
    (name) => !/^[\p{L}\p{N}_$][\p{L}\p{N}\p{M}_$.:-]*$/u.test(name)
  );
  let cachedPages: ReturnType<typeof readContentCache> = undefined;
  if (fragments.length && nuxt.options.rootDir) {
    try {
      cachedPages = readContentCache(nuxt, Object.keys(manifest.checksums));
    } catch {
      /* An unreadable cache cannot refute a component requirement. */
    }
    if (cachedPages?.length) {
      for (const name of fragments) {
        if (
          [
            mdcMappings(mdc),
            mdcMappings(configured.mdc),
            configured.content?.renderer?.alias
          ].some((mapping) => mappingReferences(mapping, name))
        )
          continue;
        if (
          cachedPages.some(
            (page) =>
              hasComponentNode(page.content.body, name) ||
              mappingReferences(mdcMappings(page.content.mdc), name) ||
              mappingReferences(
                mdcMappings(
                  (page.content.meta as { mdc?: unknown } | undefined)?.mdc
                ),
                name
              )
          )
        )
          continue;
        used.delete(name);
      }
    }
  }
  if (used.has('ProseSpan')) {
    const pages =
      cachedPages ??
      (nuxt.options.rootDir
        ? readContentCache(nuxt, Object.keys(manifest.checksums))
        : undefined);
    // A missing cache is not evidence of native-only usage: keep the requirement.
    if (
      pages &&
      !requiresProseSpan(mdc) &&
      !pages.some(
        (page) =>
          requiresProseSpan(page.content.body) ||
          requiresProseSpan(page.content.mdc) ||
          requiresProseSpan(
            (page.content.meta as { mdc?: unknown } | undefined)?.mdc
          )
      )
    )
      used.delete('ProseSpan');
  }
  const availableComponents = [
    ...new Set(
      (nuxt.apps.default?.components ?? [])
        .filter(
          (component) =>
            !component.island &&
            !component.filePath.endsWith('.css') &&
            (component.global ||
              isContentComponent(nuxt, component) ||
              components.includes(component.pascalName))
        )
        .map((component) => component.pascalName)
    )
  ].sort();
  return {
    compat,
    artifact: { compatHash: contentCompatHash(compat), availableComponents },
    usedComponents: [...used].sort(),
    checksums: manifest.checksums
  };
}
