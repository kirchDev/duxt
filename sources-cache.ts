import { createHash } from 'node:crypto';
import { join, relative, resolve } from 'node:path';
import { readDuxtBuildConfig } from './duxt-app-config';
import { resolveLatestRefs } from './sources-git';
import type { DuxtSource, DuxtSourcesOptions } from './sources-resolve';
import {
  expandSources,
  isLatestRef,
  refIsTag,
  refName,
  repoUrl
} from './sources-resolve';

/**
 * What a CI run may keep of `.data/content`, and under which key.
 *
 * Content downloads every remote source into `.data/content/` and keys the
 * directory by repository AND ref — `github.com-kirchDev-workflows-v0.7.0` is
 * the shape. That directory is a working-copy artefact: it does not survive a
 * runner, so a site reading five refs re-clones all five on every pull request
 * for content that has not moved.
 *
 * Two questions decide whether caching it is safe, and this file answers both
 * as data rather than as prose in a workflow:
 *
 * THE KEY IS THE RESOLVED SOURCE LIST, nothing else. A key over
 * `pnpm-lock.yaml` is wrong in both directions — it moves when no source did,
 * and it stands still when a `latest` tag moves underneath it. So the digest is
 * taken over the (repository, ref) pairs the resolver produced, `latest`
 * already replaced by the tag it means; passing an unresolved one is refused
 * outright rather than hashed, because the resulting key would restore last
 * release's checkout into this release's build.
 *
 * THE CACHE HOLDS PUBLIC SOURCES ONLY. A GitHub Actions cache written on a
 * branch is readable by every pull request against it, forks included, so a
 * private checkout put there is a private repository handed to anyone who can
 * open a pull request. A list with one authenticated remote in it therefore
 * disables the cache entirely — never partially, which would expose the
 * checkout AND still download it.
 *
 * WHAT THIS DOES NOT HAVE TO GUARD IS STALENESS. `downloadGitRepository` in
 * `@nuxt/content` asks the remote for the ref's hash on every build and
 * compares it with the `.content.cache.json` it wrote beside the checkout; a
 * mismatch re-clones. A restored directory whose branch has moved is therefore
 * re-downloaded rather than served, and an unreachable remote fails the build
 * instead of quietly answering from the cache. That is what makes a key over
 * ref NAMES sufficient: it need only be right often enough to be worth having,
 * because being wrong costs a download rather than a wrong page.
 */

/** Where Content puts the downloads, relative to a site's root. */
export const DUXT_CONTENT_CACHE_DIR = '.data/content';

/**
 * Bumped when what lands in `.data/content` changes shape rather than content.
 *
 * A cache entry written by an older layer may hold directories a newer one no
 * longer understands, and a restored one of those is worse than no cache. The
 * marker makes that a miss instead of a puzzle.
 */
const KEY_VERSION = 'v1';

/** The heredoc marker `--github` wraps its one multi-line value in. */
const OUTPUT_DELIMITER = '__DUXT_CACHE__';

/** One repository-and-ref pair Content downloads for the resolved list. */
export interface DuxtRemoteCacheEntry {
  /** The URL Content clones, exactly as `sources.ts` hands it over. */
  url: string;
  /** `tag:<name>`, `branch:<name>`, or `default` for the repository's HEAD. */
  ref: string;
}

export interface DuxtSourcesCacheKey {
  /** Whether `.data/content` may be carried between runs at all. */
  cacheable: boolean;
  /** Why it may not be, in one line fit for a CI log. Absent when it may. */
  reason?: string;
  /** The cache key, or `''` when there is nothing to cache. */
  key: string;
  /** The pairs the key was taken over, sorted. */
  entries: DuxtRemoteCacheEntry[];
  /** The directory the downloads land in, relative to where the command ran. */
  path: string;
  /** `path` and its exclusions, as the glob list a cache action takes. */
  paths: string[];
}

/**
 * The directory a cache action should carry, and the part of it it must not.
 *
 * `contents.sqlite` sits INSIDE `.data/content`, so caching the directory whole
 * carries the parse cache along with the downloads — and the parse cache is the
 * one thing this must not keep. It is the OUTPUT of reading the Markdown rather
 * than an input to it, so a restored one answers for a tree that has since
 * changed: the failure mode is a page that silently does not update, where a
 * missed download costs only a download. The layer's own `enableWriteAheadLog`
 * leaves its two sidecar files beside it, so all three are excluded by name.
 *
 * A `!` glob is `@actions/glob`'s exclusion syntax, which `actions/cache` reads
 * for its `path:` — the reason this is a LIST rather than a directory.
 */
export function duxtSourcesCachePaths(path: string): {
  path: string;
  paths: string[];
} {
  return {
    path,
    paths: [
      path,
      `!${path}/contents.sqlite`,
      `!${path}/contents.sqlite-wal`,
      `!${path}/contents.sqlite-shm`
    ]
  };
}

/**
 * The repositories and refs a resolved source list names, deduplicated.
 *
 * ONE ENTRY PER DOWNLOAD, not per collection: five languages over one tree are
 * ten collections and one clone, because Content keys the checkout by
 * repository and ref and every collection reads the same directory.
 *
 * A source read off disk contributes nothing, `origin` included — `origin`
 * names a repository for the edit links and downloads none of it.
 *
 * Not listed, and deliberately: the `_partials/` collection clones each remote
 * repository once more at its default HEAD. It is a clone of a repository this
 * list already names, so it rides along on the same key; putting a synthetic
 * `default` ref in a list whose purpose is to say which refs were RESOLVED
 * would read as a source nobody declared.
 */
export function duxtRemoteCacheEntries(
  sources: DuxtSource[],
  options: DuxtSourcesOptions = {}
): DuxtRemoteCacheEntry[] {
  const seen = new Map<string, DuxtRemoteCacheEntry>();

  for (const { ref, effective } of expandSources(sources, options)) {
    if (!effective.repo) continue;

    const used = effective.ref ?? ref;

    if (used && isLatestRef(used)) {
      throw new Error(
        'duxt: a cache key cannot be taken over an unresolved `latest` ref — ' +
          'resolve the source list with `resolveLatestRefs` first.'
      );
    }

    const entry: DuxtRemoteCacheEntry = {
      url: repoUrl(effective.repo),
      ref: used
        ? `${refIsTag(used) ? 'tag' : 'branch'}:${refName(used)}`
        : 'default'
    };

    seen.set(`${entry.url} ${entry.ref}`, entry);
  }

  return [...seen.values()].sort(
    (left, right) =>
      left.url.localeCompare(right.url) || left.ref.localeCompare(right.ref)
  );
}

/**
 * A remote whose checkout may sit in a cache every pull request can read.
 *
 * Public means an unauthenticated `https://` clone and nothing else. An SSH
 * remote is authenticated by definition — it is the form that exists to carry a
 * key — and a URL with userinfo carries the credential in the declaration. Both
 * are refused rather than reasoned about: this decides who may read a
 * repository, and a rule with exceptions in it is one nobody can audit.
 *
 * `owner/name`, the shorthand the vast majority of sources are written in,
 * becomes `https://github.com/owner/name` and is public.
 */
function privateRemoteReason(repo: string): string | undefined {
  const named = redactRemote(repo);

  if (!repo.includes('://')) {
    // `git@github.com:owner/name` — scp syntax, which is not a URL at all and
    // would otherwise be pasted onto the GitHub prefix by `repoUrl`.
    return /^[^/]+@/.test(repo)
      ? `remote source ${named} is not a public https:// URL`
      : undefined;
  }

  let url: URL;
  try {
    url = new URL(repo);
  } catch {
    return `remote source ${named} is not a URL this can vouch for`;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return `remote source ${named} is not a public https:// URL`;
  }

  return url.username || url.password
    ? `remote source ${named} carries credentials, so its checkout is not public`
    : undefined;
}

/**
 * A remote named without whatever made it private.
 *
 * The reason is printed into a CI log, which on a public repository is a public
 * artefact — so the one thing it must never repeat is the token that put the
 * source on the wrong side of this rule.
 */
function redactRemote(repo: string): string {
  if (repo.includes('://')) {
    try {
      const url = new URL(repo);
      url.username = '';
      url.password = '';
      return url.toString();
    } catch {
      return repo.replace(/\/\/[^/@]*@/, '//');
    }
  }

  return repo.replace(/^[^/]+@/, '');
}

/**
 * The cache key for a resolved source list, or the reason there is none.
 *
 * Pure, and takes the list a caller has already run through `resolveLatestRefs`
 * — the same split `sources.ts` and `sources-git.ts` keep, so the rule is
 * testable without git and without a network.
 */
export function duxtSourcesCacheKey(
  sources: DuxtSource[],
  options: DuxtSourcesOptions = {}
): DuxtSourcesCacheKey {
  const entries = duxtRemoteCacheEntries(sources, options);
  const where = duxtSourcesCachePaths(DUXT_CONTENT_CACHE_DIR);

  if (!entries.length) {
    return {
      cacheable: false,
      reason:
        'no remote sources — nothing is downloaded, so there is nothing to cache',
      key: '',
      entries,
      ...where
    };
  }

  for (const source of sources) {
    for (const repo of [
      source.repo,
      ...(source.locales ?? []).map((locale) =>
        typeof locale === 'string' ? undefined : locale.repo
      )
    ]) {
      const reason = repo ? privateRemoteReason(repo) : undefined;
      if (reason)
        return { cacheable: false, reason, key: '', entries, ...where };
    }
  }

  // A SPACE AND A NEWLINE are enough to separate the fields unambiguously: git
  // forbids both in a refname outright, and a URL carrying either is not one
  // `repoUrl` would hand to `git`. So no two different lists can hash the same
  // string, and the digest's input stays something a person can print and read.
  const digest = createHash('sha256')
    .update(entries.map((entry) => `${entry.url} ${entry.ref}`).join('\n'))
    .digest('hex');

  return {
    cacheable: true,
    key: `duxt-content-${KEY_VERSION}-${digest}`,
    entries,
    ...where
  };
}

export interface DuxtSourcesCacheOptions {
  /** The site being keyed — where `app.config.ts` and `.data/` live. */
  rootDir?: string;
}

/**
 * The key for a site on disk: read its config, resolve `latest`, hash the rest.
 *
 * The one impure function here, and the only one that needs git — `latest` is a
 * tag the remote has to be asked about, and asking is exactly what makes the
 * key describe what will be downloaded rather than what was written down.
 */
export function duxtSourcesCache(
  options: DuxtSourcesCacheOptions = {}
): DuxtSourcesCacheKey {
  // ABSOLUTE, always. `readDuxtBuildConfig` hands the path to a module loader,
  // which resolves a bare `www/app/app.config.ts` as a PACKAGE specifier and
  // reports a missing module — a site whose config was found reads identically
  // to one whose sources are all local, and the cache silently never fires.
  const rootDir = resolve(options.rootDir ?? process.cwd());
  const config = readDuxtBuildConfig([rootDir, join(rootDir, 'app')]);

  const result = duxtSourcesCacheKey(
    resolveLatestRefs(config?.sources ?? [{ path: 'docs' }]),
    config?.sourceOptions ?? {}
  );

  // Reported relative to where the COMMAND runs, not to the site: a workflow
  // hands this straight to a cache action, whose paths are workspace-relative
  // and whose site usually sits in a subdirectory of it.
  const absolute = join(rootDir, DUXT_CONTENT_CACHE_DIR);
  const here = relative(process.cwd(), absolute);

  return {
    ...result,
    ...duxtSourcesCachePaths(here && !here.startsWith('..') ? here : absolute)
  };
}

/**
 * The command, in the two shapes anyone asks for it.
 *
 * `--github` writes the `name=value` lines a step appends to `$GITHUB_OUTPUT`;
 * bare, it writes what a person needs to see why the key is what it is.
 *
 * ALWAYS EXIT 0. "This site has nothing worth caching" is an answer, not a
 * failure — a repository with no remote sources is an ordinary one, and a job
 * that asked for the key should skip the cache rather than go red.
 */
export function runDuxtSourcesCacheCli(
  argv: string[],
  data: DuxtSourcesCacheKey
): { output: string; exitCode: number } {
  if (argv.includes('--github')) {
    const lines = [
      `cacheable=${data.cacheable}`,
      `path=${data.path}`,
      `key=${data.key}`,
      // `paths` is several lines, and `$GITHUB_OUTPUT` takes a multi-line value
      // only as a heredoc. The delimiter is fixed rather than generated because
      // every value here is a glob this file built out of a filesystem path:
      // none of them can contain a line of its own, let alone this one.
      `paths<<${OUTPUT_DELIMITER}`,
      ...data.paths,
      OUTPUT_DELIMITER
    ];

    if (data.reason) lines.push(`reason=${data.reason}`);

    return { output: lines.join('\n'), exitCode: 0 };
  }

  const lines = data.cacheable
    ? [
        `key    ${data.key}`,
        `path   ${data.path}`,
        ...data.paths
          .filter((glob) => glob.startsWith('!'))
          .map((glob) => `skip   ${glob.slice(1)}`),
        '',
        'Keyed over:'
      ]
    : [`Not cached: ${data.reason}`, '', 'Remote sources:'];

  // REDACTED here too. The `--github` output never carries a URL, but this
  // listing did, verbatim — and a terminal, a pasted log or a screenshot is as
  // public as the CI log `redactRemote` was written for.
  for (const entry of data.entries) {
    lines.push(`  ${redactRemote(entry.url)}  ${entry.ref}`);
  }
  if (!data.entries.length) lines.push('  (none)');

  return { output: lines.join('\n'), exitCode: 0 };
}
