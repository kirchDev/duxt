import { describe, expect, it } from 'vitest';
import { selectSearchSources } from '../app/utils/search-sources';

type Source = DuxtResolvedSource;

const base = {
  prefix: '',
  repo: 'acme/site',
  isDefault: true,
  isDefaultLocale: true,
  path: 'docs',
  status: 'current',
  history: false
} as Source;

const generated = (
  collection: string,
  declaration: number,
  over: Partial<Source> = {}
) =>
  ({
    ...base,
    collection,
    generated: {
      type: declaration === 1 ? 'openapi' : 'changelog',
      label: declaration === 1 ? 'API' : 'Releases',
      slug: declaration === 1 ? 'api' : 'releases',
      declaration,
      navigation: 'sections',
      versioning: declaration === 0 ? 'global' : 'per-version',
      localisation: 'original',
      remote: false
    },
    ...over
  }) as Source;

const docs = (collection: string, over: Partial<Source> = {}) =>
  ({ ...base, collection, ...over }) as Source;

describe('selectSearchSources', () => {
  it('keeps docs, every generated declaration, and one version of each', () => {
    const sources = [
      docs('docs'),
      docs('docs_v1', { version: 'v1', isDefault: false }),
      generated('docs_releases', 0),
      generated('docs_api', 1),
      generated('docs_api_v1', 1, {
        version: 'v1',
        isDefault: false,
        prefix: '/v1/api'
      })
    ];

    expect(
      selectSearchSources(sources, sources[0], undefined, undefined).map(
        (source) => source.collection
      )
    ).toEqual(['docs', 'docs_releases', 'docs_api']);
  });

  it('keeps the current API edition while other artefacts use defaults', () => {
    const sources = [
      docs('docs'),
      docs('docs_v1', { version: 'v1', isDefault: false }),
      generated('docs_releases', 0),
      generated('docs_api', 1),
      generated('docs_api_v1', 1, {
        version: 'v1',
        isDefault: false,
        prefix: '/v1/api'
      })
    ];

    expect(
      selectSearchSources(sources, sources[4], undefined, undefined).map(
        (source) => source.collection
      )
    ).toEqual(['docs_api_v1', 'docs', 'docs_releases']);
  });

  it('chooses the best language once and falls back for untranslated artefacts', () => {
    const sources = [
      docs('docs', { locale: 'en', isDefaultLocale: true }),
      docs('docs_de', {
        locale: 'de',
        isDefaultLocale: false,
        collection: 'docs_de'
      }),
      generated('docs_releases', 0),
      generated('docs_api', 1, {
        locale: 'de',
        isDefaultLocale: false,
        collection: 'docs_de_api'
      }),
      generated('docs_api_en', 1, {
        collection: 'docs_api_en',
        locale: 'en',
        isDefaultLocale: true
      })
    ];

    expect(
      selectSearchSources(sources, sources[0], 'de', 'en').map(
        (source) => source.collection
      )
    ).toEqual(['docs', 'docs_releases', 'docs_de_api']);
  });
});
