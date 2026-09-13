import { describe, expect, it } from 'vitest';
import { duxtDefaults, mergeDuxtConfig } from '../app/utils/duxt-config';

describe('mergeDuxtConfig', () => {
  it('replaces an array instead of appending to it', () => {
    const merged = mergeDuxtConfig(
      { navigation: [{ label: 'Mine' }] },
      { navigation: [{ label: 'Theirs' }, { label: 'Also theirs' }] }
    );
    expect(merged.navigation).toEqual([{ label: 'Mine' }]);
  });

  it('merges objects key by key', () => {
    const merged = mergeDuxtConfig(
      { footer: { copyright: 'Mine' } },
      { footer: { copyright: 'Theirs', legal: [{ label: 'Kept' }] } }
    );
    expect(merged.footer).toEqual({
      copyright: 'Mine',
      legal: [{ label: 'Kept' }]
    });
  });

  it('keeps the base where the override says nothing', () => {
    expect(mergeDuxtConfig(undefined, { title: 'duxt' })).toEqual({
      title: 'duxt'
    });
    expect(mergeDuxtConfig({}, { title: 'duxt' })).toEqual({ title: 'duxt' });
  });

  it('lets a scalar override a scalar', () => {
    expect(mergeDuxtConfig({ title: 'mine' }, { title: 'duxt' }).title).toBe(
      'mine'
    );
  });

  it('lets false through, rather than treating it as absent', () => {
    expect(
      mergeDuxtConfig({ breadcrumb: false }, { breadcrumb: true }).breadcrumb
    ).toBe(false);
  });

  it('replaces a nested array too', () => {
    const merged = mergeDuxtConfig(
      { landing: { features: [{ title: 'One' }] } },
      {
        landing: {
          headline: 'Kept',
          features: [{ title: 'A' }, { title: 'B' }]
        }
      }
    );
    expect(merged.landing).toEqual({
      headline: 'Kept',
      features: [{ title: 'One' }]
    });
  });

  it('does not mutate the base it merges over', () => {
    const base = { navigation: [{ label: 'Theirs' }] };
    mergeDuxtConfig({ navigation: [{ label: 'Mine' }] }, base);
    expect(base.navigation).toEqual([{ label: 'Theirs' }]);
  });
});

describe('consumer-owned layer controls', () => {
  it('ships the issue defaults', () => {
    expect(duxtDefaults.copy?.models).toHaveLength(2);
    expect(duxtDefaults.contributors?.avatarUrl).toContain('{username}');
    expect(duxtDefaults.toc).toEqual({ depth: 3, scrollOffset: 96 });
    expect(duxtDefaults.search).toEqual({
      fuzzy: { threshold: 0.35, minMatchCharLength: 3, limit: 20 },
      recentPages: 5
    });
    expect(duxtDefaults.openapi).toEqual({ exampleDepth: 6, schemaDepth: 8 });
  });

  it('replaces a model list', () => {
    const config = mergeDuxtConfig({ copy: { models: [] } }, duxtDefaults);
    expect(config.copy?.models).toEqual([]);
  });

  it('leaves global single-character shortcuts on until a site says otherwise', () => {
    expect(duxtDefaults.shortcuts).toEqual({ singleCharacter: true });
  });

  it('takes a site opting out of unmodified global keys', () => {
    const config = mergeDuxtConfig(
      { shortcuts: { singleCharacter: false } },
      duxtDefaults
    );

    expect(config.shortcuts).toEqual({ singleCharacter: false });
  });

  // The layer ships NO analytics destination, because it cannot have one: a
  // default here would send somebody else's readers somewhere nobody chose.
  it('leaves analytics unconfigured, so a site reports nothing until it says so', () => {
    expect(duxtDefaults.analytics).toBeUndefined();
  });

  it('takes a site that wires a callback, over defaults that name none', () => {
    const track = () => undefined;
    const config = mergeDuxtConfig({ analytics: { track } }, duxtDefaults);

    expect(config.analytics?.track).toBe(track);
    // And has not flattened the rest of the config on the way past it.
    expect(config.toc).toEqual({ depth: 3, scrollOffset: 96 });
  });
});
