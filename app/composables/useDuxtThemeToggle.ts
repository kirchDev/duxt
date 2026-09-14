/**
 * Switch between light and dark, revealing the new theme as a circle that grows
 * out of the button that was pressed.
 *
 * THE VIEW TRANSITIONS API, not a CSS transition on every colour. The browser
 * snapshots the page as it is, the switch happens underneath, and the new page
 * is clipped open on top of the old snapshot — one animation for the whole
 * document, whatever each component paints. Where the API does not exist, or
 * the reader asked for less motion, the theme simply switches.
 *
 * `@nuxtjs/color-mode` applies the class from a watcher, so the callback waits
 * a tick: a snapshot taken before the class moved would reveal the old theme.
 *
 * Both the origin and the radius are PERCENTAGES. The clip resolves against the
 * transition's snapshot box, which on a phone also spans the area behind the
 * hideable address bar and is therefore taller than `innerHeight` — pixels
 * computed from the viewport opened the circle away from the button and
 * stopped it short of the far corner. 150% covers the box from any point in
 * it: a corner needs 100%·√2 ≈ 141%.
 *
 * A transition the browser abandons — a second click, the tab going to the
 * background, a snapshot that takes too long on a long page — rejects its
 * promises. That is a normal outcome, and the theme has switched either way.
 */
export function useDuxtThemeToggle() {
  const colorMode = useColorMode();

  function apply() {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
  }

  async function toggle(event?: MouseEvent) {
    if (
      !document.startViewTransition ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      apply();
      return;
    }

    // A keyboard press reports no pointer position; open from the centre then.
    const x = event?.clientX ? (event.clientX / window.innerWidth) * 100 : 50;
    const y = event?.clientY ? (event.clientY / window.innerHeight) * 100 : 50;

    try {
      const transition = document.startViewTransition(async () => {
        apply();
        await nextTick();
      });

      await transition.ready;

      document.documentElement.animate(
        {
          clipPath: [`circle(0% at ${x}% ${y}%)`, `circle(150% at ${x}% ${y}%)`]
        },
        {
          duration: 450,
          easing: 'ease-out',
          pseudoElement: '::view-transition-new(root)'
        }
      );
    } catch {
      // Abandoned transition — see above.
    }
  }

  return { toggle };
}
