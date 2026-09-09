/**
 * A box whose height FOLLOWS its content instead of switching to it.
 *
 * Two places need this and they need exactly the same thing: the request-sample
 * card, whose `curl` of four lines becomes a Go client of twenty, and
 * `CodeGroup`, whose tabs hold files of different lengths. Both used to change
 * height in a single frame, which moves everything below them at once.
 *
 * MEASURED, because CSS cannot do it. `transition: height` needs two computed
 * values to travel between, and a box that sizes to its content is `auto`
 * before and `auto` after — no change a browser can see. `interpolate-size:
 * allow-keywords` does not help either: it makes `auto` a value a transition
 * can REACH, not one that transitions to itself.
 *
 * A `ResizeObserver` rather than a watcher on whatever changed, and that is the
 * part that matters. Highlighted code arrives asynchronously — the string
 * changes on the click, the markup a tick or two later — so anything measuring
 * straight after the click measures the content on its way out. The observer
 * measures what is actually there, whenever it is there, and catches the other
 * reasons a box resizes too: the window narrowing, a line rewrapping, a font
 * finishing loading.
 */

/**
 * The step the height moves in — a line of code plus its leading.
 *
 * A threshold on the CHANGE was the first attempt and it still jumped: below it
 * the box snapped, above it the box slid, and a reader switching tabs got both.
 * A grid removes the small changes instead of deciding what to do about them. A
 * reflow of two pixels lands on the same step and is not a height change at
 * all; a different file is at least one step away and always animates.
 *
 * The buffer it adds is never more than a line's worth of space under the last
 * line.
 */
const HEIGHT_STEP = 24;

/**
 * How long a measurement has to hold still before it counts.
 *
 * Long enough to cover an unmount, a mount and the tick that swaps plain code
 * for highlighted code; short enough that the box does not feel late. Every
 * resize inside the window replaces the one before it, so only the last one is
 * ever acted on.
 */
const SETTLE_MS = 60;

/**
 * How long the content takes to come back once the box is on its way.
 *
 * Shorter than the box's own 300ms on purpose: the point is to be readable
 * again well before the box stops moving, not to make the reader wait out two
 * animations in a row.
 */
const FADE_MS = 200;

export function useDuxtAnimatedHeight(
  shell: Readonly<import('vue').ShallowRef<HTMLElement | null>>,
  body: Readonly<import('vue').ShallowRef<HTMLElement | null>>,
  /** Whether to follow at all — a layout that should size at once passes false. */
  enabled: () => boolean = () => true
): void {
  onMounted(() => {
    if (!enabled() || !('ResizeObserver' in window)) return;

    const box = shell.value;
    const content = body.value;
    if (!box || !content) return;

    // The box carries the border and `box-sizing: border-box`, so its height
    // has to include what that border takes; the content's height does not.
    const chrome = box.offsetHeight - box.clientHeight;

    const step = (height: number) =>
      Math.ceil((height + chrome) / HEIGHT_STEP) * HEIGHT_STEP;

    let last = step(content.offsetHeight);

    // PIN THE STARTING HEIGHT, without animating to it.
    //
    // Until a height is set the box is `auto`, and `auto` is not a value a
    // transition can travel FROM — so the very first change jumped instead of
    // sliding, however carefully everything after it was handled. Set once, on
    // mount, with the transition off for that one frame.
    box.style.transition = 'none';
    box.style.height = `${last}px`;
    requestAnimationFrame(() => {
      box.style.transition = '';
    });

    let settle: ReturnType<typeof setTimeout> | undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const observer = new ResizeObserver(() => {
      const next = step(content.offsetHeight);
      if (next === last) return;

      // THE CONTENT FADES WHILE THE BOX TRAVELS.
      //
      // The new panel is there the instant the tab is clicked, and until the
      // box has grown to fit it, `overflow-hidden` cuts it off — a taller
      // sample appeared with its last lines sliced away for the length of the
      // animation. Hidden for that moment and faded back in as the box arrives,
      // there is nothing cut off to see: what a reader watches is one sample
      // replacing another, not a box catching up with its contents.
      //
      // Set with the transition off, so it is instant going out and animated
      // coming back — a fade in both directions would be twice as long a wait
      // for the same effect.
      if (!reduced.matches) {
        content.style.transition = 'none';
        content.style.opacity = '0';
      }

      // ONLY THE VALUE IT SETTLES ON, never the ones on the way.
      //
      // A tab change is not one resize, it is several: the old panel unmounts,
      // leaving nothing for a frame; the new one mounts unhighlighted; the
      // highlighted markup replaces it a tick later. Followed literally, the box
      // collapsed to nothing, sprang open at one size and slid to another —
      // which is the "the tab disappears first, then it expands" of it.
      //
      // Waiting for the measurement to hold still skips all of that: one
      // animation, from the height before the click to the height after it.
      clearTimeout(settle);
      settle = setTimeout(() => {
        const settled = step(content.offsetHeight);

        if (settled !== last) {
          last = settled;
          box.style.height = `${settled}px`;
        }

        if (!reduced.matches) {
          requestAnimationFrame(() => {
            content.style.transition = `opacity ${FADE_MS}ms ease-out`;
            content.style.opacity = '1';
          });
        }
      }, SETTLE_MS);
    });

    observer.observe(content);

    onBeforeUnmount(() => {
      observer.disconnect();
      clearTimeout(settle);
      box.style.height = '';
      box.style.transition = '';
      content.style.opacity = '';
      content.style.transition = '';
    });
  });
}
