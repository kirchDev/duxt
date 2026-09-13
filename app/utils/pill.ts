/**
 * The pill: the one look every "pick one of these" strip on the site shares.
 *
 * Code tabs, the request samples' language tabs, the package managers, the
 * sample clients, the media types, the form/JSON switch and the demo window's
 * pages are all the same control — choose one spelling of one thing — and they
 * read as one only if they are drawn alike. Each of them used to carry its own
 * class string, and no two of the seven agreed on padding, weight or hover.
 *
 * Two tones, because the strips sit on two kinds of surface. `raised` lifts
 * the chosen pill off a muted bar the way a tab does; on the page's own
 * background that shadow is invisible, so `flat` marks it with the muted fill
 * instead.
 *
 * `active: 'tab'` for a reka-ui trigger, which knows its own state and says so
 * in `data-state` — the classes key off that rather than off a prop the
 * component would have to be handed twice.
 *
 * Full literal class strings throughout: Tailwind finds classes by reading the
 * source, and a string assembled from pieces is a class it never generates.
 */
const BASE =
  'inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const SIZES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm'
} as const;

const STATES = {
  raised: {
    on: 'bg-background text-foreground shadow-sm',
    off: 'text-muted-foreground hover:bg-accent hover:text-foreground',
    tab: 'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-accent data-[state=inactive]:hover:text-foreground'
  },
  flat: {
    on: 'bg-muted text-foreground',
    off: 'text-muted-foreground hover:text-foreground',
    tab: 'data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground'
  }
} as const;

export type DuxtPillSize = keyof typeof SIZES;
export type DuxtPillTone = keyof typeof STATES;

export function duxtPill(
  active: boolean | 'tab',
  {
    size = 'md',
    tone = 'raised'
  }: { size?: DuxtPillSize; tone?: DuxtPillTone } = {}
): string {
  const state = STATES[tone];

  return [
    BASE,
    SIZES[size],
    active === 'tab' ? state.tab : active ? state.on : state.off
  ].join(' ');
}
