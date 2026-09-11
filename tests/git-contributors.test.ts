import { describe, expect, it } from 'vitest';
import {
  contributorsForVersion,
  isGitHubApp,
  parseReleaseContributors
} from '../git-contributors';

/**
 * The log as `git log --tags --topo-order --decorate=short
 * --decorate-refs='refs/tags/*' --format=$'\x01%P\x1f%an\x1f%ae\x1f%D'`
 * actually writes it: one line per commit, newest first, and a trailing
 * newline git adds after each.
 */
function log(
  ...commits: {
    parents?: number;
    name?: string;
    email: string;
    tags?: string[];
  }[]
): string {
  return commits
    .map((commit) => {
      const parents = Array.from(
        { length: commit.parents ?? 1 },
        (_, index) => `p${index}`
      ).join(' ');

      const decoration = (commit.tags ?? [])
        .map((tag) => `tag: ${tag}`)
        .join(', ');

      return (
        `\u0001${parents}\u001f${commit.name ?? 'A Name'}` +
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
