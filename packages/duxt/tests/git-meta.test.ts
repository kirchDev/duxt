import { describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { contributorsOf, githubUsername } from '../build/git/git-contributors';
import gitMeta, { parseGitLog } from '../modules/git-meta';
import { repositoryRoot } from '../build/sources/repository-root';

it.each(['missing', 'shallow'])(
  'warns rather than failing a build with %s history',
  async (kind) => {
    const root = mkdtempSync(join(tmpdir(), 'duxt-history-test-'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      mkdirSync(join(root, 'docs'));
      writeFileSync(join(root, 'docs/index.md'), '# History\n');
      writeFileSync(
        join(root, 'app.config.ts'),
        `export default defineAppConfig({ duxt: { sources: [{ path: ${JSON.stringify(relative(repositoryRoot(), join(root, 'docs')))} }] } })`
      );
      if (kind === 'missing') mkdirSync(join(root, '.git'));
      else {
        const git = (...args: string[]) => {
          const result = spawnSync(
            'git',
            [
              '-c',
              'core.hooksPath=/dev/null',
              '-c',
              'commit.gpgsign=false',
              '-c',
              'user.name=Fixture',
              '-c',
              'user.email=fixture@example.com',
              ...args
            ],
            { cwd: root, encoding: 'utf8' }
          );
          expect(result.status, result.stderr).toBe(0);
          return result.stdout.trim();
        };
        git('init', '--quiet');
        git('add', '.');
        git('commit', '--quiet', '-m', 'docs: history fixture');
        writeFileSync(
          join(root, '.git/shallow'),
          `${git('rev-parse', 'HEAD')}\n`
        );
      }
      const hooks = new Map<string, () => unknown>();
      gitMeta(undefined, {
        options: { rootDir: root, _layers: [{ config: { rootDir: root } }] },
        hook: (name: string, handler: () => unknown) => hooks.set(name, handler)
      } as never);
      await expect(
        Promise.resolve().then(() => hooks.get('build:before')!())
      ).resolves.not.toThrow();
      expect(warn.mock.calls.flat().join(' ')).toMatch(
        kind === 'shallow' ? /history.*shallow/ : /history.*checkout/
      );
      expect(warn.mock.calls.flat().join(' ')).toContain('history: false');
    } finally {
      warn.mockRestore();
      rmSync(root, { recursive: true, force: true });
    }
  }
);

describe('githubUsername', () => {
  it('reads a username out of a numbered noreply address', () => {
    expect(githubUsername('1234567+octocat@users.noreply.github.com')).toBe(
      'octocat'
    );
  });

  it('reads one out of the older, unnumbered form', () => {
    expect(githubUsername('octocat@users.noreply.github.com')).toBe('octocat');
  });

  it('gives nothing for a real address', () => {
    // A name and no avatar is the truth; a guessed avatar is not.
    expect(githubUsername('titus.kirch@kirch.dev')).toBeUndefined();
  });
});

describe('contributorsOf', () => {
  it('counts by email, not by name', () => {
    // The same person commits under several names over the years.
    const people = contributorsOf([
      { date: '', name: 'Titus Kirch', email: 'a@b.c' },
      { date: '', name: 'titus', email: 'A@B.C' }
    ]);

    expect(people).toHaveLength(1);
    expect(people[0]).toMatchObject({ name: 'Titus Kirch', commits: 2 });
  });

  it('puts the most frequent contributor first', () => {
    const people = contributorsOf([
      { date: '', name: 'One', email: 'one@x' },
      { date: '', name: 'Two', email: 'two@x' },
      { date: '', name: 'Two', email: 'two@x' }
    ]);

    expect(people.map((person) => person.name)).toEqual(['Two', 'One']);
  });
});

/**
 * The log as `git log --format=$'\x01%aI%x1f%an%x1f%ae' --name-status -M -z`
 * actually writes it: a NUL after the header, a newline before the first
 * status, and every field NUL-terminated.
 */
function log(
  ...commits: { date: string; email: string; changes: string[] }[]
): string {
  return commits
    .map(
      (commit) =>
        `\u0001${commit.date}\u001fA Name\u001f${commit.email}\u0000\n` +
        commit.changes.map((change) => `${change}\u0000`).join('')
    )
    .join('');
}

describe('parseGitLog', () => {
  it('indexes every path a commit touched', () => {
    const history = parseGitLog(
      log(
        { date: '2026-01-02', email: 'a@b.c', changes: ['M', 'docs/one.md'] },
        {
          date: '2026-01-01',
          email: 'a@b.c',
          changes: ['A', 'docs/one.md', 'A', 'docs/two.md']
        }
      )
    );

    expect(history.get('docs/one.md')).toHaveLength(2);
    expect(history.get('docs/two.md')).toHaveLength(1);
  });

  it('puts the newest commit first, as the log itself is ordered', () => {
    const history = parseGitLog(
      log(
        { date: '2026-01-02', email: 'a@b.c', changes: ['M', 'docs/one.md'] },
        { date: '2026-01-01', email: 'a@b.c', changes: ['A', 'docs/one.md'] }
      )
    );

    expect(history.get('docs/one.md')?.[0]?.date).toBe('2026-01-02');
  });

  it('carries a renamed file its history under the former name', () => {
    // What `--follow` did per file, and the reason the per-file call could go.
    const history = parseGitLog(
      log(
        { date: '2026-01-03', email: 'a@b.c', changes: ['M', 'docs/new.md'] },
        {
          date: '2026-01-02',
          email: 'a@b.c',
          changes: ['R100', 'docs/old.md', 'docs/new.md']
        },
        { date: '2026-01-01', email: 'a@b.c', changes: ['A', 'docs/old.md'] }
      )
    );

    expect(history.get('docs/new.md')).toHaveLength(3);
    expect(history.get('docs/old.md')).toBeUndefined();
  });

  it('follows a file renamed twice, which --follow could not', () => {
    const history = parseGitLog(
      log(
        {
          date: '2026-01-03',
          email: 'a@b.c',
          changes: ['R100', 'docs/b.md', 'docs/c.md']
        },
        {
          date: '2026-01-02',
          email: 'a@b.c',
          changes: ['R100', 'docs/a.md', 'docs/b.md']
        },
        { date: '2026-01-01', email: 'a@b.c', changes: ['A', 'docs/a.md'] }
      )
    );

    expect(history.get('docs/c.md')).toHaveLength(3);
  });

  it('leaves a copied file its own history', () => {
    // C is not R: the original stays where it is and keeps what it earned.
    const history = parseGitLog(
      log(
        {
          date: '2026-01-02',
          email: 'a@b.c',
          changes: ['C100', 'docs/one.md', 'docs/copy.md']
        },
        { date: '2026-01-01', email: 'a@b.c', changes: ['A', 'docs/one.md'] }
      )
    );

    expect(history.get('docs/copy.md')).toHaveLength(1);
    expect(history.get('docs/one.md')).toHaveLength(1);
  });

  it('gives an empty index for an empty log', () => {
    expect(parseGitLog('').size).toBe(0);
  });
});
