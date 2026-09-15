import { describe, expect, it } from 'vitest';
import { sourceFilePath, sourceLink } from '../app/utils/source-file';

describe('sourceFilePath', () => {
  it('strips the URL prefix and puts the folder back', () => {
    expect(
      sourceFilePath('duxt/getting-started/installation', '/duxt', 'docs')
    ).toBe('docs/getting-started/installation.md');
  });

  it('keeps the numbered folder names', () => {
    // The URL has them stripped, so it cannot be turned back into a file name.
    // This is the whole reason the stem is what gets used.
    expect(
      sourceFilePath('workflows/1.guides/2.add-a-body', '/workflows', 'docs')
    ).toBe('docs/1.guides/2.add-a-body.md');
  });

  it('handles a source served from the root', () => {
    expect(sourceFilePath('guide/deploying', '', 'docs')).toBe(
      'docs/guide/deploying.md'
    );
  });
});

describe('sourceLink', () => {
  it('opens an edit form on a branch', () => {
    expect(
      sourceLink(
        'https://github.com/kirchDev/duxt',
        'main',
        'branch',
        'docs/a.md'
      )
    ).toEqual({
      url: 'https://github.com/kirchDev/duxt/edit/main/docs/a.md',
      kind: 'edit'
    });
  });

  it('opens the source, not a form, on a tag', () => {
    // GitHub's web editor commits to a branch, so `/edit/v0.8.0/…` is a 404 —
    // and a version served from a tag is exactly what this layer creates.
    expect(
      sourceLink(
        'https://github.com/kirchDev/workflows',
        'v0.8.0',
        'tag',
        'docs/a.md'
      )
    ).toEqual({
      url: 'https://github.com/kirchDev/workflows/blob/v0.8.0/docs/a.md',
      kind: 'view'
    });
  });

  it('never sends a tag reader to the default branch', () => {
    // Worse than the 404: they would be editing today's documentation while
    // believing they were fixing the version they were reading.
    const link = sourceLink(
      'https://github.com/kirchDev/workflows',
      'v0.8.0',
      'tag',
      'docs/a.md'
    );

    expect(link!.url).toContain('v0.8.0');
    expect(link!.url).not.toContain('main');
  });

  it('spells GitLab differently, because GitLab does', () => {
    expect(
      sourceLink('https://gitlab.com/group/app', 'main', 'branch', 'docs/a.md')
    ).toMatchObject({
      url: 'https://gitlab.com/group/app/-/edit/main/docs/a.md'
    });

    expect(
      sourceLink('https://gitlab.com/group/app', 'v1.0.0', 'tag', 'docs/a.md')
    ).toMatchObject({
      url: 'https://gitlab.com/group/app/-/blob/v1.0.0/docs/a.md'
    });
  });

  it('views rather than edits when no ref is known', () => {
    // `HEAD` reads fine and the editor does not accept it.
    expect(
      sourceLink(
        'https://github.com/kirchDev/duxt',
        undefined,
        undefined,
        'a.md'
      )
    ).toEqual({
      url: 'https://github.com/kirchDev/duxt/blob/HEAD/a.md',
      kind: 'view'
    });
  });

  it('draws nothing for a host it does not know', () => {
    // A wrong link is worse than no link.
    expect(
      sourceLink('https://git.example.com/app', 'main', 'branch', 'docs/a.md')
    ).toBeUndefined();
  });
});
