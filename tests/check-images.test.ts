import { describe, expect, it } from 'vitest';
import { candidateSize, undistorted } from '../scripts/check-images';

/**
 * The badge assertion in `scripts/check-images.ts`, and the parse under it.
 *
 * WHY THIS FILE EXISTS. `check-images.ts` was written because a component
 * nothing renders is a component nothing checks. It then shipped a badge
 * assertion that never ran: the pattern looked for `_s_` where the built page
 * carries `/s_`, so `match` was null on every candidate and the ratio was never
 * compared. A check that cannot go red is a comment with an exit code — the
 * same finding the file was written to answer, reproduced inside the file.
 *
 * THE EXPECTED VALUES ARE NOT RECOMPUTED HERE. They come from `@nuxt/image`'s
 * ipx provider, read at `dist/runtime/providers/ipx.js`: `keyMap.resize = 's'`,
 * the formatter is `key + '_' + value`, operations join with `&`, and the URL is
 * `joinURL(baseURL, params, src)` — so the parameters are one path SEGMENT and
 * the separator before `s_` is a slash, never an underscore. The literals below
 * are candidate URLs of that grammar, as the built page ships them.
 */

describe('candidateSize', () => {
  it('reads the size ipx writes into its parameter segment', () => {
    // The badge's first candidate, exactly as the built page ships it.
    expect(candidateSize('/_ipx/s_160x40/demo/badge.png')).toEqual({
      width: 160,
      height: 40
    });
  });

  it('reads it when another modifier shares the segment', () => {
    // Operations join with `&`, so a format or a quality puts `s_` mid-segment.
    expect(candidateSize('/_ipx/f_webp&s_320x80/demo/badge.png')).toEqual({
      width: 320,
      height: 80
    });
  });

  it('reads nothing from a width-only candidate', () => {
    // No height in the URL means no ratio to read — an unanswered question.
    expect(candidateSize('/_ipx/w_160/demo/badge.png')).toBeNull();
  });

  it('is not fooled by the pattern that never matched', () => {
    // The shipped regex wanted `_s_`; nothing ipx writes has ever contained it.
    expect(
      '/_ipx/s_160x40/demo/badge.png'.match(/_s_(\d+)x(\d+)\//)
    ).toBeNull();
  });
});

/**
 * The badge's three candidates, verbatim from the built page. A 160x40 original
 * asked for at `sm:50vw md:160px` yields exactly these — every one 4:1.
 */
const BADGE =
  '/_ipx/s_160x40/demo/badge.png 160w, ' +
  '/_ipx/s_320x80/demo/badge.png 320w, ' +
  '/_ipx/s_640x160/demo/badge.png 640w';

describe('undistorted', () => {
  it('passes the badge the page actually ships', () => {
    expect(undistorted(BADGE, 4)).toEqual([]);
  });

  it('reports a candidate that has been stretched off the ratio', () => {
    // 160x53 is 3:1 — the badge squashed to fill a wider column.
    const stretched = BADGE.replace('s_160x40', 's_160x53');

    expect(undistorted(stretched, 4)).toEqual([
      'the badge is distorted at 160x53'
    ]);
  });

  /**
   * THE BUG THIS FILE WAS ADDED FOR. The shipped pattern looked for `_s_` and
   * the page carries `/s_`, so every candidate went unread and the function
   * returned no failures — a green that meant nothing. An unreadable candidate
   * is now a defect in its own right, so the grammar moving under the check
   * announces itself instead of quietly disarming it.
   */
  it('fails when no size can be read from a candidate', () => {
    const unreadable =
      '/_ipx/w_160/demo/badge.png 160w, /_ipx/w_320/demo/badge.png 320w';
    const failures = undistorted(unreadable, 4);

    expect(failures).toHaveLength(2);
    expect(failures[0]).toContain('/_ipx/w_160/demo/badge.png');
    expect(failures[0]).toContain('unchecked');
  });

  /**
   * The other silent branch: the call site read `if (badgeSrcset)`, so a badge
   * that had lost its `srcset` altogether — the one regression this fixture was
   * built to catch — took the check straight past it.
   */
  it.each([
    ['missing', null],
    ['empty', ''],
    ['blank', '   ']
  ])('fails when the srcset is %s', (_label, srcset) => {
    const failures = undistorted(srcset, 4);

    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('no srcset');
  });
});
