import { describe, expect, it } from 'vitest';
import {
  localeChain,
  partialsCollection,
  resolveSources,
  sourcesForRoute
} from '../sources-resolve';

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
          repo: 'acme/docs',
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

describe('sourcesForRoute', () => {
  const resolved = resolveSources(
    [
      {
        path: 'docs',
        repo: 'acme/sdk',
        refs: [
          { branch: 'main', label: 'v2' },
          { tag: 'v1.9.4', label: 'v1.9' }
        ],
        locales: ['en', 'de']
      },
      { path: 'docs', repo: 'acme/cli' }
    ],
    { defaultLocale: 'en' }
  );

  const collections = (path: string, locale?: string) =>
    sourcesForRoute(path, locale, resolved, 'en').map(
      (source) => source.collection
    );

  it('picks the language, not whichever collection sorted first', () => {
    // The bug this closes: original and translation share a prefix, so a
    // lookup given only the path answered with the original every time.
    expect(collections('/sdk/guides/caching', 'de')[0]).toBe('docs_de_sdk');
    expect(collections('/sdk/guides/caching', 'en')[0]).toBe('docs_sdk');
  });

  it('still takes the longest prefix', () => {
    expect(collections('/sdk/v1.9/guides/caching', 'de')[0]).toBe(
      'docs_de_sdk_v1_9'
    );
  });

  it('falls back to the untranslated original, once', () => {
    // `fallbackLocale` and the end of the chain are the same collection here,
    // and naming it twice made the path debugger print "docs → docs".
    expect(collections('/sdk/guides/caching', 'de')).toEqual([
      'docs_de_sdk',
      'docs_sdk'
    ]);
  });

  it('serves a language the site does not carry from the original', () => {
    expect(collections('/sdk/guides/caching', 'fr')).toEqual(['docs_sdk']);
  });

  it('is segment-aware, like every other prefix comparison', () => {
    // `/cli` must not claim `/climate` — the collection would exist and the
    // page would simply never be found in it.
    expect(collections('/sdk-old/guide')[0]).not.toBe('docs_cli');
  });

  it('never answers with nothing', () => {
    // An empty chain means no query at all, which 404s a page that exists.
    expect(collections('/nowhere/at/all').length).toBeGreaterThan(0);
    expect(sourcesForRoute('/x', 'de', [])).toEqual([]);
  });
});

describe('partialsCollection', () => {
  it('keeps the bare name for the default language', () => {
    // Public surface: a single-language site's partials collection must go on
    // being called what it has always been called.
    expect(partialsCollection()).toBe('duxt_partials');
    expect(partialsCollection({ locale: 'de', isDefaultLocale: true })).toBe(
      'duxt_partials'
    );
  });

  it('appends the code for a translation', () => {
    expect(partialsCollection({ locale: 'de', isDefaultLocale: false })).toBe(
      'duxt_partials_de'
    );
    expect(
      partialsCollection({ locale: 'pt-BR', isDefaultLocale: false })
    ).toBe('duxt_partials_pt_BR');
  });

  it('names one collection per language, not per version', () => {
    // A partial is a block of prose: three versions of one repository share it,
    // and reading them into one collection would give three blocks per name.
    const resolved = resolveSources(
      [
        {
          path: 'docs',
          repo: 'acme/sdk',
          refs: [{ branch: 'main' }, { tag: 'v1.9.4' }],
          locales: ['en', 'de']
        }
      ],
      { defaultLocale: 'en' }
    );

    expect(new Set(resolved.map((entry) => partialsCollection(entry)))).toEqual(
      new Set(['duxt_partials', 'duxt_partials_de'])
    );
  });
});
