import { describe, expect, it } from 'vitest';
import { stripLocalePrefix } from '../app/utils/locale-path';

const codes = ['en-GB', 'en-US', 'de-DE', 'es-ES', 'fr-FR', 'pt-PT', 'pt-BR'];

describe('stripLocalePrefix', () => {
  it('leaves the default locale alone, because it carries no prefix', () => {
    expect(stripLocalePrefix('/guide/deploying', codes)).toBe(
      '/guide/deploying'
    );
  });

  it('removes a locale segment', () => {
    expect(stripLocalePrefix('/de-DE/guide/deploying', codes)).toBe(
      '/guide/deploying'
    );
  });

  it('turns a bare locale root into the site root', () => {
    // /de-DE is the German front page, not a page called "de-DE".
    expect(stripLocalePrefix('/de-DE', codes)).toBe('/');
  });

  it('keeps a segment that only looks like a locale', () => {
    // A docs folder may legitimately be called this; only a CONFIGURED locale
    // is a prefix, which is why the codes are passed in rather than matched by
    // a pattern.
    expect(stripLocalePrefix('/pt-AO/guide', codes)).toBe('/pt-AO/guide');
  });

  it('removes only the first segment', () => {
    expect(stripLocalePrefix('/de-DE/de-DE/guide', codes)).toBe('/de-DE/guide');
  });

  it('survives the root and an empty path', () => {
    expect(stripLocalePrefix('/', codes)).toBe('/');
    expect(stripLocalePrefix('', codes)).toBe('');
  });
});
