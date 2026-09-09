/**
 * The layer's defaults, and how a consumer's config is merged over them.
 *
 * Nuxt merges app.config with defu, which CONCATENATES arrays: a consumer
 * setting `navigation: [...]` would get its own entries plus the layer's, in
 * that order, with no way to remove ours. Every list here would be unusable.
 *
 * So the layer ships no lists in app.config at all. It keeps them here and
 * merges them itself, replacing arrays instead of appending to them — a
 * consumer's list is the list. Objects still merge key by key, so overriding
 * `footer.note` leaves `footer.columns` alone.
 */
export const duxtDefaults: DuxtConfig = {
  // A placeholder, not a name. The layer cannot know what a site is called,
  // and `title` is read by thirteen call sites — the title template, the 404,
  // the brand, the OG card, schema.org, llms.txt and the feed — several of
  // which interpolate it into a template literal and would print the word
  // `undefined` rather than degrade. So a neutral, translated word stands in
  // until a consumer sets its own. It names nobody, which is the whole test.
  title: 'duxt.defaults.title',

  // No `version`. The layer knows nothing about the state of somebody else's
  // project, and a default made every site that extended it wear a number it
  // had never set — in the hero pill and, for a site with at most one source,
  // in the header badge beside the search. A site that has a version says so
  // in its own `app.config.ts`; `DuxtVersion` draws nothing until it does.

  navigation: [
    // No `to`: the header resolves it to the first section, so the entry works
    // whether or not the consumer's URLs carry a prefix.
    //
    // One entry where `sections` and `links` ship empty, because "Docs" names
    // the INTERFACE and not a tree or a repository. The dropdown that used to
    // sit beside it pointed at duxt's own tech stack — five links belonging to
    // this project and to no site that extends it. It lives in
    // `www/app/app.config.ts` now.
    { label: 'duxt.defaults.navigation.docs', icon: 'lucide:book-open-text' }
  ],

  /**
   * Empty, like `links` below — and for a reason one step further out.
   *
   * The section row names the top-level parts of a documentation TREE, and the
   * tree belongs to the consumer. Shipping "Get started / Concepts / Guides /
   * Reference" pointing at `/getting-started`, `/concepts`, … was the layer
   * guessing at somebody else's folder names: a site whose docs are shaped
   * differently got four tabs leading nowhere, and every one of them looked
   * like a bug in duxt rather than a default it had never been told to change.
   *
   * Those labels were duxt's OWN documentation showing through the layer, so
   * their translations left with them — `duxt.defaults.*` translates the interface
   * layer draws, never content a site writes.
   *
   * Left empty, the row does not render and the sidebar falls back to the whole
   * tree, which is the right shape for a site that has not split its docs into
   * sections at all. duxt's own sections live in `www/app/app.config.ts`.
   */
  sections: [],

  /**
   * Empty, like `footer.legal`.
   *
   * These are the icon links on the right of the navbar, and they belong to
   * whoever runs the site. Shipping duxt's own repository here gave a stranger
   * extending the layer a GitHub icon pointing at somebody else's project —
   * the same mistake the legal row already settled. kirchDev's own links live
   * in `www/app/app.config.ts`, where they are an example rather than a
   * default.
   *
   * Their i18n keys went with them. `duxt.defaults.*` translates the defaults
   * the layer itself ships and nothing else — it is not a vocabulary for
   * consumers to reach into. A consumer that did would depend on a key it
   * cannot see being renamed, and i18n answers a missing key by printing the
   * key, so the break would be silent. Consumers write a literal, their own
   * key, or the record form; `www` is the worked example of the third.
   */
  links: [],

  /** Which package managers a command block offers, in the order it shows them. */
  packageManagers: ['pnpm', 'npm', 'yarn', 'bun'],

  /** A flat docs tree gets a trail that only repeats its own section name. */
  breadcrumb: true,

  landing: {
    // No badge, no headline, no description. A pill above the headline says
    // something about the state of a project — "beta", "v2 is out" — and the
    // headline and the paragraph under it say what the project IS. The layer
    // knows none of the three. Those two were duxt's OWN marketing showing
    // through every site that extended it; they live in `www/app/app.config.ts`
    // now, in the record form, because the Nitro routes that read them have no
    // i18n — see `server/utils/duxt-server-text.ts`.
    //
    // Unset, the h1 falls back to `title` and the paragraph does not render at
    // all. Set `landing.badge`, `landing.headline` or `landing.description`
    // and each appears.

    // One action, and a generic one: "read the docs" is true of every site
    // built on this layer. A second button pointing at duxt's own repository
    // was not — see `links` above.
    // No `to`, for the same reason the section row above ships empty: the
    // layer knows that a site HAS documentation, never what its first page is
    // called. The landing resolves it to the first section, or to `/`.
    actions: [
      {
        label: 'duxt.defaults.landing.actions.docs',
        icon: 'lucide:arrow-right'
      }
    ],
    /**
     * Empty, like `sections` and `links` above.
     *
     * The six cards that used to sit here described duxt — its source list, its
     * git-native sourcing, its shadcn-vue base. That is duxt's own marketing
     * copy, not a default another site would keep: a stranger extending the
     * layer got a landing page selling somebody else's project.
     *
     * Their translations left with them — `duxt.defaults.*` translates the
     * interface the layer draws, never content a site writes. duxt's own cards
     * live in `www/app/app.config.ts`, where each one POINTS at the page that
     * explains it, which the layer could never know.
     *
     * Left empty, the band does not render: the landing gates the whole section
     * on `duxt.landing?.features?.length`.
     */
    features: []
  },

  /**
   * Title only, no links — same reasoning as `links` above.
   *
   * "Star on GitHub" that stars duxt, an issue tracker that is not yours and a
   * Discord that is somebody else's community are worse than an empty column.
   * The block draws nothing until a consumer fills it.
   *
   * The title is the exception that stays: "Community" is interface text the layer
   * draws itself, in every language it ships, and it is not anybody's link.
   */
  aside: {
    title: 'duxt.defaults.aside.title'
  }
};

type Plain = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Merge objects key by key; an array on the left replaces the one on the right. */
export function mergeDuxtConfig<T>(over: unknown, base: T): T {
  if (Array.isArray(over)) return over as T;
  if (over === undefined) return base;
  if (!isPlainObject(over) || !isPlainObject(base)) return over as T;

  const result: Plain = { ...base };
  for (const [key, value] of Object.entries(over)) {
    result[key] = mergeDuxtConfig(value, (base as Plain)[key]);
  }

  return result as T;
}

/**
 * How many ROWS a band draws, which is not always one.
 *
 * The bands alternate — prose left, prose right, prose left — and the side is
 * decided by position. A split try-it client is two rows inside one band, so
 * counting bands puts every band after it on the side it just used. Counting
 * rows is what keeps the page alternating across it.
 *
 * Pure, and here rather than in the component, because the page needs the
 * answer BEFORE it renders the band: the offset of band four depends on how
 * many rows bands one to three drew.
 */
export function duxtShowcaseRows(showcase: {
  full?: boolean;
  demo?: { type?: string; layout?: string };
}): number {
  const demo = showcase.demo;
  if (demo?.type !== 'operation') return 1;

  const layout = demo.layout ?? (showcase.full ? 'split' : 'panel');

  return layout === 'split' ? 2 : 1;
}
