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
      navigation: 'sections',
      versioning: 'global',
      localisation: 'original',
      remote: false
    },
    ...over
  }) as Source;

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
