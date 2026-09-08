import { describe, expect, it } from 'vitest';
import {
  generatedLayout,
  withGeneratedSections
} from '../app/utils/generated-sections';

type Source = Parameters<typeof generatedLayout>[1][number];

const base = {
  collection: 'docs',
  prefix: '',
  isDefault: true,
  isDefaultLocale: true,
  path: 'docs',
  status: 'current',
  history: true
} as Source;

const section = (over: Partial<Source> = {}): Source =>
  ({
    ...base,
    collection: 'docs_releases',
    prefix: '/releases',
    path: 'CHANGELOG.md',
    history: false,
    generated: {
      type: 'changelog',
      label: 'Releases',
      slug: 'releases',
      declaration: 0,
      navigation: 'sections',
      versioning: 'global',
      localisation: 'original',
      remote: false
    },
    ...over
  }) as Source;

/** The documentation at a second, non-default version. */
const older = (): Source =>
  ({
    ...base,
    collection: 'docs_v1_x',
    prefix: '/v1.x',
    version: 'v1.x',
    isDefault: false
  }) as Source;

/** Two versions of the documentation, each with the same section beside it. */
const perVersion = (): Source[] => {
  const generated = {
    ...section().generated!,
    versioning: 'per-version' as const
  };

  return [
    { ...base, version: 'main' } as Source,
    older(),
    section({ generated, version: 'main' }),
    section({
      generated,
      collection: 'docs_v1_x_releases',
      prefix: '/v1.x/releases',
      version: 'v1.x'
    })
  ];
};

/**
 * Two docs trees, each declaring a section of the same name.
 *
 * Same repository and same slug, which is precisely what the entry used to be
 * grouped by — so the two collapsed into one and the second vanished from the
 * row.
 */
const twoSources = (): Source[] => [
  { ...base, collection: 'docs_a', prefix: '/a' } as Source,
  { ...base, collection: 'docs_b', prefix: '/b' } as Source,
  section({ collection: 'docs_a_releases', prefix: '/a/releases' }),
  section({
    collection: 'docs_b_releases',
    prefix: '/b/releases',
    generated: { ...section().generated!, declaration: 1 }
  })
];

describe('withGeneratedSections', () => {
  it('leaves a config with no generated section untouched', () => {
    const config = { sections: [{ label: 'Guides', to: '/guides' }] };

    expect(withGeneratedSections(config as never)).toBe(config);
  });

  it('appends the entry to the second navbar row by default', () => {
    const config = {
      sections: [{ label: 'Guides', to: '/guides' }],
      resolvedSources: [base, section()]
    };

    expect(withGeneratedSections(config as never).sections).toEqual([
      { label: 'Guides', to: '/guides' },
      { label: 'Releases', to: '/releases', icon: undefined }
    ]);
  });

  it('appends rather than replaces, which is why it runs in the app', () => {
    // The build writes `appConfig` BEHIND every app.config.ts, and
    // `mergeDuxtConfig` replaces an array — a consumer naming `sections` would
    // otherwise have dropped the entry the build had just added.
    const config = { sections: [], resolvedSources: [base, section()] };

    expect(withGeneratedSections(config as never).sections).toHaveLength(1);
  });

  it('puts an entry in the first row when the section asks for it', () => {
    const config = {
      navigation: [{ label: 'Docs' }],
      sections: [],
      resolvedSources: [
        base,
        section({
          generated: { ...section().generated!, navigation: 'navigation' }
        })
      ]
    };

    const result = withGeneratedSections(config as never);

    expect(result.navigation).toHaveLength(2);
    expect(result.sections).toEqual([]);
  });

  it('puts nothing anywhere when the section asks for nowhere', () => {
    const config = {
      navigation: [{ label: 'Docs' }],
      sections: [],
      resolvedSources: [
        base,
        section({
          generated: { ...section().generated!, navigation: false }
        })
      ]
    };

    expect(withGeneratedSections(config as never)).toBe(config);
  });

  it('leaves a section the consumer already listed alone', () => {
    const config = {
      sections: [{ label: 'Release notes', to: '/releases' }],
      resolvedSources: [base, section()]
    };

    // Listed by hand means placed by hand: a second entry pointing at the same
    // URL is a duplicate in the row, not a second section.
    expect(withGeneratedSections(config as never).sections).toHaveLength(1);
  });

  it('gives a per-locale section one entry, not one per language', () => {
    // Every language of one section resolves to the IDENTICAL prefix — the
    // locale sits in front of the URL rather than in the content tree — so a
    // second entry is the same link twice, under the same Vue key.
    const generated = {
      ...section().generated!,
      localisation: 'per-locale' as const
    };

    const config = {
      sections: [],
      resolvedSources: [
        base,
        section({ generated, locale: 'en-GB' }),
        section({
          generated,
          locale: 'de',
          isDefaultLocale: false,
          collection: 'docs_de_releases',
          path: 'CHANGELOG.de.md'
        })
      ]
    };

    expect(withGeneratedSections(config as never).sections).toEqual([
      { label: 'Releases', to: '/releases', icon: undefined }
    ]);
  });

  it('gives a per-version section the entry for the version being read', () => {
    // One entry, not one per version: which versions exist is the switcher's
    // question, and this row is the top-level parts of the documentation.
    const config = { sections: [], resolvedSources: perVersion() };
    const row = (path: string) =>
      withGeneratedSections(config as never, path).sections;

    expect(row('/guides')).toEqual([
      { label: 'Releases', to: '/releases', icon: undefined }
    ]);
    expect(row('/v1.x/guides')).toEqual([
      { label: 'Releases', to: '/v1.x/releases', icon: undefined }
    ]);
    // From inside the section itself, where the version has to be read off the
    // section's own prefix rather than off a docs tree.
    expect(row('/v1.x/releases')).toEqual([
      { label: 'Releases', to: '/v1.x/releases', icon: undefined }
    ]);
  });

  it('falls back to the version-neutral entry where a version has none', () => {
    // A `global` section is one history at a URL with no version in it, so a
    // reader inside a version keeps the entry rather than losing it from the
    // row — and the same answer covers a version that declared no artefact.
    const config = {
      sections: [],
      resolvedSources: [base, older(), section()]
    };

    expect(
      withGeneratedSections(config as never, '/v1.x/guides').sections
    ).toEqual([{ label: 'Releases', to: '/releases', icon: undefined }]);
  });

  it('keeps both sections when two sources declare the same slug', () => {
    // Two docs trees, each with its own CHANGELOG.md, both naturally labelled
    // "Releases" — the monorepo shape this feature calls the normal case. They
    // are two sections, so the row gets two entries wherever it is read from;
    // grouping them by (slug, repository) lost one of them without a word,
    // which is the failure this layer exists to stop.
    const config = { sections: [], resolvedSources: twoSources() };
    const row = (path: string) =>
      withGeneratedSections(config as never, path).sections;

    const both = [
      { label: 'Releases', to: '/a/releases', icon: undefined },
      { label: 'Releases', to: '/b/releases', icon: undefined }
    ];

    expect(row('/a/guides')).toEqual(both);
    expect(row('/b/guides')).toEqual(both);
    expect(row('/')).toEqual(both);
  });

  it('leaves a hand-listed section alone from a non-default version too', () => {
    // "Listed by hand" is a statement about the SECTION, not about one URL: the
    // consumer wrote the entry at the position they read it at, and on any
    // other version the generated entry is a different string — so asking per
    // URL appended a second entry with the same label the moment the reader
    // left the default version.
    const config = {
      sections: [{ label: 'Release notes', to: '/releases' }],
      resolvedSources: perVersion()
    };

    expect(
      withGeneratedSections(config as never, '/v1.x/guides').sections
    ).toHaveLength(1);
  });

  it('carries the icon the section resolved to', () => {
    const config = {
      sections: [],
      resolvedSources: [
        base,
        section({
          generated: { ...section().generated!, icon: 'lucide:tag' }
        })
      ]
    };

    expect(withGeneratedSections(config as never).sections?.[0]?.icon).toBe(
      'lucide:tag'
    );
  });
});

describe('generatedLayout', () => {
  it('answers nothing while no type names a layout', () => {
    expect(
      generatedLayout('/releases/v1.0.0', [base, section()])
    ).toBeUndefined();
  });

  it('gives a section page the layout its type names', () => {
    const sources = [
      base,
      section({ generated: { ...section().generated!, layout: 'changelog' } })
    ];

    expect(generatedLayout('/releases', sources)).toBe('changelog');
    expect(generatedLayout('/releases/v1.0.0', sources)).toBe('changelog');
  });

  it('leaves every other page in the docs chrome', () => {
    const sources = [
      base,
      section({ generated: { ...section().generated!, layout: 'changelog' } })
    ];

    expect(generatedLayout('/getting-started', sources)).toBeUndefined();
    // Segment-aware, so a sibling path starting with the same letters is not
    // inside the section.
    expect(generatedLayout('/releases-archive', sources)).toBeUndefined();
  });
});
