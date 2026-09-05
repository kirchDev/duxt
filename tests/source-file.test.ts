import { describe, expect, it } from 'vitest';
import { sourceEditUrl, sourceFilePath } from '../app/utils/source-file';

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

describe('sourceEditUrl', () => {
  it('builds a GitHub edit URL at the ref the page was read at', () => {
    expect(
      sourceEditUrl('https://github.com/kirchDev/duxt', 'main', 'docs/a.md')
    ).toBe('https://github.com/kirchDev/duxt/edit/main/docs/a.md');
  });

  it('spells GitLab differently, because GitLab does', () => {
    expect(
      sourceEditUrl('https://gitlab.com/group/app', 'main', 'docs/a.md')
    ).toBe('https://gitlab.com/group/app/-/edit/main/docs/a.md');
  });

  it('draws nothing for a host it does not know', () => {
    // A wrong link is worse than no link.
    expect(
      sourceEditUrl('https://git.example.com/app', 'main', 'docs/a.md')
    ).toBeUndefined();
  });
});
