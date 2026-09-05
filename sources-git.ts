import { execFileSync } from 'node:child_process';
import type { DuxtSource } from './sources-resolve';
import { isLatestRef, newestTag, repoUrl } from './sources-resolve';

/**
 * Resolve the `latest` shorthand into the tag it means.
 *
 * Node-only, and separate from `sources-resolve.ts` for the same reason
 * `sources.ts` is: that file is read by the browser half of the layer, and
 * `node:child_process` cannot be bundled for it.
 *
 * Both halves of the build must agree on the answer — `sources.ts` declares the
 * collections, `modules/config.ts` resolves the manifest the theme reads — so
 * the answer is cached per repository for the life of the process. Two calls to
 * `git ls-remote` a second apart could otherwise straddle a release and leave
 * the site with a collection no route points at.
 */
const cache = new Map<string, string[]>();

function tagsOf(repo: string | undefined): string[] {
  const key = repo ?? '.';
  const cached = cache.get(key);
  if (cached) return cached;

  let tags: string[] = [];

  try {
    const output = repo
      ? execFileSync('git', ['ls-remote', '--tags', '--refs', repoUrl(repo)], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        })
      : execFileSync('git', ['tag', '--list'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        });

    tags = output
      .split('\n')
      .map((line) => line.trim().split(/\s+/).pop() ?? '')
      .map((ref) => ref.replace(/^refs\/tags\//, ''))
      .filter(Boolean);
  } catch {
    // Reported by the caller, which knows which source asked.
    tags = [];
  }

  cache.set(key, tags);
  return tags;
}

/**
 * The source list with every `latest` replaced by a concrete tag.
 *
 * Called before `resolveSources` by both build-time entry points, so the
 * resolver itself stays pure and testable — it never learns that git exists.
 */
export function resolveLatestRefs(sources: DuxtSource[]): DuxtSource[] {
  return sources.map((source) => {
    if (!source.refs?.some(isLatestRef)) return source;

    const newest = newestTag(tagsOf(source.repo));

    if (!newest) {
      throw new Error(
        `duxt: refs: ['latest'] on ${source.repo ?? 'this repository'} found ` +
          'no tags to choose from. Name a tag explicitly, or drop the entry.'
      );
    }

    return {
      ...source,
      refs: source.refs.map((ref) =>
        isLatestRef(ref)
          ? {
              tag: newest,
              // The URL keeps saying `latest`, so a bookmark survives the next
              // release; only the ref underneath moves. `label` is what the
              // switcher and the prefix are built from.
              label:
                typeof ref === 'object' ? (ref.label ?? 'latest') : 'latest',
              status: typeof ref === 'object' ? ref.status : undefined
            }
          : ref
      )
    };
  });
}
