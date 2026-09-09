import { describe, expect, it } from 'vitest';
import {
  changelogAnchor,
  changelogLabel,
  changelogDate,
  changelogTone
} from '../app/utils/changelog';

describe('changelogAnchor', () => {
  it('slugifies the name the file used', () => {
    expect(changelogAnchor('Bug Fixes')).toBe('bug-fixes');
  });

  it('drops the marker release-please writes on a breaking block', () => {
    expect(changelogAnchor('⚠ BREAKING CHANGES')).toBe('breaking-changes');
  });

  it('has no anchor for a name with no ASCII in it', () => {
    // Pointing every group of every release at `#` is worse than not linking.
    expect(changelogAnchor('変更')).toBeUndefined();
  });
});

describe('changelogTone', () => {
  it('gives the conventional names the colour a reader expects', () => {
    expect(changelogTone('Features')).toBe(changelogTone('Features'));
    expect(changelogTone('Features').dot).toContain('emerald');
    expect(changelogTone('Bug Fixes').dot).toContain('amber');
    expect(changelogTone('⚠ BREAKING CHANGES').dot).toContain('rose');
  });

  it('sets a run of text lighter than it fills a dot', () => {
    // A label is words, a dot is a shape, and they do not clear contrast at the
    // same lightness — so the tone carries both and the caller picks by what it
    // is drawing. The pair is the chip's, which is where that was settled.
    const tone = changelogTone('Features');

    expect(tone.dot).toBe('bg-emerald-500');
    expect(tone.text).toBe('text-emerald-700 dark:text-emerald-400');
    expect(tone.chip).toContain('text-emerald-700');
  });

  it('still gives a name it has never seen a colour of its own', () => {
    // The hint list is a hint, never a taxonomy: a changelog kept in another
    // language has to come out coloured, and the same name has to come out the
    // same colour every time it is drawn.
    const tone = changelogTone('Sonstiges');

    expect(tone.dot).toMatch(/^bg-/);
    expect(tone.text).toMatch(/^text-/);
    expect(changelogTone('Sonstiges')).toBe(tone);
  });
});

describe('changelogDate', () => {
  it('formats the day in the reader`s language', () => {
    // Pinned to UTC, because the value is a calendar date and not a moment:
    // read as local time it is the day before for every reader west of
    // Greenwich, and a different day on the server than in the browser.
    expect(changelogDate('2026-02-01', 'en')).toBe('Feb 1, 2026');
    expect(changelogDate('2026-02-01', 'de')).toBe('01.02.2026');
  });

  it('draws nothing for a missing or unreadable date', () => {
    expect(changelogDate(undefined, 'en')).toBeUndefined();
    expect(changelogDate('one day', 'en')).toBeUndefined();
  });
});

describe('changelogLabel', () => {
  it('drops the mark a release tool puts in front of a heading', () => {
    expect(changelogLabel('⚠ BREAKING CHANGES')).toBe('BREAKING CHANGES');
    expect(changelogLabel('🐛 Bug Fixes')).toBe('Bug Fixes');
  });

  it('touches nothing else', () => {
    // Leading only, so a name that uses a symbol keeps it — and a heading that
    // is nothing but a mark comes back whole rather than empty.
    expect(changelogLabel('Features')).toBe('Features');
    expect(changelogLabel('C++ Support')).toBe('C++ Support');
    expect(changelogLabel('[Security]')).toBe('[Security]');
    expect(changelogLabel('⚠')).toBe('⚠');
  });

  it('is what a label shows, never what an anchor is built from', () => {
    // The stored name stays whole: the filter matches on it, the props carry
    // it, and the anchor is slugified from it.
    expect(changelogAnchor('⚠ BREAKING CHANGES')).toBe('breaking-changes');
  });
});
