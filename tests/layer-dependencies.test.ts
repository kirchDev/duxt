import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));

// Nuxt loads `content.config.ts` through c12/jiti, from the LAYER's directory —
// so every package this chain imports has to resolve against the layer's own
// `node_modules`, not the consuming site's. Under pnpm's isolated linker that
// means declared in the layer's `package.json`: a package reachable only
// because some other dependency happens to nest it is not resolvable here, and
// a fresh install is where that stops being theoretical.
//
// `cli.ts` is the second such entry and reaches the same way: `bin/duxt.mjs`
// runs out of the installed package and jiti-loads it from there, so a package
// it imports that nobody declared is a command that dies on `pnpm exec duxt`
// in every consumer — and in none of this repository's own runs, where the
// workspace root has it hoisted regardless.
/**
 * The source with its type-only imports taken out.
 *
 * `import type` is erased before anything runs, so the package it names is
 * never resolved and never has to be installed — `modules/redirects.ts` reads
 * a `Nuxt` out of `@nuxt/schema` and would otherwise be reported as needing a
 * dependency on it. Counting those would push packages into `dependencies`
 * that the published layer only ever needs to typecheck against.
 */
const withoutTypeImports = (source: string) =>
  source.replaceAll(/\bimport\s+type\s+[^;]*?\bfrom\s*'[^']+'/g, '');

function chainSpecifiers(entry: string): Map<string, string> {
  const found = new Map<string, string>();
  const seen = new Set<string>();
  const queue = [entry];

  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    const source = withoutTypeImports(readFileSync(file, 'utf8'));
    for (const [, specifier] of source.matchAll(
      /(?:from|import)\s*'([^']+)'/g
    )) {
      if (specifier.startsWith('node:')) continue;
      if (specifier.startsWith('.')) {
        queue.push(join(dirname(file), `${specifier}.ts`));
        continue;
      }
      const segments = specifier.split('/');
      const name = specifier.startsWith('@')
        ? segments.slice(0, 2).join('/')
        : segments[0]!;
      if (!found.has(name)) found.set(name, relative(root, file));
    }
  }

  return found;
}

/** Every file the layer is entered through, from outside the layer. */
const ENTRIES = ['content.config.ts', 'cli.ts'];

it.each(ENTRIES)('declares every package %s imports', (entry) => {
  const manifest = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8')
  ) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  const declared = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {})
  ]);

  const imported = chainSpecifiers(join(root, entry));
  const undeclared = [...imported]
    .filter(([name]) => !declared.has(name))
    .map(([name, file]) => `${name} (imported by ${file})`);

  expect(undeclared).toEqual([]);
});
