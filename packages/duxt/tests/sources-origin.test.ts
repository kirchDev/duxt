import { describe, expect, it } from 'vitest';
import { originFolder, resolveSources } from '../build/sources/sources-resolve';
import { sourceFilePath, sourceLink } from '../app/utils/source-file';

describe('origin.path', () => {
  it('maps a copied tree and its locale folders onto the forge', () => {
    // The shape of a docs repository copied into a build context: on disk the
    // pages sit under `wiki-content/docs`, on the forge under `docs`.
    const resolved = resolveSources([
      {
        path: 'wiki-content/docs',
        origin: { repo: 'kirchDev/wiki', ref: 'main', path: 'docs' },
        locales: [
          { locale: 'de-DE', path: 'wiki-content/docs' },
          { locale: 'en-GB', path: 'wiki-content/docs/en' }
        ]
      }
    ]);

    expect(resolved.map((source) => [source.path, source.originPath])).toEqual([
      ['wiki-content/docs', 'docs'],
      ['wiki-content/docs/en', 'docs/en']
    ]);

    const english = resolved[1]!;
    const file = sourceFilePath(
      '3.game-modes/1.outposts',
      english.prefix,
      english.originPath ?? english.path
    );
    expect(
      sourceLink(english.repositoryUrl, english.ref, english.refKind, file)
    ).toEqual({
      url: 'https://github.com/kirchDev/wiki/edit/main/docs/en/3.game-modes/1.outposts.md',
      kind: 'edit'
    });
  });

  it('leaves the folder alone without origin.path', () => {
    const [source] = resolveSources([
      { path: 'docs', origin: { repo: 'kirchDev/app', ref: 'main' } }
    ]);

    expect(source?.originPath).toBeUndefined();
    expect(source?.path).toBe('docs');
  });

  it('accepts a sibling checkout read through ../', () => {
    expect(originFolder('docs', '../wiki/docs', '../wiki/docs/en')).toBe(
      'docs/en'
    );
  });

  it('rejects a locale folder outside the source rather than guessing', () => {
    expect(() => originFolder('docs', 'content/docs', 'other/en')).toThrow(
      /outside the source path/
    );
  });
});
