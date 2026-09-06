import { describe, expect, it } from 'vitest';
import { localeChain, resolveSources } from '../sources-resolve';

describe('translated sources', () => {
  it('changes nothing for a site that declares no locales', () => {
    const resolved = resolveSources([{ path: 'docs' }]);

    // The whole feature is additive or it is a breaking change: the collection
    // a plain site gets must still be called `docs`, at the root, with no
    // locale attached to it.
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({
      collection: 'docs',
      prefix: '',
      locale: undefined,
      isDefaultLocale: true,
      path: 'docs'
    });
  });

  it('reads the default locale from the source folder itself', () => {
    const resolved = resolveSources([
      { path: 'docs', locales: ['en-GB', 'de-DE'] }
    ]);

    const [original, german] = resolved;

    // No `en/` folder, and the name a single-language site already had.
    expect(original).toMatchObject({
      collection: 'docs',
      path: 'docs',
      locale: 'en-GB',
      isDefaultLocale: true
    });

    expect(german).toMatchObject({
      collection: 'docs_de_DE',
      path: 'docs/de-DE',
      locale: 'de-DE',
      isDefaultLocale: false
    });
  });

  it('keeps the locale out of the URL prefix', () => {
    const resolved = resolveSources([
      { path: 'docs', locales: ['en-GB', 'de-DE'] }
    ]);

    // i18n puts the locale in front of the path itself. A collection carrying
    // it too would spell it twice in one URL — and identical content paths are
    // what make the fallback a second query for the same path.
    expect(resolved.every((source) => source.prefix === '')).toBe(true);
  });

  it('lets a ref override the languages its version is kept in', () => {
    const resolved = resolveSources(
      [
        {
          path: 'docs',
          locales: ['en-GB', 'de-DE'],
          refs: [{ tag: 'v2' }, { tag: 'v1', locales: ['en-GB'] }]
        }
      ],
      { defaultLocale: 'en-GB', defaultRef: 'v2' }
    );

    // v2 in both languages, v1 only in the original: the common case, because
    // nobody keeps the translation of a version they no longer develop.
    expect(
      resolved.map((source) => [source.collection, source.locale])
    ).toEqual([
      ['docs', 'en-GB'],
      ['docs_de_DE', 'de-DE'],
      ['docs_v1', 'en-GB']
    ]);
  });

  it('takes a translation from a repository of its own', () => {
    const [, german] = resolveSources([
      {
        path: 'docs',
        locales: [
          'en-GB',
          { locale: 'de-DE', repo: 'acme/docs-de', path: 'docs' }
        ]
      }
    ]);

    // What React and Vue do outside their tooling — a translation repository
    // with its own maintainers — as one source entry.
    expect(german).toMatchObject({
      locale: 'de-DE',
      path: 'docs',
      repository: 'acme/docs-de'
    });
  });

  it('does not treat two languages on one prefix as a collision', () => {
    // Same prefix, twice, is the point rather than the error the resolver
    // throws for two sources claiming one URL.
    expect(() =>
      resolveSources([{ path: 'docs', locales: ['en-GB', 'de-DE'] }])
    ).not.toThrow();
  });
});

describe('localeChain', () => {
  const available = ['en-GB', 'de-DE', 'pt-PT', 'pt-BR'];

  it('reads its own language first', () => {
    expect(localeChain('de-DE', available)[0]).toBe('de-DE');
  });

  it('falls back to a sibling region before leaving the language', () => {
    // pt-BR reads European Portuguese before it gives up and shows English —
    // the rule the locale FILES already follow in nuxt.config.
    expect(localeChain('pt-BR', ['pt-PT', undefined], 'en-GB')).toEqual([
      'pt-PT',
      undefined
    ]);
  });

  it('reads a base-language folder for a regional locale', () => {
    // One `pt/` folder serves both Portuguese locales.
    expect(localeChain('pt-BR', ['pt', undefined])).toEqual(['pt', undefined]);
  });

  it('uses vue-i18n’s own fallbackLocale before the original', () => {
    expect(localeChain('fr-FR', ['en-GB', undefined], 'en-GB')).toEqual([
      'en-GB',
      undefined
    ]);
  });

  it('always ends at the untranslated original', () => {
    // A page that exists in no translation still has to render.
    for (const locale of [undefined, 'de-DE', 'zz-ZZ']) {
      expect(localeChain(locale, available.concat(undefined)).at(-1)).toBe(
        undefined
      );
    }
  });

  it('never repeats a locale', () => {
    const chain = localeChain('pt-PT', ['pt-PT', undefined], 'pt-PT');
    expect(chain).toEqual(['pt-PT', undefined]);
  });
});
