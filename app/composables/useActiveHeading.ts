/**
 * The heading currently in view, for marking the table of contents.
 *
 * WHY NOT AN INTERSECTIONOBSERVER, which is the obvious tool and was the first
 * implementation here: it reports crossings, not state, so it can only answer
 * "which heading last entered the band". Three cases have no crossing to
 * report, and in all three the marker stuck to the wrong entry:
 *
 *   - the last section on the page, whose heading can never reach a trigger
 *     line 30% down the viewport because the document runs out of scroll first;
 *   - a section longer than the viewport, where the heading has left the band
 *     above and the next has not arrived, so nothing fires for a whole screen
 *     of reading;
 *   - a jump — a hash on load, a click in this very list — which can skip a
 *     heading past the band entirely without ever intersecting it.
 *
 * Reading positions instead answers the question directly: the active heading
 * is the LAST one whose top has passed the trigger line. That is true at every
 * scroll offset rather than only at the moments something crossed, so all three
 * cases fall out of it. The bottom of the document is the one place the rule
 * still needs help — see below.
 *
 * The cost is running on scroll rather than on crossings. It is one
 * `getBoundingClientRect` per heading, coalesced into an animation frame, so at
 * most one pass per painted frame however fast the wheel turns.
 */
export function useActiveHeading(ids: Ref<string[]>, scrollOffset = 96) {
  const active = ref<string>();

  /** Where a heading counts as reached: reading position, not the top edge. */
  let frame = 0;

  function measure() {
    frame = 0;

    const headings = ids.value
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!headings.length) {
      active.value = undefined;
      return;
    }

    // At the end of the document no further scrolling is possible, so the
    // trigger line can no longer reach what is left. Everything still below it
    // would stay unreachable forever; the last heading is the honest answer.
    const atBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 2;

    if (atBottom) {
      active.value = headings.at(-1)!.id;
      return;
    }

    let current = headings[0]!;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top > scrollOffset) break;
      current = heading;
    }

    active.value = current.id;
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(measure);
  }

  onMounted(() => {
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
  });

  // A new page's headings exist only after it renders, and the ids change
  // before the DOM does.
  watch(ids, () => nextTick(measure));

  onBeforeUnmount(() => {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
  });

  return active;
}
