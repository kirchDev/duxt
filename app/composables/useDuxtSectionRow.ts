/**
 * Is the second navbar row showing?
 *
 * Two things need the answer and must not disagree about it: `DuxtSections`,
 * which draws the row only where one of its sections is current — a page
 * outside every section, or a generated section whose entry the site put in the
 * top row instead, would otherwise get the whole row with nothing marked — and
 * the LAYOUTS, whose sticky columns are offset by exactly the chrome above
 * them. Answered in one place because a mismatch is silent: the row vanishes
 * and the sidebars keep the gap where it used to be.
 */
export function useDuxtSectionRow() {
  const duxt = useDuxtConfig();
  const path = useDuxtPath();

  const visible = computed(() =>
    (duxt.sections ?? []).some(
      (section) => section.to && path.value.startsWith(section.to)
    )
  );

  /**
   * How far down the page the chrome reaches, as a length the layouts hand
   * down in `--duxt-chrome`.
   *
   * A CSS variable rather than a class per case: the sticky columns live in
   * three layouts and in the page's own contents column, and four copies of a
   * pair of arbitrary values is four places to forget one.
   */
  const chrome = computed(() => (visible.value ? '6.5rem' : '3.75rem'));

  return { visible, chrome };
}
