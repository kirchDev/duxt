import { describe, expect, it } from 'vitest';
import {
  editableEdition,
  sourceFilePath,
  sourceLink
} from '../app/utils/source-file';

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

describe('editableEdition', () => {
  const edition = (
    overrides: Partial<DuxtResolvedSource>
  ): DuxtResolvedSource => ({
    collection: 'docs',
    prefix: '',
    path: 'docs',
    isDefault: false,
    isDefaultLocale: true,
    status: 'current',
    history: true,
    repositoryUrl: 'https://github.com/kirchDev/duxt',
    ...overrides
  });

  const tag = edition({ ref: 'duxt@v0.10.0', refKind: 'tag', isDefault: true });
  const main = edition({
    collection: 'docs_main',
    prefix: '/main',
    ref: 'main',
    refKind: 'branch'
  });

  it('offers the branch the same source publishes beside a tag', () => {
    expect(editableEdition([tag, main], tag)).toBe(main);
  });

  it('offers nothing on a branch, which edits itself', () => {
    expect(editableEdition([tag, main], main)).toBeUndefined();
  });

  it('keeps to the same language', () => {
    const german = { ...tag, locale: 'de', collection: 'docs_de' };
    const germanMain = { ...main, locale: 'de', collection: 'docs_de_main' };

    expect(editableEdition([tag, main, german, germanMain], german)).toBe(
      germanMain
    );
  });

  it('keeps to the same repository and artefact', () => {
    const elsewhere = {
      ...main,
      repositoryUrl: 'https://github.com/kirchDev/other'
    };
    const reference = {
      ...main,
      generated: { declaration: 'openapi' } as DuxtResolvedSource['generated']
    };

    expect(editableEdition([tag, elsewhere, reference], tag)).toBeUndefined();
  });
});
