import { describe, expect, it } from 'vitest';
import { resolveDuxtText, resolveDuxtTexts } from '../app/utils/duxt-text';

/** Stands in for i18n: only these keys are registered. */
const lookup = (key: string) =>
  ({ 'nav.guide': 'Anleitung', 'duxt.defaults.aside.title': 'Community' })[key];

describe('resolveDuxtText', () => {
  it('translates a registered key', () => {
    expect(resolveDuxtText('nav.guide', 'de-DE', lookup)).toBe('Anleitung');
  });

  it('leaves an unregistered string as the text itself', () => {
    // The single-language case: a label is a label, not a broken key.
    expect(resolveDuxtText('Guide', 'de-DE', lookup)).toBe('Guide');
  });

  it('picks the exact locale out of a record', () => {
    const value = { 'en-GB': 'Guide', 'de-DE': 'Anleitung' };
    expect(resolveDuxtText(value, 'de-DE', lookup)).toBe('Anleitung');
  });

  it('falls back to the same language in another region', () => {
    // A record written for pt-PT should not leave a Brazilian reader in English.
    const value = { 'en-GB': 'Guide', 'pt-PT': 'Guia' };
    expect(resolveDuxtText(value, 'pt-BR', lookup)).toBe('Guia');
  });

  it('falls back to the first entry when the language is absent', () => {
    const value = { 'en-GB': 'Guide', 'de-DE': 'Anleitung' };
    expect(resolveDuxtText(value, 'fr-FR', lookup)).toBe('Guide');
  });
});

describe('resolveDuxtTexts', () => {
  it('resolves text keys and leaves everything else alone', () => {
    const resolved = resolveDuxtTexts(
      {
        sections: [
          { label: 'nav.guide', to: '/guide', icon: 'lucide:book-open' }
        ],
        aside: { title: 'duxt.defaults.aside.title' }
      },
      'de-DE',
      lookup
    );

    expect(resolved.sections[0]!.label).toBe('Anleitung');
    // The whole point of the allowlist: a URL never reaches the lookup.
    expect(resolved.sections[0]!.to).toBe('/guide');
    expect(resolved.sections[0]!.icon).toBe('lucide:book-open');
    expect(resolved.aside.title).toBe('Community');
  });

  it('walks into a text key that carries a structure', () => {
    // `badge` takes either a text or a whole badge. Treating the object as a
    // locale record left `label` unresolved and rendered the record itself.
    const resolved = resolveDuxtTexts(
      {
        badge: {
          label: { 'en-GB': 'Latest release', 'de-DE': 'Neuestes Release' },
          icon: 'lucide:rocket',
          to: 'https://example.com/releases'
        }
      },
      'de-DE',
      lookup
    );

    expect(resolved.badge.label).toBe('Neuestes Release');
    expect(resolved.badge.icon).toBe('lucide:rocket');
    expect(resolved.badge.to).toBe('https://example.com/releases');
  });

  it('still resolves a text key that IS a locale record', () => {
    const resolved = resolveDuxtTexts(
      { badge: { 'en-GB': 'Beta', 'de-DE': 'Beta-Version' } },
      'de-DE',
      lookup
    );

    expect(resolved.badge).toBe('Beta-Version');
  });

  it('resolves every prose key the landing page renders', () => {
    // The regression: `highlightsTitle` is prose, was not on the allowlist, and
    // so reached the page as its own locale record printed as JSON. Named one
    // by one rather than derived, because deriving them from the type is
    // exactly what the allowlist refuses to do.
    const record = { 'en-GB': 'And the rest', 'de-DE': 'Und der Rest' };

    const resolved = resolveDuxtTexts(
      {
        landing: {
          headline: record,
          description: record,
          highlightsTitle: record,
          stats: [{ value: '7', label: record }],
          demo: { tabs: [{ label: record, to: '/guide' }] },
          showcase: [
            {
              badge: record,
              title: record,
              description: record,
              bullets: [{ label: record }],
              action: { label: record, to: '/guide' }
            }
          ],
          highlights: [{ title: record, description: record }]
        }
      },
      'de-DE',
      lookup
    );

    const { landing } = resolved;

    expect(landing.headline).toBe('Und der Rest');
    expect(landing.description).toBe('Und der Rest');
    expect(landing.highlightsTitle).toBe('Und der Rest');
    expect(landing.stats[0]!.label).toBe('Und der Rest');
    expect(landing.demo.tabs[0]!.label).toBe('Und der Rest');
    expect(landing.showcase[0]!.badge).toBe('Und der Rest');
    expect(landing.showcase[0]!.title).toBe('Und der Rest');
    expect(landing.showcase[0]!.bullets[0]!.label).toBe('Und der Rest');
    expect(landing.showcase[0]!.action.label).toBe('Und der Rest');
    expect(landing.highlights[0]!.title).toBe('Und der Rest');

    // The paths beside them are untouched, which is what the allowlist is for.
    expect(landing.demo.tabs[0]!.to).toBe('/guide');
    expect(landing.showcase[0]!.action.to).toBe('/guide');
  });

  it('does not touch a string under a non-text key', () => {
    // `nav.guide` IS a registered key — it still must not be translated here,
    // because `to` is a path and paths are not prose.
    const resolved = resolveDuxtTexts({ to: 'nav.guide' }, 'de-DE', lookup);
    expect(resolved.to).toBe('nav.guide');
  });
});

it('resolves a source display name, leaving the addresses beside it alone', () => {
  const resolved = resolveDuxtTexts(
    {
      resolvedSources: [
        {
          collection: 'docs_demo',
          prefix: '/demo',
          repo: 'demo',
          name: { 'en-GB': 'Demo', 'de-DE': 'Demonstration' }
        }
      ]
    },
    'de-DE',
    lookup
  );

  expect(resolved.resolvedSources[0]!.name).toBe('Demonstration');
  expect(resolved.resolvedSources[0]!.repo).toBe('demo');
  expect(resolved.resolvedSources[0]!.collection).toBe('docs_demo');
  expect(resolved.resolvedSources[0]!.prefix).toBe('/demo');
});
