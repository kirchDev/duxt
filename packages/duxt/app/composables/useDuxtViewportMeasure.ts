/**
 * Run a measurement whenever the window scrolls or resizes — at most once per
 * painted frame.
 *
 * The reading-progress bar and the table of contents both answer a question
 * about where the reader is, and both used to wire up the same two listeners by
 * hand; only one of them coalesced into an animation frame, so the other ran
 * its layout read on every scroll event however fast the wheel turned.
 *
 * Passive listeners, because this must never be what makes scrolling stutter.
 * Measured once on mount, since a page can open already scrolled. Returns the
 * scheduler, for a caller that knows of another moment worth measuring.
 */
import { useEventListener } from '@vueuse/core';

export function useDuxtViewportMeasure(measure: () => void) {
  let frame = 0;

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      measure();
    });
  }

  // `useEventListener` without a target binds to the window, and to nothing at
  // all during server rendering.
  useEventListener(['scroll', 'resize'], schedule, { passive: true });

  onMounted(measure);
  onBeforeUnmount(() => {
    if (frame) cancelAnimationFrame(frame);
  });

  return schedule;
}
