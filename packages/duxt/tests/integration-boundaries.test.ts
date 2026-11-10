import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import ts from 'typescript';
import { parse as parseSfc } from 'vue/compiler-sfc';

const root = fileURLToPath(new URL('..', import.meta.url));
const ownedFolders = [
  'build/openapi/',
  'build/bruno/',
  'build/tfplugindocs/',
  'app/integrations/',
  'app/components/integrations/'
];
// Existing runtime implementations retain their auto-import names until package extraction.
// These are individual integration files, never whole generic utility/type directories.
const ownedRuntime = new Set([
  'app/components/DuxtBrunoEntries.vue',
  'app/components/DuxtOpenApiCallbacks.vue',
  'app/components/DuxtOpenApiClient.vue',
  'app/components/DuxtOpenApiMedia.vue',
  'app/components/DuxtOpenApiMethod.vue',
  'app/components/DuxtOpenApiParameters.vue',
  'app/components/DuxtOpenApiResponses.vue',
  'app/components/DuxtOpenApiSchema.vue',
  'app/components/DuxtOpenApiSecurity.vue',
  'app/components/content/BrunoOverview.vue',
  'app/components/content/BrunoRequest.vue',
  'app/components/content/BrunoRequests.vue',
  'app/components/content/OpenApiOperation.vue',
  'app/components/content/OpenApiOperations.vue',
  'app/components/content/OpenApiOverview.vue',
  'app/components/DuxtJsonEditor.vue',
  'app/composables/useDuxtRequest.ts',
  'app/utils/openapi.ts',
  'app/utils/request-samples.ts',
  'app/layouts/reference.vue'
]);
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? files(path)
      : /\.(ts|vue)$/.test(entry.name)
        ? [path]
        : [];
  });
}
it('keeps core free of integration imports and named dispatch', () => {
  const core = ['app', 'build', 'modules', 'server']
    .flatMap((dir) => files(join(root, dir)))
    .map((path) => ({
      path: relative(root, path),
      source: readFileSync(path, 'utf8')
    }))
    .filter(
      ({ path }) =>
        !ownedFolders.some((folder) => path.startsWith(folder)) &&
        !ownedRuntime.has(path)
    );
  expect(core.length).toBeGreaterThan(150);
  const offenders = core.flatMap(({ path, source }) => {
    return namesIntegration(path, source) ? [path] : [];
  });
  expect(offenders).toEqual([]);
  const registrationEdge =
    'app/utils/duxt-config.ts -> app/integrations/defaults.ts';
  const edges = core.flatMap(({ path, source }) =>
    syntax(path, source).imports.flatMap((specifier) => {
      const target = specifier.startsWith('.')
        ? relative(root, resolve(root, dirname(path), specifier))
        : specifier.startsWith('@duxt/')
          ? `app/${specifier.slice(6)}`
          : '';
      return ownedFolders.some((folder) => target.startsWith(folder))
        ? [`${path} -> ${target.replace(/\.ts$/, '')}.ts`]
        : [];
    })
  );
  // The aggregate is the explicit built-in registration boundary; no generic
  // caller may reach an owned implementation through a neutral alias instead.
  expect(edges).toEqual([registrationEdge]);
  // It parses every source file in the layer, which the default limit does not
  // leave room for on a machine running the other suites beside it.
}, 30_000);

const integrationName = /openapi|bruno|tfplugindocs/i;

function scriptSyntax(path: string, source: string) {
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const tokens: string[] = [];
  const imports: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJSDoc(node)) return;
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    )
      imports.push(node.moduleSpecifier.text);
    if (
      ts.isExternalModuleReference(node) &&
      node.expression &&
      ts.isStringLiteralLike(node.expression)
    )
      imports.push(node.expression.text);
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require')) &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    )
      imports.push(node.arguments[0].text);
    const children = node.getChildren(tree);
    if (children.length) children.forEach(visit);
    else
      tokens.push(
        ts.isStringLiteralLike(node) || ts.isIdentifier(node)
          ? node.text
          : node.getText(tree)
      );
  }
  visit(tree);
  return { tokens, imports };
}

function syntax(path: string, source: string) {
  if (!path.endsWith('.vue')) return scriptSyntax(path, source);
  const { descriptor, errors } = parseSfc(source, { filename: path });
  if (errors.length) throw new Error(`${path}: ${errors.join(', ')}`);
  const tokens: string[] = [];
  const imports: string[] = [];
  for (const script of [descriptor.script, descriptor.scriptSetup]) {
    if (!script) continue;
    const parsed = scriptSyntax(path + '.ts', script.content);
    tokens.push(...parsed.tokens);
    imports.push(...parsed.imports);
    if (script.src) {
      tokens.push(script.src);
      imports.push(script.src);
    }
  }
  const template = descriptor.template;
  if (template?.src) {
    tokens.push(template.src);
    imports.push(template.src);
  }
  if (template?.ast) {
    type Root = NonNullable<typeof template.ast>;
    const comments: { start: number; end: number }[] = [];
    function visit(node: Root | Root['children'][number]) {
      if (node.type === 3)
        comments.push({
          start: node.loc.start.offset,
          end: node.loc.end.offset
        });
      else if (node.type === 0 || node.type === 1) node.children.forEach(visit);
    }
    visit(template.ast);
    // Inspect original, disjoint source regions. No rewritten source can hide
    // a reference inside a string or create another comment delimiter.
    let start = template.loc.start.offset;
    for (const comment of comments) {
      tokens.push(source.slice(start, comment.start));
      start = comment.end;
    }
    tokens.push(source.slice(start, template.loc.end.offset));
  }
  for (const block of [...descriptor.styles, ...descriptor.customBlocks]) {
    tokens.push(block.content);
    if (block.src) {
      tokens.push(block.src);
      imports.push(block.src);
    }
  }
  return { tokens, imports };
}

function namesIntegration(path: string, source: string): boolean {
  return syntax(path, source).tokens.some((token) =>
    integrationName.test(token)
  );
}

it.each([
  String.raw`const op\u0065napi = 1;`,
  String.raw`const tf\u0070lugindocs = 1;`,
  String.raw`const br\u0075no = 1;`
])('detects decoded integration identifiers: %s', (source) => {
  expect(namesIntegration('core.ts', source)).toBe(true);
});

it.each([
  ['core.ts', 'const dispatch = "/* openapi */";'],
  ['core.ts', 'const dispatch = "<!-- bruno -->";'],
  ['core.ts', 'const dispatch = "tf\\u0070lugindocs";'],
  ['core.vue', '<template><div title="<!-- openapi -->" /></template>'],
  ['core.vue', '<script setup>const dispatch = "/* bruno */";</script>'],
  ['core.vue', '<script src="./openapi.ts" />'],
  ['core.vue', '<template src="./bruno.html" />']
])(
  'detects integration names inside comment-shaped literals in %s',
  (path, source) => {
    expect(namesIntegration(path, source)).toBe(true);
  }
);

it.each([
  ['core.ts', '// openapi\nconst neutral = 1; /* bruno */'],
  [
    'core.ts',
    '/** Dispatch docs: openapi. @see bruno */ export const neutral = 1;'
  ],
  ['core.vue', '<template><!-- openapi > bruno --><div /></template>'],
  [
    'core.vue',
    '<script setup>/* tfplugindocs */ const neutral = 1;</script><template><!-- bruno --><div /></template>'
  ]
])('ignores actual comments in %s', (path, source) => {
  expect(namesIntegration(path, source)).toBe(false);
});

it.each([
  ['import type { X } from "../bruno/model";', '../bruno/model'],
  ['export { X } from "../openapi/model";', '../openapi/model'],
  [
    'const load = () => import(/* integration */ "../tfplugindocs/model");',
    '../tfplugindocs/model'
  ],
  ['const load = require("../bruno/model");', '../bruno/model'],
  [
    'import neutral from "@duxt/integrations/defaults";',
    '@duxt/integrations/defaults'
  ]
])('finds integration import edges through syntax: %s', (source, specifier) => {
  expect(syntax('core.ts', source).imports).toEqual([specifier]);
});
