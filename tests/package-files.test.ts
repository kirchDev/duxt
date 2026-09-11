import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Does the published tarball carry every root module the layer imports?
 *
 * The repo root IS the layer, so its runtime modules sit beside the meta
 * scripts that must never ship — which is why `package.json` carries a `files`
 * allowlist rather than an ignore list. An allowlist is the safe default and
 * has one failure mode: a new root module is written, imported from `app/` or
 * `modules/`, and nobody adds the line. Nothing else notices. `www/` consumes
 * the layer from the workspace, where every file is present regardless, and a
 * missing entry surfaces only once a consumer installs the package and Nuxt
 * fails to resolve the import.
 *
 * `tfplugindocs.ts` shipped exactly that way. So the allowlist is checked
 * against the imports themselves rather than maintained by memory: walk what
 * the tarball would contain, follow every relative import back to the root,
 * and require the allowlist to name it.
 */
const root = fileURLToPath(new URL('..', import.meta.url));

interface Manifest {
  files: string[];
}

const manifest = JSON.parse(
  readFileSync(join(root, 'package.json'), 'utf8')
) as Manifest;

const allowlist = new Set(manifest.files);

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

/** The repo-relative file a specifier resolves to, or null if none exists. */
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

describe('the published file allowlist', () => {
  it('names every root module the shipped code imports', () => {
    const missing = new Set<string>();

    for (const file of shipped) {
      const source = readFileSync(join(root, file), 'utf8');

      for (const specifier of specifiers(source)) {
        const target = resolveImport(file, specifier);
        if (!target || target.includes(sep)) continue;
        if (!allowlist.has(target))
          missing.add(`${target} (imported by ${file})`);
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
