/**
 * Which way round the interface is drawn.
 *
 * `auto` is deliberately absent. i18n lets a locale declare it, but it is a
 * per-element CONTENT heuristic — the browser guessing at a run of text — and
 * not a layout direction. Chrome cannot be mirrored on "it depends", so the
 * resolver below collapses it to `ltr` rather than carrying a third state that
 * nothing downstream could act on.
 */
export type DuxtDirection = 'ltr' | 'rtl';

/** The shape i18n hands back from `locales`: objects, or bare codes. */
export type DuxtLocaleEntry =
  | string
  | { code: string; dir?: 'ltr' | 'rtl' | 'auto' };

/**
 * The direction the active locale declares, or left-to-right.
 *
 * THE DECLARATION IS THE ONLY SOURCE. The layer does not keep a list of
 * right-to-left languages and does not guess from a script or a region: a
 * locale is right-to-left because its entry says `dir: 'rtl'`, which is the
 * one place a consumer adding a language can state it. Guessing would mean a
 * consumer's own locale silently rendering mirrored — or, worse, silently not.
 *
 * Shared by `app.vue` and `error.vue` on purpose. The error page REPLACES the
 * app shell rather than nesting inside it, so a direction computed inline in
 * one of them is a direction the other does not have — which is precisely how
 * `error.vue` came to set `lang` and never `dir`.
 */
export function localeDirection(
  locales: readonly DuxtLocaleEntry[],
  active: string
): DuxtDirection {
  const entry = locales.find(
    (candidate) =>
      (typeof candidate === 'string' ? candidate : candidate.code) === active
  );

  if (typeof entry !== 'object' || !entry) return 'ltr';

  return entry.dir === 'rtl' ? 'rtl' : 'ltr';
}
