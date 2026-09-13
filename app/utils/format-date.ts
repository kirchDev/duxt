/**
 * A date, in the reader's language — or nothing, where there is no readable one.
 *
 * One formatter for every date the theme prints, because a date formatted in
 * two places is two chances to print two different days for one fact.
 *
 * `calendarDay` is the one decision a caller makes, and it is about what the
 * value IS. A release date is a calendar day and not a moment: read as local
 * time, `2026-09-08` is the 7th for every reader west of Greenwich — and a
 * different day on the server than in the browser, which is a hydration
 * mismatch as well as a wrong date — so it is pinned to UTC. A commit date IS a
 * moment, and is left in the reader's own zone.
 */
export function formatDate(
  value: string | undefined,
  locale: string,
  { calendarDay = false }: { calendarDay?: boolean } = {}
): string | undefined {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    ...(calendarDay ? { timeZone: 'UTC' } : {})
  }).format(date);
}
