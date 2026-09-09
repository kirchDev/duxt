/**
 * What a release history needs beyond the pages the parser writes: the anchor a
 * group is linked at, the colour it is drawn in, and the day it was cut.
 *
 * Here rather than in the components because TWO PLACES have to agree about an
 * id — the heading `ChangelogGroup` draws, and the contents column built from
 * the page's own AST (`generated-toc.ts`), which never sees that component
 * render. A slug computed twice is a contents column whose links go nowhere.
 *
 * Named exports rather than auto-imports read from a test: the same reason
 * `generated-sections.ts` gives, and the same tests.
 */

/**
 * The anchor a group heading gets, or nothing when the name has no ASCII in it.
 *
 * Undefined rather than a fallback: a heading a component draws is not in the
 * outline Content slugifies, so there is nothing upstream to fall back TO, and
 * pointing every group of every release at `#` is worse than not linking one.
 */
export function changelogAnchor(name: string): string | undefined {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || undefined
  );
}

/**
 * The mark a release tool puts in FRONT of a heading, dropped.
 *
 * `\p{S}` is symbols — the `⚠` release-please writes on its breaking block, an
 * emoji a hand-kept changelog opens a section with. LEADING ONLY: a name that
 * uses a symbol anywhere else keeps it, so `C++ Support` survives, and a
 * heading that is nothing BUT a mark comes back untouched rather than emptied.
 *
 * The stored name stays whole either way. This is what a label SHOWS — never
 * what the filter matches, what the anchor is built from, or what travels as a
 * prop — which is also why the mark is drawn away rather than parsed away: the
 * file said it, and a site that wants it back overrides the component instead
 * of the changelog.
 */
export function changelogLabel(name: string): string {
  return name.replace(/^[\p{S}\s]+/u, '').trim() || name;
}

/** The classes one group is drawn with: a dot, a run of text, a filter chip. */
export interface DuxtChangelogTone {
  /** A filled dot — the group's identity wherever the name is already there. */
  dot: string;
  /**
   * The NAME set in the tone, for the label a release page heads its group
   * with.
   *
   * A separate value rather than the dot's colour reused, because a filled
   * shape and a run of text do not clear contrast at the same lightness: the
   * `500` a 6-pixel dot is drawn in is well under the floor for words.
   *
   * `700` / `400` is the most saturated pair the ramp offers that still clears
   * AA on both grounds — measured, not picked: on white, `600` fails for four
   * of the six hues (amber 3.2, emerald 3.7, cyan 3.7, sky 4.1), so the light
   * side stops at `700`. The dark side has the room, which is why it takes
   * `400` rather than the `300` the chip uses: on the page background it
   * measures 7.0–11.5 and on a card 6.3–10.4, and it is the half a reader of a
   * dark site actually sees.
   */
  text: string;
  /** A tinted surface with a matching ring, for the filter chip. */
  chip: string;
}

/**
 * The palette, as `DuxtOpenApiMethod` builds one: Tailwind's ramp with a
 * lighter text in dark mode, so every pair clears the contrast floor in both
 * themes without adding six token pairs a consumer would have to override.
 */
const TONES: DuxtChangelogTone[] = [
  {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
    chip: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300'
  },
  {
    dot: 'bg-sky-500',
    text: 'text-sky-700 dark:text-sky-400',
    chip: 'bg-sky-500/10 text-sky-700 ring-sky-500/30 dark:text-sky-300'
  },
  {
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
    chip: 'bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-300'
  },
  {
    dot: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-400',
    chip: 'bg-violet-500/10 text-violet-700 ring-violet-500/30 dark:text-violet-300'
  },
  {
    dot: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-400',
    chip: 'bg-rose-500/10 text-rose-700 ring-rose-500/30 dark:text-rose-300'
  },
  {
    dot: 'bg-cyan-500',
    text: 'text-cyan-700 dark:text-cyan-400',
    chip: 'bg-cyan-500/10 text-cyan-700 ring-cyan-500/30 dark:text-cyan-300'
  }
];

/**
 * The names that get the colour a reader expects, keyed by an English word the
 * heading CONTAINS.
 *
 * A HINT, never a taxonomy — which is the whole difference from a mapping the
 * parser would have needed. `sections-changelog.ts` takes group names verbatim
 * because a fixed set fails silently on the first heading it does not know;
 * here the failure is that a group is drawn cyan instead of green, and the
 * fallback below still gives it a colour of its own. So the list stays short
 * and covers what release-please and Keep a Changelog write, and a changelog
 * kept in another language simply falls through to the hash.
 */
const BREAKING = /break|inkompat|incompat/i;

const HINTS: [RegExp, number][] = [
  [BREAKING, 4],
  [/feat|added|neu/i, 0],
  [/fix|bug|behoben/i, 2],
  [/perf/i, 3],
  [/doc/i, 1],
  [/deprecat|remov|revert/i, 4],
  [/depend|chore|build|ci|refactor|misc/i, 5]
];

/**
 * A stable colour for a group name.
 *
 * The fallback is a hash rather than one grey for everything, because the point
 * of the colour is that a reader scanning forty releases finds the same kind of
 * change in the same colour every time — which a hash gives in any language,
 * for any heading, with nothing configured.
 */
export function changelogTone(name: string): DuxtChangelogTone {
  for (const [pattern, index] of HINTS) {
    if (pattern.test(name)) return TONES[index]!;
  }

  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.codePointAt(0)!) % 0xffffffff;
  }

  return TONES[hash % TONES.length]!;
}

/**
 * A release day, in the reader's language.
 *
 * `timeZone: 'UTC'` because the value is a calendar date and not a moment: read
 * as local time, `2026-09-08` is the 7th for every reader west of Greenwich —
 * and a different day on the server than in the browser, which is a hydration
 * mismatch as well as a wrong date.
 *
 * Here rather than beside one of its callers because TWO of them draw it — the
 * timeline on the overview and the meta row on the release page — and a date
 * formatted in two places is two chances to print two different days for one
 * release.
 */
export function changelogDate(
  value: string | undefined,
  locale: string
): string | undefined {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'UTC'
  }).format(date);
}
