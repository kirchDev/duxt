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

/**
 * What a repository URL is allowed to look like before it is handed to `git`.
 *
 * An allowlist rather than a check for a leading dash, because the argument
 * reaches a command: `git ls-remote --upload-pack=<anything>` runs that
 * anything, and every value that is not a URL is easier to reject than to
 * reason about. One quantifier over one character class, so the test itself
 * cannot be the next finding.
 */
const REMOTE_URL = /^(?:https?:\/\/|ssh:\/\/|git@)[\w.~:/?#@!$&'()*+,;=%-]+$/;

/** The tags of a remote, or nothing when its URL is not one we will run. */
function remoteTags(repo: string): string {
  const url = repoUrl(repo);

  if (!REMOTE_URL.test(url)) {
    throw new Error(`duxt: refusing to read tags from ${JSON.stringify(url)}`);
  }

  return execFileSync(
    'git',
    // `--end-of-options` so a URL that survived the test above is still read as
    // a URL and never as an option.
    ['ls-remote', '--tags', '--refs', '--end-of-options', url],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  );
}

function tagsOf(repo: string | undefined): string[] {
  const key = repo ?? '.';
  const cached = cache.get(key);
  if (cached) return cached;

  let tags: string[] = [];

  try {
    const output = repo
      ? remoteTags(repo)
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
