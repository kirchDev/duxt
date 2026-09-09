/**
 * Is the second navbar row showing?
 *
 * Two things need the answer and must not disagree about it: `DuxtSections`,
 * which draws the row only where one of its sections is current — a page
 * outside every section, or a generated section whose entry the site put in the
 * top row instead, would otherwise get the whole row with nothing marked — and
 * the LAYOUTS, whose sticky columns are offset by exactly the header above
 * them. Answered in one place because a mismatch is silent: the row vanishes
 * and the sidebars keep the gap where it used to be.
 */
export function useDuxtSectionRow() {
  const duxt = useDuxtConfig();
  const path = useDuxtPath();

  /**
   * THIS AREA'S ENTRIES, not every entry the site declared — see
   * `sectionsForPath`. A second source has top-level parts of its own, and the
   * row is "the parts of what you are reading" rather than a site index.
   */
  const sections = computed(() =>
    sectionsForPath(duxt.sections ?? [], duxt.resolvedSources ?? [], path.value)
  );

  const visible = computed(() =>
    sections.value.some(
      (section) => section.to && path.value.startsWith(section.to)
    )
  );

  /**
   * How far down the page the header reaches — the navbar, plus the section row
   * where there is one — as a length the layouts hand down in
   * `--duxt-header-offset`.
   *
   * NOT `chrome`, which is what this was called. The word is right in the sense
   * an interface means it and wrong in the sense most readers reach for first,
   * and a name that has to be explained is a name chosen badly.
   * `DuxtLiveWindow`'s `chrome` prop keeps it, because there it really is a
   * drawn browser bar.
   *
   * A CSS variable rather than a class per case: the sticky columns live in
   * three layouts and in the page's own contents column, and four copies of a
   * pair of arbitrary values is four places to forget one.
   */
  const headerOffset = computed(() => (visible.value ? '6.5rem' : '3.75rem'));

  return { sections, visible, headerOffset };
}
