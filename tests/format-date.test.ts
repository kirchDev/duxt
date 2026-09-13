import { describe, expect, it } from 'vitest';
import { formatDate } from '../app/utils/format-date';

describe('formatDate', () => {
  it('formats a calendar day in the reader`s language', () => {
    expect(formatDate('2026-02-01', 'en', { calendarDay: true })).toBe(
      'Feb 1, 2026'
    );
    expect(formatDate('2026-02-01', 'de', { calendarDay: true })).toBe(
      '01.02.2026'
    );
  });

  it('pins a calendar day to UTC, whatever zone the value was written in', () => {
    // 23:30 in New York is already the next day in UTC — and a calendar day is
    // the UTC one, so server and browser print the same day.
    expect(
      formatDate('2026-02-01T23:30:00-05:00', 'en', { calendarDay: true })
    ).toBe('Feb 2, 2026');
  });

  it('draws nothing for a missing or unreadable date', () => {
    expect(formatDate(undefined, 'en')).toBeUndefined();
    expect(formatDate('one day', 'en')).toBeUndefined();
  });
});
