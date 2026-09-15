import { isInside } from './version-paths';

/**
 * Resolve a documentation path as the reader will see it.
 *
 * Markdown paths normally belong to the source that contains them. `~/` is the
 * explicit escape hatch: it starts at the website root so one source can name
 * a page served by another source without hard-coding its own prefix.
 */
export function resolveDocumentationPath(path: string, prefix: string): string {
  if (path.startsWith('~/')) return path.slice(1);

  return prefix && !isInside(path, prefix) ? `${prefix}${path}` : path;
}
