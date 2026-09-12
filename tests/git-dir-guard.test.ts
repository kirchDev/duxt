import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  refuseGitDirectory,
  underGitDirectory
} from '../scripts/git-dir-guard.ts';

const roots: string[] = [];

function root(): string {
  const created = mkdtempSync(join(tmpdir(), 'duxt-git-dir-'));
  roots.push(created);
  return created;
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const created of roots.splice(0))
    rmSync(created, { recursive: true, force: true });
});

describe('underGitDirectory', () => {
  it('matches a `.git` path segment at any depth', () => {
    expect(underGitDirectory('/repo/.git')).toBe(true);
    expect(underGitDirectory('/repo/.git/worktrees/feature')).toBe(true);
    expect(underGitDirectory('/repo/.git/tituskirch-skills/work/87/www')).toBe(
      true
    );
  });

  it('does not match a segment that merely starts with `.git`', () => {
    // Both upstream patterns are whole-segment too — nitro's regex wants a
    // separator straight after `.git`, Vite's glob is `**/.git/**` — so a
    // looser rule here would refuse builds that work.
    expect(underGitDirectory('/repo/.github/workflows')).toBe(false);
    expect(underGitDirectory('/repo/.gitignore')).toBe(false);
    expect(underGitDirectory('/srv/my.git/checkout')).toBe(false);
    expect(underGitDirectory('/repo/.git-credentials/x')).toBe(false);
  });

  it('reads an ordinary checkout and an agent worktree beside it as clean', () => {
    expect(underGitDirectory('/repo')).toBe(false);
    expect(underGitDirectory('/repo/.claude/worktrees/agent-1')).toBe(false);
  });
});

describe('refuseGitDirectory', () => {
  it('passes a directory that is not under a `.git` directory', () => {
    expect(() => refuseGitDirectory(root(), 'build')).not.toThrow();
  });

  it('refuses one that is, naming the command and the path', () => {
    const base = root();
    const work = join(base, '.git', 'worktrees', 'issue-87');
    mkdirSync(work, { recursive: true });

    expect(() => refuseGitDirectory(work, 'build')).toThrowError(
      /Cannot run build from inside a \.git directory/
    );
    expect(() => refuseGitDirectory(work, 'build')).toThrowError(/issue-87/);
  });

  it('names the failure it is standing in for, not just the rule', () => {
    // The whole point is that the later failure is unrecognisable: three runs
    // met `defineMcpTool is not defined` and two concluded the branch was
    // broken. The message has to carry the symptom someone would search for.
    const base = root();
    const work = join(base, '.git', 'w');
    mkdirSync(work, { recursive: true });

    expect(() => refuseGitDirectory(work, 'build')).toThrowError(
      /defineMcpTool is not defined/
    );
  });

  it('resolves symlinks, because the tools match the real path', () => {
    const base = root();
    const work = join(base, '.git', 'w');
    mkdirSync(work, { recursive: true });
    const link = join(base, 'checkout');
    symlinkSync(work, link, 'dir');

    expect(() => refuseGitDirectory(link, 'build')).toThrow();
  });

  it('stays quiet for a path that does not exist', () => {
    // This guard explains one specific failure; it must not become a second
    // source of them for whatever reads the path next.
    expect(() =>
      refuseGitDirectory(join(root(), 'absent'), 'build')
    ).not.toThrow();
  });

  it('can be overridden for the day upstream stops excluding `.git`', () => {
    const base = root();
    const work = join(base, '.git', 'w');
    mkdirSync(work, { recursive: true });
    vi.stubEnv('DUXT_ALLOW_GIT_DIR', '1');

    expect(() => refuseGitDirectory(work, 'build')).not.toThrow();
  });
});
