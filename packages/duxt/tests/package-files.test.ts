import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Does the published tarball carry every module the layer imports?
 *
 * `package.json` carries a `files` allowlist rather than an ignore list, because
 * the package directory also holds what must never ship — its tests and the
 * scripts that build the devtools previews. An allowlist is the safe default
 * and has one failure mode: a new module is written where no entry covers it,
 * imported from `app/` or `modules/`, and nobody adds the line. Nothing else
 * notices. `apps/www` consumes the layer from the workspace, where every file
 * is present regardless, and a missing entry surfaces only once a consumer
 * installs the package and Nuxt fails to resolve the import.
 *
 * `tfplugindocs.ts` shipped exactly that way, back when the layer was the
 * repository root. So the allowlist is checked against the imports themselves
 * rather than maintained by memory: walk what the tarball would contain, follow
 * every relative import, and require that an entry covers it — and that it
 * stays inside the package, since a published file cannot reach one level up.
 */
const root = fileURLToPath(new URL('..', import.meta.url));

interface Manifest {
  files: string[];
}

const manifest = JSON.parse(
  readFileSync(join(root, 'package.json'), 'utf8')
) as Manifest;

/** The extensions a relative import may omit, in the order a bundler tries. */
const CANDIDATES = ['', '.ts', '.vue', '.mjs', '.js', '/index.ts'];

/** The files worth reading for imports — code, not the assets beside it. */
const CODE = /\.(ts|vue|mjs|js)$/;

function walk(entry: string, found: string[]): void {
  const absolute = join(root, entry);

  let stats;
  try {
    stats = statSync(absolute);
  } catch {
    return;
  }

  if (stats.isFile()) {
    if (CODE.test(entry)) found.push(entry);
    return;
  }

  for (const child of readdirSync(absolute)) {
    walk(join(entry, child), found);
  }
}

const shipped: string[] = [];
for (const entry of manifest.files) walk(entry, shipped);

/**
 * Every relative specifier in one file.
 *
 * A regex rather than a parser because the question is which paths the file
 * names, not what it does with them — and `.vue` single-file components would
 * need a second parser anyway.
 */
function specifiers(source: string): string[] {
  const found: string[] = [];

  for (const pattern of [
    /\bfrom\s*['"](\.[^'"]+)['"]/g,
    /\bimport\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g,
    /\bimport\s+['"](\.[^'"]+)['"]/g
  ]) {
    for (const [, specifier] of source.matchAll(pattern))
      found.push(specifier!);
  }

  return found;
}

/** The package-relative file a specifier resolves to, or null if none exists. */
function resolveImport(from: string, specifier: string): string | null {
  const base = resolve(dirname(join(root, from)), specifier);

  for (const suffix of CANDIDATES) {
    const candidate = `${base}${suffix}`;
    try {
      if (statSync(candidate).isFile()) return relative(root, candidate);
    } catch {
      continue;
    }
  }

  return null;
}

/** Is `target` one of the allowlist's entries, or inside one? */
const covered = (target: string) =>
  manifest.files.some(
    (entry) => target === entry || target.startsWith(`${entry}${sep}`)
  );

describe('the published file allowlist', () => {
  it('covers every module the shipped code imports', () => {
    const missing = new Set<string>();

    for (const file of shipped) {
      const source = readFileSync(join(root, file), 'utf8');

      for (const specifier of specifiers(source)) {
        const target = resolveImport(file, specifier);
        if (!target) continue;
        if (target.startsWith(`..${sep}`)) {
          missing.add(`${target} (outside the package, imported by ${file})`);
          continue;
        }
        if (!covered(target)) missing.add(`${target} (imported by ${file})`);
      }
    }

    expect([...missing].sort()).toEqual([]);
  });

  it('walks a tarball that actually has files in it', () => {
    // Guards the check above against silently passing on an empty walk — a
    // renamed directory would otherwise make it green by finding nothing.
    expect(shipped.length).toBeGreaterThan(50);
  });
});
