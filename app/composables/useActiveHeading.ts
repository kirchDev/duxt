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

  function measure() {
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

    // THE LINE IS NEVER ABOVE WHERE A JUMP PARKS THE HEADING. A click in the
    // outline scrolls the heading to its own `scroll-margin-top` — 112px, to
    // clear the header AND the section row — and a fixed 96px line sat above
    // that, so the heading just jumped to was not yet "passed" and the entry
    // before it stayed marked. Reading the margin off the heading follows
    // whatever the sticky stack is on this page and at this width; the
    // configured offset remains the floor. The pixel absorbs sub-pixel scroll
    // positions.
    let current = headings[0]!;
    for (const heading of headings) {
      const margin = Number.parseFloat(
        getComputedStyle(heading).scrollMarginTop
      );
      const line =
        Math.max(scrollOffset, Number.isNaN(margin) ? 0 : margin) + 1;
      if (heading.getBoundingClientRect().top > line) break;
      current = heading;
    }

    active.value = current.id;
  }

  useDuxtViewportMeasure(measure);

  // A new page's headings exist only after it renders, and the ids change
  // before the DOM does.
  watch(ids, () => nextTick(measure));

  return active;
}
