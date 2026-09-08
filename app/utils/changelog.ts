/**
 * What a release history needs beyond the pages the parser writes: the anchor a
 * group is linked at, and the colour it is drawn in.
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

/** The classes one group is drawn with: the dot, and the chip around a filter. */
export interface DuxtChangelogTone {
  /** A filled dot — the group's identity wherever the name is already there. */
  dot: string;
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
    chip: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300'
  },
  {
    dot: 'bg-sky-500',
    chip: 'bg-sky-500/10 text-sky-700 ring-sky-500/30 dark:text-sky-300'
  },
  {
    dot: 'bg-amber-500',
    chip: 'bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-300'
  },
  {
    dot: 'bg-violet-500',
    chip: 'bg-violet-500/10 text-violet-700 ring-violet-500/30 dark:text-violet-300'
  },
  {
    dot: 'bg-rose-500',
    chip: 'bg-rose-500/10 text-rose-700 ring-rose-500/30 dark:text-rose-300'
  },
  {
    dot: 'bg-cyan-500',
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
const HINTS: [RegExp, number][] = [
  [/break/i, 4],
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
