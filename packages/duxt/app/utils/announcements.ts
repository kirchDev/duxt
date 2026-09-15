/**
 * Which announcement a reader dismissed, and which are due to be shown.
 *
 * Pure on purpose: the browser is what evaluates an announcement's time window
 * and what remembers a dismissal, so every one of these answers depends on a
 * clock and a set that only exist client-side. Keeping the arithmetic here
 * rather than in the component is what lets it be tested at all — see
 * `tests/announcements.test.ts`.
 */

/**
 * Where an announcement that names no placement goes.
 *
 * The loudest of the three, because the announcements a site actually writes
 * are releases and outages — a notice that has to be configured before it says
 * anything may as well default to being seen.
 */
export const DUXT_ANNOUNCEMENT_PLACEMENT: DuxtAnnouncementPlacement =
  'above-header';

/**
 * A value written the same way however its object literal was typed.
 *
 * Keys sorted, because a locale record is an object and object key order is
 * whatever the config file happened to use: a consumer alphabetising
 * `{ de, en }` into `{ en, de }` must not resurrect a notice every reader has
 * already dismissed.
 */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`);

  return `{${entries.join(',')}}`;
}

/**
 * FNV-1a, as a short base-36 string.
 *
 * Not a cryptographic hash and not trying to be: the worst a collision can do
 * is leave one announcement hidden for a reader who dismissed another, and the
 * alternative — `crypto.subtle.digest` — is asynchronous, which a computed
 * property cannot be.
 */
function fingerprint(value: string): string {
  let hash = 0x81_1c_9d_c5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    // The FNV prime, by shifts: `hash * 16777619` overflows a double's exact
    // integer range and starts losing the low bits it exists to mix.
    hash = Math.imul(hash, 0x01_00_01_93);
  }

  return (hash >>> 0).toString(36);
}

/**
 * A configured bound as a timestamp, or nothing.
 *
 * An unparseable date is treated as ABSENT rather than as "never": a typo in
 * `endsAt` then leaves the notice showing, which somebody notices, instead of
 * silently swallowing the announcement it was supposed to close.
 */
function boundary(value: string | undefined): number | undefined {
  if (!value) return undefined;

  const parsed = Date.parse(value);

  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Is this announcement inside its window at `now`?
 *
 * Half-open: it shows FROM `startsAt` and UNTIL `endsAt`, so a window ending
 * where the next one begins never draws both for the same millisecond. No
 * window at all means always.
 */
export function duxtAnnouncementActive(
  announcement: DuxtAnnouncement,
  now: number
): boolean {
  const starts = boundary(announcement.startsAt);
  const ends = boundary(announcement.endsAt);

  return (
    (starts === undefined || now >= starts) &&
    (ends === undefined || now < ends)
  );
}

/**
 * The identity a dismissal is remembered under.
 *
 * A configured `id` wins and is the whole answer. Without one the identity is
 * the announcement's CONTENT — every locale of it at once, so switching
 * language keeps the dismissal, and any edit to the wording makes it a new
 * announcement every reader is shown again.
 */
export function duxtAnnouncementKey(announcement: DuxtAnnouncement): string {
  if (announcement.id) return announcement.id;

  // The CONTENT, and nothing else: `placement` moves the same sentence and a
  // window only says how long it runs, so neither makes a notice new.
  return fingerprint(
    canonical({ text: announcement.text, link: announcement.link })
  );
}

/** What a placement is asked for: the reader's clock, and what they dismissed. */
export interface DuxtVisibleAnnouncementsOptions {
  placement: DuxtAnnouncementPlacement;
  now: number;
  dismissed: readonly string[];
  maxVisible?: DuxtAnnouncementMaxVisible;
}

/**
 * This placement's cap, or `undefined` for no cap.
 *
 * `null` and an absent key mean the same thing on purpose: a consumer lifting
 * one placement's limit should not have to remember which of the two spellings
 * the config reader happens to honour.
 */
export function duxtAnnouncementLimit(
  maxVisible: DuxtAnnouncementMaxVisible | undefined,
  placement: DuxtAnnouncementPlacement
): number | undefined {
  if (maxVisible === undefined || maxVisible === null) return undefined;
  if (typeof maxVisible === 'number') return maxVisible;

  return maxVisible[placement] ?? undefined;
}

/**
 * The announcements one placement draws, in the order they were configured.
 *
 * Order is the consumer's, never a ranking of ours: a list is read top to
 * bottom, and a notice that moved because another one expired is a notice the
 * reader has to find again.
 */
export function duxtVisibleAnnouncements(
  announcements: readonly DuxtAnnouncement[] | undefined,
  options: DuxtVisibleAnnouncementsOptions
): DuxtAnnouncement[] {
  const dismissed = new Set(options.dismissed);

  const due = (announcements ?? []).filter(
    (announcement) =>
      (announcement.placement ?? DUXT_ANNOUNCEMENT_PLACEMENT) ===
        options.placement &&
      duxtAnnouncementActive(announcement, options.now) &&
      !dismissed.has(duxtAnnouncementKey(announcement))
  );

  const limit = duxtAnnouncementLimit(options.maxVisible, options.placement);

  // AFTER the dismissals, not before: the cap is how many a reader looks at,
  // so closing the top one promotes the next rather than retiring it unseen.
  return limit === undefined ? due : due.slice(0, Math.max(0, limit));
}

/**
 * When the configured list next changes what it would draw.
 *
 * A window has to open and close on the reader's clock, and the two ways to do
 * that are to poll and to wait for the one moment that matters. This is the
 * second: the component sleeps until this timestamp and re-reads then, so a
 * page left open overnight is right in the morning without a timer ticking
 * through the night.
 *
 * `undefined` where nothing is scheduled — which is the ordinary case, and
 * costs no timer at all.
 */
export function duxtNextAnnouncementChange(
  announcements: readonly DuxtAnnouncement[] | undefined,
  now: number
): number | undefined {
  let next: number | undefined;

  for (const announcement of announcements ?? []) {
    for (const bound of [
      boundary(announcement.startsAt),
      boundary(announcement.endsAt)
    ]) {
      // Strictly ahead: a boundary the reader has already passed changes
      // nothing, and one exactly at `now` has already been accounted for by
      // `duxtAnnouncementActive`.
      if (
        bound !== undefined &&
        bound > now &&
        (next === undefined || bound < next)
      ) {
        next = bound;
      }
    }
  }

  return next;
}
