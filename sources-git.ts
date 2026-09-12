import { execFileSync } from 'node:child_process';
import type {
  DuxtRef,
  DuxtSource,
  DuxtSourceReleases
} from './sources-resolve';
import {
  compareVersionTags,
  expandSources,
  isLatestRef,
  newestTag,
  refIsTag,
  refName,
  repoUrl
} from './sources-resolve';

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
const cache = new Map<string, RepoTags>();

/**
 * What one repository's tags came back as.
 *
 * A `git` that could not run and a repository that has never been tagged both
 * leave an empty list, and only the second is a configuration mistake. Keeping
 * the failure beside the list is what lets the callers below say which one
 * happened instead of telling a maintainer to fix a source that is fine.
 */
interface RepoTags {
  tags: string[];
  /** Git's own reason, where the command failed outright. */
  failure?: string;
}

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

/**
 * The URL a remote's tags are read from, refused unless it is one we will run.
 *
 * Separate from the command below, and called OUTSIDE its try: refusing a URL
 * is this layer's own decision about a value a maintainer wrote, not git
 * failing to read it, so it must reach the build as itself.
 */
function remoteUrl(repo: string): string {
  const url = repoUrl(repo);

  if (!REMOTE_URL.test(url)) {
    throw new Error(`duxt: refusing to read tags from ${JSON.stringify(url)}`);
  }

  return url;
}

/** Git's own account of why it failed, as one line. */
function gitFailure(error: unknown): string {
  const stderr = (error as { stderr?: unknown }).stderr;
  const text =
    typeof stderr === 'string'
      ? stderr
      : Buffer.isBuffer(stderr)
        ? stderr.toString('utf8')
        : error instanceof Error
          ? error.message
          : String(error);

  return (
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1) ?? 'git produced no output'
  );
}

function tagsOf(repo: string | undefined): RepoTags {
  const key = repo ?? '.';
  const cached = cache.get(key);
  if (cached) return cached;

  // Before the try, so a refused URL is never dressed up as a git failure.
  const url = repo ? remoteUrl(repo) : undefined;

  let found: RepoTags;

  try {
    const output = execFileSync(
      'git',
      url
        ? // `--end-of-options` so a URL that survived the test above is still
          // read as a URL and never as an option.
          ['ls-remote', '--tags', '--refs', '--end-of-options', url]
        : ['tag', '--list'],
      // stderr is piped rather than dropped: it is the only place git says WHY
      // it could not answer, and that reason is what the errors below carry.
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );

    found = {
      tags: output
        .split('\n')
        .map((line) => line.trim().split(/\s+/).pop() ?? '')
        .map((ref) => ref.replace(/^refs\/tags\//, ''))
        .filter(Boolean)
    };
  } catch (error) {
    // Reported by the caller, which knows which source asked.
    found = { tags: [], failure: gitFailure(error) };
  }

  cache.set(key, found);
  return found;
}

/**
 * The tags a source publishes from, or an error naming git as the reason there
 * are none.
 *
 * `what` is the caller's own words for the thing that asked — the `latest`
 * shorthand or a release selection — so an unreachable remote reads as an
 * unreachable remote in both, and neither sends a maintainer to edit a source
 * that was never wrong.
 */
function tagsFor(source: DuxtSource, what: string): string[] {
  const found = tagsOf(source.repo);

  if (found.failure) {
    throw new Error(
      `duxt: ${what} on ${source.repo ?? 'this repository'} could not read ` +
        `its tags — git failed: ${found.failure}`
    );
  }

  return found.tags;
}

interface ParsedTag {
  major: number;
  minor: number;
  prerelease: boolean;
}

function parseTag(tag: string): ParsedTag | undefined {
  const match = /^v?(\d+)\.(\d+)\.\d+(?:-(.+))?$/.exec(tag.trim());
  if (!match) return undefined;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    prerelease: Boolean(match[3])
  };
}

/** Tags selected by a source's explicit release policy, newest first. */
function releaseTags(tags: string[], releases: DuxtSourceReleases): string[] {
  const parsed = tags
    .map((tag) => ({ tag, version: parseTag(tag) }))
    .filter(
      (entry): entry is { tag: string; version: ParsedTag } =>
        Boolean(entry.version) &&
        (releases.prereleases || !entry.version!.prerelease)
    )
    .sort((left, right) => compareVersionTags(left.tag, right.tag));

  if (releases.select === 'all') return parsed.map((entry) => entry.tag);

  const selected = new Set<string>();
  const result: string[] = [];
  for (const entry of parsed) {
    const line =
      releases.select === 'major'
        ? String(entry.version.major)
        : `${entry.version.major}.${entry.version.minor}`;
    if (selected.has(line)) continue;
    selected.add(line);
    result.push(entry.tag);
  }
  return result;
}

/**
 * Add release-discovered tags to explicit refs without giving discovery control
 * over a tag a maintainer has written out by hand.
 */
function resolveReleaseRefs(source: DuxtSource): DuxtSource {
  if (!source.releases) return source;

  const tags = releaseTags(
    tagsFor(source, `releases selection "${source.releases.select}"`),
    source.releases
  );
  if (!tags.length) {
    throw new Error(
      `duxt: releases selection "${source.releases.select}" on ` +
        `${source.repo ?? 'this repository'} found no SemVer tags to publish.`
    );
  }

  // Keep the newest selected stable tag first. `resolveSources` already makes
  // the first ref the default and lets sourceOptions.defaultRef replace that
  // fallback; marking it explicit would make discovery outrank that option.
  const refs: DuxtRef[] = tags.map((tag) => ({ tag }));
  const indexByTag = new Map(tags.map((tag, index) => [tag, index]));

  for (const ref of source.refs ?? []) {
    if (refIsTag(ref)) {
      const index = indexByTag.get(refName(ref));
      if (index !== undefined) {
        refs[index] = ref;
        continue;
      }
    }
    refs.push(ref);
  }

  return { ...source, refs };
}

/**
 * The source list with every `latest` replaced by a concrete tag.
 *
 * Called before `resolveSources` by both build-time entry points, so the
 * resolver itself stays pure and testable — it never learns that git exists.
 */
export function resolveLatestRefs(sources: DuxtSource[]): DuxtSource[] {
  // Reject local refs before a missing tag can hide the configuration error.
  const discovered = sources.map(resolveReleaseRefs);
  expandSources(discovered);
  return discovered.map((source) => {
    if (!source.refs?.some(isLatestRef)) return source;

    const newest = newestTag(tagsFor(source, "refs: ['latest']"));

    if (!newest) {
      throw new Error(
        `duxt: refs: ['latest'] on ${source.repo ?? 'this repository'} found ` +
          'no tags to choose from. Name a tag explicitly, or drop the entry.'
      );
    }

    return {
      ...source,
      refs: source.refs.flatMap((ref) => {
        if (isLatestRef(ref)) {
          return {
            tag: newest,
            // The resolved tag is the switcher's normal label: `latest` says
            // how the source was selected, not which release a reader sees.
            // A caller may still deliberately supply a custom label.
            label: typeof ref === 'object' ? ref.label : undefined,
            // `latest` stops being distinguishable from an ordinary tag after
            // resolution, so settle its source-level default while that fact
            // still exists. An explicit ref or all-refs source status wins.
            status:
              (typeof ref === 'object' ? ref.status : undefined) ??
              source.status ??
              source.statusDefaults?.latest,
            locales: typeof ref === 'object' ? ref.locales : undefined,
            default: typeof ref === 'object' ? ref.default : undefined
          };
        }

        // Keep an older release ready in the declaration, without serving the
        // current release twice. Once a newer tag exists this condition stops
        // matching and the retained release becomes its own edition.
        if (refIsTag(ref) && refName(ref) === newest) return [];

        return ref;
      })
    };
  });
}
