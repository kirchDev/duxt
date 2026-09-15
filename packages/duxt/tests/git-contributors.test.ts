import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  contributorsForVersion,
  isGitHubApp,
  localHistoryFor,
  parseReleaseContributors,
  sameRepository
} from '../build/git/git-contributors';

/**
 * The log as `git log --tags --topo-order --decorate=short
 * --decorate-refs='refs/tags/*'
 * --format=$'\x01%H\x1f%P\x1f%an\x1f%ae\x1f%D'`
 * actually writes it: one line per commit, newest first, and a trailing
 * newline git adds after each.
 */
function log(
  ...commits: {
    hash?: string;
    parentHashes?: string[];
    parents?: number;
    name?: string;
    email: string;
    tags?: string[];
  }[]
): string {
  const hashes = commits.map((commit, index) => commit.hash ?? `c${index}`);

  return commits
    .map((commit, commitIndex) => {
      const parentCount = commit.parents ?? (hashes[commitIndex + 1] ? 1 : 0);
      const parents = (
        commit.parentHashes ??
        Array.from({ length: parentCount }, (_, parentIndex) =>
          parentIndex === 0 && hashes[commitIndex + 1]
            ? hashes[commitIndex + 1]!
            : `${hashes[commitIndex]}-parent-${parentIndex}`
        )
      ).join(' ');

      const decoration = (commit.tags ?? [])
        .map((tag) => `tag: ${tag}`)
        .join(', ');

      return (
        `\u0001${hashes[commitIndex]}\u001f${parents}` +
        `\u001f${commit.name ?? 'A Name'}` +
        `\u001f${commit.email}\u001f${decoration}\n`
      );
    })
    .join('');
}

describe('parseReleaseContributors', () => {
  it('gives a release the commits between it and the release before it', () => {
    const releases = parseReleaseContributors(
      log(
        { email: 'a@x', tags: ['v1.1.0'] },
        { email: 'b@x' },
        { email: 'c@x', tags: ['v1.0.0'] },
        { email: 'd@x' }
      )
    );

    expect(releases.get('v1.1.0')?.map((person) => person.commits)).toEqual([
      1, 1
    ]);
    expect([...releases.keys()]).toEqual(['v1.1.0', 'v1.0.0']);
    expect(releases.get('v1.0.0')).toHaveLength(2);
  });

  it('keeps a topo-ordered side branch with the release that merged it', () => {
    // Both tag commits are merges, so topo-order may walk the older release
    // parent before the parallel branch the newer release merged. The tag
    // markers therefore do not delimit contiguous slices of this log.
    const releases = parseReleaseContributors(
      log(
        {
          hash: 'new',
          parentHashes: ['old', 'feature'],
          email: 'merger@x',
          tags: ['v1.1.0']
        },
        {
          hash: 'old',
          parentHashes: ['old-base', 'old-release'],
          email: 'merger@x',
          tags: ['v1.0.0']
        },
        {
          hash: 'feature',
          parentHashes: ['feature-base'],
          name: 'Feature Author',
          email: 'feature@x'
        }
      )
    );

    expect(releases.get('v1.1.0')).toEqual([
      {
        name: 'Feature Author',
        commits: 1,
        username: undefined
      }
    ]);
  });

  it('credits nobody for a commit no release carries yet', () => {
    // `--tags` never walks past the newest tag, so an unreleased commit is not
    // in the output at all. This is the guard for the day someone adds `HEAD`.
    const releases = parseReleaseContributors(
      log({ email: 'unreleased@x' }, { email: 'a@x', tags: ['v1.0.0'] })
    );

    expect(releases.get('v1.0.0')).toHaveLength(1);
    expect(
      [...releases.values()].flat().some((person) => person.name === 'Nobody')
    ).toBe(false);
  });

  it('counts one person once, however many commits they wrote', () => {
    const releases = parseReleaseContributors(
      log(
        { name: 'Titus Kirch', email: 'a@x', tags: ['v1.0.0'] },
        { name: 'titus', email: 'A@X' },
        { name: 'Someone', email: 'b@x' }
      )
    );

    expect(releases.get('v1.0.0')).toEqual([
      { name: 'Titus Kirch', commits: 2, username: undefined },
      { name: 'Someone', commits: 1, username: undefined }
    ]);
  });

  it('lets a merge commit open a release without crediting its author', () => {
    // release-please tags the merge commit its release PR produced, so the
    // boundary has to be walked — and a merge introduces no change of its own.
    const releases = parseReleaseContributors(
      log(
        { parents: 2, email: 'merger@x', tags: ['v1.0.0'] },
        { email: 'author@x' }
      )
    );

    expect(releases.get('v1.0.0')).toHaveLength(1);
    expect(releases.get('v1.0.0')?.[0]?.commits).toBe(1);
  });

  it('leaves out the app that cut the release', () => {
    const releases = parseReleaseContributors(
      log(
        { name: 'A Person', email: 'person@x', tags: ['v1.0.0'] },
        {
          name: 'kirchdev-release[bot]',
          email: '287319172+kirchdev-release[bot]@users.noreply.github.com'
        }
      )
    );

    expect(releases.get('v1.0.0')?.map((person) => person.name)).toEqual([
      'A Person'
    ]);
  });

  it('reads the GitHub handle a noreply address carries', () => {
    const releases = parseReleaseContributors(
      log({
        name: 'Octocat',
        email: '1234567+octocat@users.noreply.github.com',
        tags: ['v1.0.0']
      })
    );

    expect(releases.get('v1.0.0')?.[0]?.username).toBe('octocat');
  });

  it('answers under every tag one commit carries', () => {
    const releases = parseReleaseContributors(
      log({ email: 'a@x', tags: ['v1.0.0', '1.0.0'] }, { email: 'b@x' })
    );

    expect(releases.get('v1.0.0')).toHaveLength(2);
    expect(releases.get('1.0.0')).toHaveLength(2);
  });

  it('reads an empty history as no releases rather than as a failure', () => {
    expect(parseReleaseContributors('').size).toBe(0);
  });
});

describe('isGitHubApp', () => {
  it('reads the marker GitHub itself writes into the address', () => {
    expect(
      isGitHubApp({
        name: 'dependabot[bot]',
        email: '49699333+dependabot[bot]@users.noreply.github.com'
      })
    ).toBe(true);
  });

  it('leaves a person alone, whatever they call themselves', () => {
    expect(isGitHubApp({ name: 'robot[bot]', email: 'me@example.com' })).toBe(
      false
    );
  });
});

describe('contributorsForVersion', () => {
  const releases = new Map([['v1.0.0', [{ name: 'A Person', commits: 1 }]]]);

  it('matches a bare changelog version to the tag it was cut as', () => {
    // release-please writes `## 1.0.0` and tags `v1.0.0` — `include-v-in-tag`.
    expect(contributorsForVersion(releases, '1.0.0')).toHaveLength(1);
  });

  it('matches a version the changelog already wrote with a v', () => {
    expect(contributorsForVersion(releases, 'v1.0.0')).toHaveLength(1);
  });

  it('gives nothing for a version this checkout never tagged', () => {
    expect(contributorsForVersion(releases, '9.9.9')).toBeUndefined();
  });

  it('gives nothing at all when no history was read', () => {
    expect(contributorsForVersion(undefined, '1.0.0')).toBeUndefined();
  });
});

describe('sameRepository', () => {
  it('matches the shorthand URL against an ssh remote', () => {
    expect(
      sameRepository(
        'https://github.com/kirchDev/duxt',
        'git@github.com:kirchDev/duxt.git'
      )
    ).toBe(true);
  });

  it('ignores credentials, a trailing slash and case', () => {
    expect(
      sameRepository(
        'https://token@github.com/KirchDev/Duxt/',
        'ssh://git@github.com/kirchdev/duxt.git'
      )
    ).toBe(true);
  });

  it('tells a fork from the project', () => {
    expect(
      sameRepository(
        'https://github.com/kirchDev/duxt',
        'git@github.com:someone/duxt.git'
      )
    ).toBe(false);
  });

  it('tells two hosts apart', () => {
    expect(
      sameRepository(
        'https://github.com/kirchDev/duxt',
        'https://gitlab.com/kirchDev/duxt'
      )
    ).toBe(false);
  });
});

describe('localHistoryFor', () => {
  function checkout(...remotes: [string, string][]): string {
    const dir = mkdtempSync(join(tmpdir(), 'duxt-history-'));
    execFileSync('git', ['init', '-q', dir]);
    for (const [name, url] of remotes) {
      execFileSync('git', ['-C', dir, 'remote', 'add', name, url]);
    }
    return dir;
  }

  it('hands back the checkout when a remote is the downloaded repository', () => {
    const dir = checkout(['origin', 'git@github.com:kirchDev/duxt.git']);
    try {
      expect(localHistoryFor('https://github.com/kirchDev/duxt', dir)).toBe(
        dir
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('counts a remote that is not called origin', () => {
    const dir = checkout(
      ['origin', 'git@github.com:someone/duxt.git'],
      ['upstream', 'https://github.com/kirchDev/duxt.git']
    );
    try {
      expect(localHistoryFor('https://github.com/kirchDev/duxt', dir)).toBe(
        dir
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads no history for somebody else’s repository', () => {
    const dir = checkout(['origin', 'git@github.com:kirchDev/duxt.git']);
    try {
      expect(
        localHistoryFor(
          'https://github.com/kirchDev/terraform-provider-linear',
          dir
        )
      ).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is silent where there is no checkout', () => {
    const dir = mkdtempSync(join(tmpdir(), 'duxt-history-'));
    try {
      expect(
        localHistoryFor('https://github.com/kirchDev/duxt', dir)
      ).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
