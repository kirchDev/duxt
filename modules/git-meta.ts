import { execFileSync } from 'node:child_process';
import { dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Nuxt } from '@nuxt/schema';
import { readDuxtBuildConfig } from '../duxt-app-config';
import { duxtManifest, duxtSectionTypes } from '../sections-resolve';
import { resolveLatestRefs } from '../sources-git';
import { normaliseTfplugindocsPage } from '../tfplugindocs';

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
 * A source read off disk is a full checkout already and needs no flag.
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

export interface DuxtContributor {
  name: string;
  commits: number;
  username?: string;
}

export default function duxtGitMeta(_options: unknown, nuxt: Nuxt) {
  const layerDir = fileURLToPath(new URL('..', import.meta.url));

  const dirs = [
    ...nuxt.options._layers.flatMap((entry) => [
      entry.config.rootDir,
      entry.config.srcDir
    ]),
    layerDir
  ].filter(Boolean) as string[];

  const config = readDuxtBuildConfig(dirs);
  const sources = duxtManifest(
    resolveLatestRefs(config?.sources ?? [{ path: 'docs' }]),
    config?.sourceOptions ?? {},
    duxtSectionTypes(config?.sectionTypes)
  );

  const sourceByCollection = new Map(
    sources.map((source) => [source.collection, source])
  );

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

      if (file.includes('/.data/content/')) unshallow(dirname(file));

      const log = gitLog(file);
      if (!log.length) return;

      content.lastUpdated ??= log[0]!.date;
      content.contributors ??= contributorsOf(log);
    }) as never
  );
}

interface Commit {
  date: string;
  name: string;
  email: string;
}

/**
 * Turn a `--depth 1` clone into one with a history, once per repository.
 *
 * Cached by the repository's own root rather than by the directory the file
 * sits in: a fetch per page would download the same history once per page.
 * A failure is silent on purpose — the caller falls back to no history, which
 * is what the page showed before.
 */
const unshallowed = new Set<string>();

function unshallow(dir: string) {
  let root: string;

  try {
    root = execFileSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return;
  }

  if (!root || unshallowed.has(root)) return;
  unshallowed.add(root);

  try {
    const shallow = execFileSync(
      'git',
      ['-C', root, 'rev-parse', '--is-shallow-repository'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();

    if (shallow !== 'true') return;

    execFileSync('git', ['-C', root, 'fetch', '--unshallow', '--quiet'], {
      stdio: 'ignore'
    });
  } catch {
    // No network, no remote, or a repository that cannot be deepened. The
    // page keeps the fields it would have had without this module.
  }
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

/**
 * One entry per person, most commits first.
 *
 * Identity is the email, not the name — the same person commits as "Titus
 * Kirch" and as "titus" and would otherwise appear twice. The GitHub username
 * is read out of a noreply address, which is the only place git actually
 * carries one; without it there is a name and no avatar, which is the truth.
 */
export function contributorsOf(commits: Commit[]): DuxtContributor[] {
  const people = new Map<string, DuxtContributor>();

  for (const commit of commits) {
    const key = commit.email.toLowerCase();
    const existing = people.get(key);

    if (existing) {
      existing.commits += 1;
      continue;
    }

    people.set(key, {
      name: commit.name,
      commits: 1,
      username: githubUsername(commit.email)
    });
  }

  return [...people.values()].sort((a, b) => b.commits - a.commits);
}

/** `1234567+octocat@users.noreply.github.com` becomes `octocat`. */
export function githubUsername(email: string): string | undefined {
  const match = /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i.exec(
    email.trim()
  );

  return match?.[1];
}
