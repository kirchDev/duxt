import { describe, expect, it } from 'vitest';
import { mergeDuxtConfig } from '../app/utils/duxt-config';

describe('mergeDuxtConfig', () => {
  it('replaces an array instead of appending to it', () => {
    // The whole reason this exists: defu concatenates, so a consumer setting
    // `navigation` would get the layer's entries appended to its own.
    const merged = mergeDuxtConfig(
      { navigation: [{ label: 'Mine' }] },
      {
        navigation: [{ label: 'Theirs' }, { label: 'Also theirs' }]
      }
    );

    expect(merged.navigation).toEqual([{ label: 'Mine' }]);
  });

  it('merges objects key by key', () => {
    const merged = mergeDuxtConfig(
      { footer: { note: 'Mine' } },
      { footer: { note: 'Theirs', columns: [{ title: 'Kept' }] } }
    );

    expect(merged.footer).toEqual({
      note: 'Mine',
      columns: [{ title: 'Kept' }]
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
    // `breadcrumb: false` is the point of the switch; a truthiness check here
    // would make it impossible to turn off.
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
