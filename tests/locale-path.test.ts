import { describe, expect, it } from 'vitest';
import {
  isMachineRoute,
  localeCodesOf,
  splitLocalePath,
  stripLocalePrefix
} from '../app/utils/locale-path';

const codes = ['en-GB', 'en-US', 'de-DE', 'es-ES', 'fr-FR', 'pt-PT', 'pt-BR'];

describe('stripLocalePrefix', () => {
  it.each(['/getting-started/', '/de-DE/getting-started/'])(
    'uses the prerendered document path for %s',
    (path) => {
      expect(stripLocalePrefix(path, codes)).toBe('/getting-started');
    }
  );

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

describe('splitLocalePath', () => {
  const codes = ['en-GB', 'de-DE', 'pt-BR'];

  it('hands back the language it stripped', () => {
    expect(splitLocalePath('/de-DE/guide/deploying', codes)).toEqual({
      locale: 'de-DE',
      path: '/guide/deploying'
    });
  });

  it('reports no language where there was no segment', () => {
    expect(splitLocalePath('/guide/deploying', codes)).toEqual({
      path: '/guide/deploying'
    });
  });

  it('leaves a folder named like nothing on the list alone', () => {
    expect(splitLocalePath('/de/guide', codes)).toEqual({ path: '/de/guide' });
  });

  it('keeps a bare locale root routable', () => {
    expect(splitLocalePath('/de-DE', codes)).toEqual({
      locale: 'de-DE',
      path: '/'
    });
  });
});

describe('isMachineRoute', () => {
  it.each([
    '/llms.txt',
    '/llms-full.txt',
    '/rss.xml',
    '/mcp',
    '/mcp/',
    '/mcp/deeplink?ide=cursor',
    '/llms.txt#top'
  ])('keeps %s at the root, because no locale serves it', (path) => {
    // The landing page framed `/de-DE/llms.txt`: a 404, and a broken frame.
    expect(isMachineRoute(path)).toBe(true);
  });

  it.each([
    '/getting-started',
    '/getting-started.md',
    '/guide/llms.txt',
    '/mcp-server',
    '/v0.1.0/getting-started',
    '/'
  ])('leaves %s to the locale', (path) => {
    // `.md` included: the raw-markdown middleware serves the translation.
    expect(isMachineRoute(path)).toBe(false);
  });
});

describe('localeCodesOf', () => {
  it('reads the code out of bare codes and locale objects alike', () => {
    expect(localeCodesOf(['en-GB', { code: 'de-DE' }])).toEqual([
      'en-GB',
      'de-DE'
    ]);
  });

  it('answers an empty list where there is no i18n', () => {
    expect(localeCodesOf(undefined)).toEqual([]);
  });
});
