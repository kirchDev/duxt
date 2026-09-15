import { join, resolve } from 'node:path';

/**
 * Resolve a cache entry the tab may delete, or refuse.
 *
 * Its own file, importing nothing but `node:path`, for the same reason
 * `validate-report.ts` is its own file: everything else under `devtools/`
 * reaches the virtual module the build generates, and a guard that cannot be
 * tested without booting Nitro is a guard nobody re-checks. This is the one
 * destructive thing the panel can do, so it is the one part that is proven.
 *
 * The name arrives from a form field, so it is checked rather than trusted: the
 * result has to be a DIRECT child of the cache directory. A traversal, an
 * absolute path, a nested path or an empty name all resolve somewhere else,
 * which is why the comparison is on the resolved parent and never on the string
 * that was submitted.
 */
export function cacheEntryToDrop(
  dataDir: string,
  name: unknown
): string | undefined {
  if (typeof name !== 'string' || !name || name === '.' || name === '..') {
    return undefined;
  }

  const target = resolve(dataDir, name);
  if (resolve(join(target, '..')) !== resolve(dataDir)) return undefined;

  return target;
}
