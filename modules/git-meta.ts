import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import type { Nuxt } from '@nuxt/schema';

/**
 * "Last updated" and the contributor list, from the git history the file
 * already has.
 *
 * Neither needs config: the `sources` entry names the repository, the ref and
 * the folder, and the page names the file. What it does need is a working tree
 * to ask, and that is the honest limit of this module — Content downloads a
 * remote source as a tarball into `.data/content/`, not as a clone, so a page
 * from another repository has no history to read and gets neither field rather
 * than a guessed one.
 *
 * Hooked on the parse, not on the build, so the answer is cached exactly as
 * long as it is true: Content re-parses a file when its content changes, which
 * is the same moment its last-modified date does.
 */
interface AfterParseContext {
  content?: Record<string, unknown>;
  file?: { path?: string; id?: string };
}

export interface DuxtContributor {
  name: string;
  commits: number;
  username?: string;
}

export default function duxtGitMeta(_options: unknown, nuxt: Nuxt) {
  nuxt.hook(
    'content:file:afterParse' as never,
    ((ctx: AfterParseContext) => {
      const file = ctx.file?.path;
      const content = ctx.content;
      if (!file || !content) return;

      // A downloaded source is not a checkout. Asking git about it either fails
      // or, worse, answers about the SITE's repository instead of the page's.
      if (file.includes('/.data/content/')) return;

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
