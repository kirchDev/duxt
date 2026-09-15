import { describe, expect, it } from 'vitest';
import { versionChoices } from '../app/utils/version-choices';
import { resolveSources } from '../build/sources/sources-resolve';
import { versionPath } from '../app/utils/version-paths';

const base = {
  collection: 'docs',
  prefix: '',
  path: 'docs',
  isDefault: false,
  isDefaultLocale: true,
  status: 'current',
  history: true
} as DuxtResolvedSource;

const source = (over: Partial<DuxtResolvedSource> = {}): DuxtResolvedSource =>
  ({ ...base, ...over }) as DuxtResolvedSource;

const v2 = source({
  repo: 'duxt',
  version: '2.x',
  prefix: '',
  isDefault: true
});
const v1 = source({ repo: 'duxt', version: '1.x', prefix: '/1.x' });

describe('versionChoices', () => {
  it('keeps a single translated version as one badge choice', () => {
    const manifest = resolveSources([
      {
        repo: 'acme/docs',
        path: 'docs',
        refs: ['main'],
        locales: ['en-GB', 'de', 'fr']
      }
    ]);

    expect(versionChoices(manifest, manifest[0], undefined)).toEqual([
      { label: 'main', to: '/', description: 'default' }
    ]);
  });

  it('retains distinct targets even when their version labels match', () => {
    const otherTarget = source({ ...v1, prefix: '/legacy' });

    expect(
      versionChoices([v2, v1, otherTarget], v2, undefined).map(
        (choice) => choice.to
      )
    ).toEqual(['/', '/1.x', '/legacy']);
  });

  it.each(['en-GB', 'de'])(
    'offers each translated edition once while reading %s',
    (locale) => {
      const manifest = resolveSources([
        {
          repo: 'acme/docs',
          path: 'docs',
          refs: ['main', 'v1'],
          locales: ['en-GB', 'de']
        }
      ]);
      const current = manifest.find((entry) => entry.locale === locale);

      expect(versionChoices(manifest, current, undefined)).toEqual([
        { label: 'main', to: '/', description: 'default' },
        { label: 'v1', to: '/v1', description: undefined }
      ]);
    }
  );

  it('offers the versions of the repository being read', () => {
    const other = source({ repo: 'other', version: '9.x', prefix: '/9.x' });

    expect(versionChoices([v2, v1, other], v2, undefined)).toEqual([
      { label: '2.x', to: '/', description: 'default' },
      { label: '1.x', to: '/1.x', description: undefined }
    ]);
  });

  it('orders lifecycle groups before descending release versions', () => {
    const main = source({
      repo: 'duxt',
      version: 'main',
      prefix: '/main',
      status: 'upcoming'
    });
    const current = source({
      repo: 'duxt',
      version: 'v0.3.0',
      prefix: '',
      isDefault: true
    });
    const v2 = source({
      repo: 'duxt',
      version: 'v0.2.0',
      prefix: '/v0.2.0',
      status: 'deprecated'
    });
    const v1 = source({
      repo: 'duxt',
      version: 'v0.1.0',
      prefix: '/v0.1.0',
      status: 'deprecated'
    });

    expect(
      versionChoices([v1, current, v2, main], current, undefined).map(
        (choice) => choice.label
      )
    ).toEqual(['main', 'v0.3.0', 'v0.2.0', 'v0.1.0']);
  });

  it('captions a version by its lifecycle rather than its default-ness', () => {
    const eol = source({
      repo: 'duxt',
      version: '0.x',
      prefix: '/0.x',
      status: 'eol'
    });
    const [, , old] = versionChoices([v2, v1, eol], v2, undefined);

    expect(old?.description).toBe('duxt.version.status.eol');
  });

  it('says nothing where the version is current', () => {
    const [, older] = versionChoices([v2, v1], v2, undefined);

    expect(older?.description).toBeUndefined();
  });

  it('lets the config win, so a label may read differently from the URL', () => {
    const configured = [{ label: 'Latest', to: '/' }] as DuxtLink[];

    expect(versionChoices([v2, v1], v2, configured)).toEqual(configured);
  });

  it('offers nothing inside a version-neutral generated section', () => {
    const changelog = source({
      repo: 'duxt',
      prefix: '/releases',
      generated: { versioning: 'global' } as DuxtResolvedSource['generated']
    });

    expect(versionChoices([v2, v1, changelog], changelog, undefined)).toEqual(
      []
    );
    // Even where the consumer named them: the section serves one URL, and every
    // entry would move the reader off it.
    expect(
      versionChoices([v2, v1, changelog], changelog, [
        { label: 'Latest', to: '/' }
      ] as DuxtLink[])
    ).toEqual([]);
  });

  it('skips a source with no version of its own', () => {
    const flat = source({ repo: 'duxt' });

    expect(versionChoices([flat], flat, undefined)).toEqual([]);
  });

  it('survives having no current source', () => {
    expect(versionChoices([v2, v1], undefined, undefined)).toEqual([]);
  });

  it('labels and orders component-prefixed tags by their version', () => {
    const sources = resolveSources([
      {
        repo: 'acme/monorepo',
        path: 'docs',
        refs: [
          { tag: 'duxt@v0.10.0', default: true },
          { tag: 'duxt@v0.9.0' },
          { tag: 'v0.4.0' }
        ]
      }
    ]);
    const current = sources.find((entry) => entry.isDefault)!;

    expect(
      versionChoices(sources, current, undefined).map((choice) => [
        choice.label,
        choice.to
      ])
    ).toEqual([
      ['v0.10.0', '/'],
      ['v0.9.0', '/v0.9.0'],
      ['v0.4.0', '/v0.4.0']
    ]);
  });
});

describe('a site that publishes a reference beside its documentation', () => {
  /** The same two versions again, as an `openapi` section reaches the manifest. */
  const api = (over: Partial<DuxtResolvedSource> = {}) =>
    source({
      repo: 'duxt',
      generated: {
        type: 'openapi',
        label: 'API',
        slug: 'api',
        declaration: 0,
        navigation: 'sections',
        versioning: 'per-version',
        localisation: 'per-locale',
        remote: false
      },
      ...over
    } as Partial<DuxtResolvedSource>);

  const apiV2 = api({ version: '2.x', prefix: '/api', isDefault: true });
  const apiV1 = api({ version: '1.x', prefix: '/1.x/api' });

  const all = [v2, v1, apiV2, apiV1];

  it.each(['en-GB', 'de'])(
    'keeps translated API editions within their declaration for %s',
    (locale) => {
      const independent = api({
        version: '2026',
        prefix: '/payments',
        generated: { ...apiV2.generated!, declaration: 1 }
      });
      const translated = [...all, independent].flatMap((entry) =>
        ['en-GB', 'de'].map((language) =>
          source({ ...entry, locale: language })
        )
      );
      const current = translated.find(
        (entry) => entry.prefix === '/1.x/api' && entry.locale === locale
      );
      const choices = versionChoices(translated, current, undefined);

      expect(choices).toEqual([
        { label: '2.x', to: '/api', description: 'default' },
        { label: '1.x', to: '/1.x/api', description: undefined }
      ]);
      expect(
        versionPath('/1.x/api/pets/get', current?.prefix, choices[0]!.to!)
      ).toBe('/api/pets/get');
      expect(
        versionChoices(translated, independent, undefined).map(
          (choice) => choice.to
        )
      ).toEqual(['/payments']);
    }
  );

  it('does not offer the reference as a version of the documentation', () => {
    // Four entries with two labels between them, two of which moved the reader
    // out of the documentation entirely.
    expect(versionChoices(all, v2, undefined)).toEqual([
      { label: '2.x', to: '/', description: 'default' },
      { label: '1.x', to: '/1.x', description: undefined }
    ]);
  });

  it('switches version WITHIN the reference when that is what is open', () => {
    // The reader asked for another version of this endpoint, not for the
    // documentation's front page.
    expect(
      versionChoices(all, apiV2, undefined).map((choice) => choice.to)
    ).toEqual(['/api', '/1.x/api']);
  });

  it('keeps a versioned overview on the overview route', () => {
    const overviewV3 = source({
      repo: 'demo',
      version: 'v3.x',
      prefix: '/demo',
      isDefault: true
    });
    const overviewV2 = source({
      repo: 'demo',
      version: 'v2.x',
      prefix: '/demo/v2.x',
      status: 'deprecated'
    });
    const overviewV1 = source({
      repo: 'demo',
      version: 'v1.x',
      prefix: '/demo/v1.x',
      status: 'eol'
    });
    const overviewMain = source({
      repo: 'demo',
      version: 'main',
      prefix: '/demo/main',
      status: 'upcoming'
    });
    const choices = versionChoices(
      [overviewMain, overviewV3, overviewV2, overviewV1],
      overviewV3,
      undefined
    );

    expect(choices).toEqual([
      {
        label: 'main',
        to: '/demo/main',
        description: 'duxt.version.status.upcoming'
      },
      { label: 'v3.x', to: '/demo', description: 'default' },
      {
        label: 'v2.x',
        to: '/demo/v2.x',
        description: 'duxt.version.status.deprecated'
      },
      {
        label: 'v1.x',
        to: '/demo/v1.x',
        description: 'duxt.version.status.eol'
      }
    ]);
    expect(versionPath('/demo', overviewV3.prefix, choices[2]!.to!)).toBe(
      '/demo/v2.x'
    );
  });

  it('keeps a per-version changelog on its own route in every version', () => {
    const changelog = (over: Partial<DuxtResolvedSource>) =>
      api({
        generated: {
          type: 'changelog',
          label: 'Releases',
          slug: 'releases',
          declaration: 1,
          navigation: 'sections',
          versioning: 'per-version',
          localisation: 'original',
          remote: false
        },
        ...over
      } as Partial<DuxtResolvedSource>);
    const latest = changelog({
      version: '2.x',
      prefix: '/releases',
      isDefault: true
    });
    const older = changelog({ version: '1.x', prefix: '/1.x/releases' });

    // The editions of the changelog itself, not of the documentation beside it,
    // so choosing another version keeps the reader in the changelog.
    expect(versionChoices([...all, latest, older], older, undefined)).toEqual([
      { label: '2.x', to: '/releases', description: 'default' },
      { label: '1.x', to: '/1.x/releases', description: undefined }
    ]);
  });
});
