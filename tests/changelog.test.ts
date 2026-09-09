import { describe, expect, it } from 'vitest';
import {
  changelogAnchor,
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

  it('still gives a name it has never seen a colour of its own', () => {
    // The hint list is a hint, never a taxonomy: a changelog kept in another
    // language has to come out coloured, and the same name has to come out the
    // same colour every time it is drawn.
    const tone = changelogTone('Sonstiges');

    expect(tone.dot).toMatch(/^bg-/);
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
