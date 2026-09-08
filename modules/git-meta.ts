import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Nuxt } from '@nuxt/schema';
import { readDuxtBuildConfig } from '../duxt-app-config';
import { duxtManifest, duxtSectionTypes } from '../sections-resolve';
import { resolveLatestRefs } from '../sources-git';

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

  const wanted = new Map(
    sources.map((source) => [source.collection, source.history])
  );

  nuxt.hook(
    'content:file:afterParse' as never,
    ((ctx: AfterParseContext) => {
      const file = ctx.file?.path;
      const content = ctx.content;
      if (!file || !content) return;

      // A source that has not asked for its history is left alone — for a
      // downloaded one that would otherwise answer out of a single-commit
      // clone, which is wrong data rather than missing data.
      if (!wanted.get(ctx.collection?.name ?? '')) return;

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

function gitLog(file: string): Commit[] {
  try {
    const output = execFileSync(
      'git',
      [
        '-C',
        dirname(file),
        'log',
        '--follow',
        '--format=%aI%x1f%an%x1f%ae',
        '--',
        file
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );

    return output
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [date, name, email] = line.split(SEPARATOR);
        return { date: date ?? '', name: name ?? '', email: email ?? '' };
      });
  } catch {
    // Not a checkout, no git, or a file git has never seen. All three mean the
    // same thing here: nothing to show, which is not an error.
    return [];
  }
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
