import { execFileSync } from 'node:child_process';
import { dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Nuxt } from '@nuxt/schema';
import type { DuxtContributor } from '../build/git/git-contributors';
import { contributorsOf } from '../build/git/git-contributors';
import { readDuxtBuildConfig } from '../build/config/duxt-app-config';
import {
  duxtManifest,
  duxtSectionTypes
} from '../build/sections/sections-resolve';
import { resolveLatestRefs } from '../build/sources/sources-git';
import {
  expandSources,
  resolveSources
} from '../build/sources/sources-resolve';
import { repositoryRoot } from '../build/sources/repository-root';
import {
  sourceHistoryProblem,
  sourceHistoryProblems
} from '../build/git/source-history';
import type { HistorySource } from '../build/git/source-history';
import { normaliseTfplugindocsPage } from '../build/sources/tfplugindocs';

/**
 * "Last updated" and the contributor list, from the git history the file
 * already has.
 *
 * Neither needs config: the `sources` entry names the repository, the ref and
 * the folder, and the page names the file.
 *
 * A REMOTE source needs one thing more. Content clones it, but with
 * `--depth 1`: the checkout on disk holds a single commit, so every file in it
 * looks as if it were written by whoever cut the tip. That is wrong data, not
 * missing data, and worse than nothing — so a remote source is read only when
 * it says `history: true`, and the clone is unshallowed once before it is.
 * Local sources read history by default, unless they set `history: false`.
 * Builds warn when that history is missing or shallow; packs refuse to publish.
 *
 * Hooked on the parse, not on the build, so the answer is cached exactly as
 * long as it is true: Content re-parses a file when its content changes, which
 * is the same moment its last-modified date does.
 */
interface AfterParseContext {
  collection?: { name?: string };
  content?: Record<string, unknown>;
  file?: { path?: string; id?: string };
}

export type { DuxtContributor };

export default function duxtGitMeta(_options: unknown, nuxt: Nuxt) {
  const { config, declared, histories } = historyConfig(nuxt);
  const sources = duxtManifest(
    declared,
    config?.sourceOptions ?? {},
    duxtSectionTypes(config?.sectionTypes)
  );
  const sourceByCollection = new Map(
    sources.map((source) => [source.collection, source])
  );

  const checked = new Map<string, boolean>();
  const warned = new Set<string>();
  const warn = (problem: string) => {
    if (warned.has(problem)) return;
    warned.add(problem);
    console.warn(
      `[duxt] history: ${problem}. Supply full Git history or set history: false on that source.`
    );
  };
  nuxt.hook('build:before', () => {
    for (const problem of historyProblems(nuxt, histories)) warn(problem);
  });

  nuxt.hook(
    'content:file:afterParse' as never,
    ((ctx: AfterParseContext) => {
      const file = ctx.file?.path;
      const content = ctx.content;
      if (!file || !content) return;

      const source = sourceByCollection.get(ctx.collection?.name ?? '');
      if (!source) return;

      // Source flavours alter metadata only. Their Markdown remains portable to
      // the generator's own publisher, so the body is never rewritten here.
      if (source.flavor === 'tfplugindocs') {
        normaliseTfplugindocsPage(content, ctx.file?.id ?? file);
      }

      // A source that has not asked for its history is left alone — for a
      // downloaded one that would otherwise answer out of a single-commit
      // clone, which is wrong data rather than missing data.
      if (!source.history) return;

      const root = rootOf(dirname(file)) ?? dirname(file);
      if (!checked.has(root)) {
        const remote =
          histories.find((entry) => entry.collection === source.collection)
            ?.remote ?? false;
        const problem = sourceHistoryProblem(dirname(file), remote);
        checked.set(root, !problem);
        if (problem) warn(`${source.collection}: ${problem}`);
      }
      if (!checked.get(root)) return;

      const log = gitLog(file);
      if (!log.length) return;

      content.lastUpdated ??= log[0]!.date;
      content.contributors ??= contributorsOf(log);
    }) as never
  );
}

function historyConfig(nuxt: Nuxt) {
  const layerDir = fileURLToPath(new URL('..', import.meta.url));

  const dirs = [
    ...nuxt.options._layers.flatMap((entry) => [
      entry.config.rootDir,
      entry.config.srcDir
    ]),
    layerDir
  ].filter(Boolean) as string[];

  const config = readDuxtBuildConfig(dirs);
  const declared = resolveLatestRefs(config?.sources ?? [{ path: 'docs' }]);
  const options = config?.sourceOptions ?? {};
  const expanded = expandSources(declared, options);
  const histories: HistorySource[] = resolveSources(declared, options).flatMap(
    (source, index) => {
      const input = expanded[index]!;
      return source.history && input.source.content !== false
        ? [{ ...source, remote: Boolean(input.effective.repo) }]
        : [];
    }
  );
  return { config, declared, histories };
}

function historyProblems(nuxt: Nuxt, histories: HistorySource[]) {
  const remoteRoot =
    (nuxt.options.content as { _remoteSourceRootDir?: string } | undefined)
      ?._remoteSourceRootDir ?? nuxt.options.rootDir;
  return sourceHistoryProblems(histories, repositoryRoot(), remoteRoot);
}

/** Packs fail before publication even if Content reused every parsed row. */
export function assertDuxtHistory(nuxt: Nuxt) {
  const problems = historyProblems(nuxt, historyConfig(nuxt).histories);
  if (problems.length)
    throw new Error(
      `duxt: content pack requires complete source history:\n  - ${problems.join('\n  - ')}\nSupply full Git history or set history: false on those sources.`
    );
}

interface Commit {
  date: string;
  name: string;
  email: string;
}

/**
 * The unit separator, not a comma or a pipe.
 *
 * A commit message is free text and an author name may contain anything a
 * person is called; the one byte that cannot appear in either is one git will
 * emit for us with `%x1f`.
 */
const SEPARATOR = '\u001f';

/**
 * The record separator, marking where one commit's header begins.
 *
 * `--name-status -z` already ends every path with NUL, so the header needs a
 * byte of its own to be told apart from one — and `%x01` is a byte no path and
 * no author name can contain.
 */
const RECORD = '\u0001';

/** What `-z` writes between the fields `--name-status` emits. */
const NUL = '\0';

/**
 * ONE `git log` PER REPOSITORY, NOT ONE PER PAGE.
 *
 * This used to run `git log --follow` against each file as it was parsed. It
 * was correct, and it cost 40 of the 55 seconds a cold content build took. The
 * work is not the history — this repository's entire log reads in 70ms — it is
 * spawning six hundred processes, which on a Linux that is really a virtual
 * machine costs about 50ms each no matter how little the process then does.
 *
 * So the log is read once, whole, and indexed by path. Every page after the
 * first is a map lookup.
 *
 * `--follow` is what that gives up, and it is bought back rather than dropped:
 * `--name-status -M` reports a rename as `R100 <old> <new>`, so walking the log
 * newest-first and remembering that `<old>` is now `<new>` lets a file keep the
 * commits it earned under its former name. It is in fact the wider answer —
 * git's own documentation calls `--follow` a single-file heuristic, and a file
 * renamed twice defeats it.
 */
export function parseGitLog(output: string): Map<string, Commit[]> {
  const history = new Map<string, Commit[]>();

  /**
   * Where a path that no longer exists lives today.
   *
   * Filled walking backwards through time, so by the moment an older commit
   * names `docs/old.md` the rename that made it `docs/new.md` has already been
   * read, and the commit lands on the file the site actually serves.
   */
  const renamedTo = new Map<string, string>();
  const today = (path: string) => renamedTo.get(path) ?? path;

  for (const record of output.split(RECORD)) {
    if (!record) continue;

    const header = record.indexOf(NUL);
    if (header === -1) continue;

    const [date, name, email] = record.slice(0, header).split(SEPARATOR);
    const commit: Commit = {
      date: date ?? '',
      name: name ?? '',
      email: email ?? ''
    };

    // The newline git writes after the header belongs to the first token, not
    // to a path — so every token is trimmed rather than the string patched.
    const tokens = record
      .slice(header + 1)
      .split(NUL)
      .map((token) => token.trim())
      .filter(Boolean);

    for (let index = 0; index < tokens.length;) {
      const status = tokens[index]!;

      // A status is a letter and an optional similarity score. Anything else
      // means the walk has lost its place, and the rest of this commit is not
      // worth guessing at.
      if (!/^[A-Z]\d*$/.test(status)) break;

      // R and C carry two paths; every other status carries one.
      const pair = status.startsWith('R') || status.startsWith('C');
      const from = tokens[index + 1];
      const to = pair ? tokens[index + 2] : from;
      index += pair ? 3 : 2;

      if (!to) break;

      const path = today(to);
      const commits = history.get(path);

      if (commits) commits.push(commit);
      else history.set(path, [commit]);

      // Only a rename carries a name forward. A copy leaves the original where
      // it was, and that file's history stays its own.
      if (pair && status.startsWith('R') && from) renamedTo.set(from, path);
    }
  }

  return history;
}

/** One index per repository, built the first time a page asks for it. */
const histories = new Map<string, Map<string, Commit[]>>();

function historyOf(root: string): Map<string, Commit[]> {
  const cached = histories.get(root);
  if (cached) return cached;

  let history: Map<string, Commit[]>;

  try {
    history = parseGitLog(
      execFileSync(
        'git',
        [
          '-C',
          root,
          'log',
          `--format=${RECORD}%aI%x1f%an%x1f%ae`,
          '--name-status',
          '-M',
          '-z'
        ],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          // A documentation repository's whole log against execFileSync's
          // 1 MB default is a truncated history reported as a git failure.
          maxBuffer: Number.POSITIVE_INFINITY
        }
      )
    );
  } catch {
    // Not a checkout, no git, or a history that cannot be read. All three mean
    // the same thing here: nothing to show, which is not an error.
    history = new Map();
  }

  histories.set(root, history);
  return history;
}

/** The repository a directory belongs to, asked once per directory. */
const roots = new Map<string, string | undefined>();

function rootOf(dir: string): string | undefined {
  if (roots.has(dir)) return roots.get(dir);

  let root: string | undefined;

  try {
    root =
      execFileSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim() || undefined;
  } catch {
    root = undefined;
  }

  roots.set(dir, root);
  return root;
}

function gitLog(file: string): Commit[] {
  const root = rootOf(dirname(file));
  if (!root) return [];

  // git speaks repository-relative paths with forward slashes, whatever the
  // platform's own separator is.
  const path = relative(root, file).split(sep).join('/');

  return historyOf(root).get(path) ?? [];
}
