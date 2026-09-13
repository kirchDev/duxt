/**
 * Which source serves a path, and how to move a path between versions.
 *
 * Pure functions, deliberately: every version bug this layer has had came from
 * prefix arithmetic done inline in a component, where it could only be checked
 * by clicking. `/workflows/v0.7.0` starts with `/workflows` as well, so taking
 * the *first* matching prefix said "main" while reading the tag — and swapping
 * versions then appended instead of replacing, turning /workflows/v0.7.0 into
 * /workflows/v0.7.0/v0.7.0 on every click.
 */

/** The source whose prefix the path is inside. Longest prefix wins. */
export function sourceForPath<T extends { prefix: string }>(
  path: string,
  sources: T[]
): T | undefined {
  return (
    [...sources]
      .sort((a, b) => b.prefix.length - a.prefix.length)
      .find((source) => !source.prefix || isInside(path, source.prefix)) ??
    sources.find((source) => !source.prefix)
  );
}

/**
 * Is `path` inside `prefix`?
 *
 * Segment-aware: `/workflows-old` is not inside `/workflows`, though it starts
 * with it.
 */
export function isInside(path: string, prefix: string): boolean {
  if (!prefix) return true;

  return path === prefix || path.startsWith(`${prefix}/`);
}

/**
 * The same page in another version.
 *
 * Strips the current version's prefix and applies the target's, so a page keeps
 * its place instead of dropping the reader at the version's root.
 */
export function versionPath(
  path: string,
  from: string | undefined,
  to: string,
  overview = false
): string {
  if (overview) return to || '/';

  const rest =
    from && from !== '/' && isInside(path, from)
      ? path.slice(from.length)
      : path;
  const target = to === '/' ? '' : to;

  return `${target}${rest}` || '/';
}

/**
 * Where the switcher sends a reader who picks another version.
 *
 * The same page in that version, as `versionPath` answers — unless that page is
 * one the target never published. A release page is the case this exists for:
 * every version publishes its own changelog, and an older one has no page for
 * a release cut after it. `missing` holds the target paths known not to exist,
 * and such a pick lands at the target's own root — the changelog overview of
 * that version — rather than at a 404.
 */
export function versionSwitchPath(
  path: string,
  from: string | undefined,
  to: string,
  missing: ReadonlySet<string>
): string {
  const target = versionPath(path, from, to);

  return missing.has(target) ? to || '/' : target;
}

/**
 * Re-exported so the app can auto-import it.
 *
 * The function itself lives beside the resolver, because that is where the
 * semver comparison it uses lives and where its tests are. `app/utils` is what
 * Nuxt scans for auto-imports, and `sources-resolve.ts` is plain logic with no
 * Node imports — the same property that lets `app.config.ts` read it.
 */
export { versionRelation } from '../../sources-resolve';
