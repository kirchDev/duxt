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

  it('does not touch a string under a non-text key', () => {
    // `nav.guide` IS a registered key — it still must not be translated here,
    // because `to` is a path and paths are not prose.
    const resolved = resolveDuxtTexts({ to: 'nav.guide' }, 'de-DE', lookup);
    expect(resolved.to).toBe('nav.guide');
  });
});
