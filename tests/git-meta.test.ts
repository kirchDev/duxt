import { describe, expect, it } from 'vitest';
import { contributorsOf, githubUsername } from '../modules/git-meta';

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
