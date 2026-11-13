import { describe, expect, it } from 'vitest';
import { createDuxtConfigCache } from '../app/utils/duxt-config-cache';
import { resolveDuxtTexts } from '../app/utils/duxt-text';
import { withGeneratedSections } from '../app/utils/generated-sections';

/**
 * The cache only pays if it never changes an answer. Every case compares it
 * with the one-shot resolution `useDuxtConfig()` did before it existed:
 * merge, append the generated sections for the path, resolve every text.
 */

const generated = (
  declaration: number,
  label: unknown,
  extra: Record<string, unknown> = {}
) => ({
  type: 'changelog',
  label,
  slug: 'changelog',
  declaration,
  navigation: 'sections',
  versioning: 'per-version',
  localisation: 'original',
  remote: false,
  ...extra
});

const config = {
  title: 'Site',
  sections: [
    { label: 'nav.guides', to: '/guides' },
    { label: { 'en-GB': 'Reference', 'de-DE': 'Referenz' }, to: '/reference' }
  ],
  footer: { copyright: 'footer.copyright' },
  resolvedSources: [
    {
      collection: 'docs',
      prefix: '',
      isDefault: true,
      path: 'docs',
      isDefaultLocale: true,
      status: 'current',
      history: false,
      name: { 'en-GB': 'Docs', 'de-DE': 'Doku' }
    },
    {
      collection: 'docs_v1',
      prefix: '/v1',
      version: 'v1',
      isDefault: false,
      path: 'docs',
      isDefaultLocale: true,
      status: 'eol',
      history: false
    },
    {
      collection: 'docs_changelog',
      prefix: '/changelog',
      isDefault: true,
      path: 'CHANGELOG.md',
      isDefaultLocale: true,
      status: 'current',
      history: false,
      generated: generated(0, 'nav.changelog')
    },
    {
      collection: 'docs_v1_changelog',
      prefix: '/v1/changelog',
      version: 'v1',
      isDefault: false,
      path: 'CHANGELOG.md',
      isDefaultLocale: true,
      status: 'eol',
      history: false,
      generated: generated(0, 'nav.changelog')
    }
  ],
  resolvedPageTypes: { docs: { layout: 'docs', template: 'DuxtDocsPage' } }
} as unknown as DuxtConfig;

const messages: Record<string, Record<string, string>> = {
  'en-GB': {
    'nav.guides': 'Guides',
    'nav.changelog': 'Changelog',
    'footer.copyright': '© Site'
  },
  'de-DE': {
    'nav.guides': 'Anleitungen',
    'nav.changelog': 'Änderungen',
    'footer.copyright': '© Seite'
  }
};
const lookupFor = (locale: string) => (key: string) => messages[locale]?.[key];

const oneShot = (path: string, locale: string) =>
  resolveDuxtTexts(
    withGeneratedSections(config, path),
    locale,
    lookupFor(locale)
  );

describe('createDuxtConfigCache', () => {
  const paths = ['/', '/guides', '/v1/guides', '/changelog', '/v1/changelog'];

  it('answers every path and locale exactly as the one-shot resolution', () => {
    const cache = createDuxtConfigCache();

    for (const locale of ['en-GB', 'de-DE'])
      for (const path of paths)
        expect(cache.resolve(config, path, locale, lookupFor(locale))).toEqual(
          oneShot(path, locale)
        );
  });

  it('hands every caller of one position the same object', () => {
    const cache = createDuxtConfigCache();
    const lookup = lookupFor('en-GB');

    expect(cache.resolve(config, '/guides', 'en-GB', lookup)).toBe(
      cache.resolve(config, '/guides', 'en-GB', lookup)
    );
  });

  it('keeps a key that did not change between two paths', () => {
    const cache = createDuxtConfigCache();
    const lookup = lookupFor('en-GB');
    const guides = cache.resolve(config, '/guides', 'en-GB', lookup);
    const versioned = cache.resolve(config, '/v1/guides', 'en-GB', lookup);

    expect(versioned.footer).toBe(guides.footer);
    expect(versioned.resolvedSources).toBe(guides.resolvedSources);
    // The changelog entry follows the reader into v1, so the row is new.
    expect(versioned.sections).not.toBe(guides.sections);
  });

  it('starts over when the locale catalogue changes', () => {
    const cache = createDuxtConfigCache();
    const before = cache.resolve(
      config,
      '/guides',
      'en-GB',
      () => undefined,
      'empty'
    );
    expect(before.footer?.copyright).toBe('footer.copyright');

    const after = cache.resolve(
      config,
      '/guides',
      'en-GB',
      lookupFor('en-GB'),
      'loaded'
    );
    expect(after.footer?.copyright).toBe('© Site');
  });

  it('starts over for a new merged config', () => {
    const cache = createDuxtConfigCache();
    const lookup = lookupFor('en-GB');
    cache.resolve(config, '/guides', 'en-GB', lookup);
    const changed = { ...config, title: 'Renamed' } as DuxtConfig;

    expect(cache.resolve(changed, '/guides', 'en-GB', lookup).title).toBe(
      'Renamed'
    );
  });
});
