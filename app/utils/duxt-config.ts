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
  title: 'duxt',
  version: 'v0.0.0',

  navigation: [
    // No `to`: the header resolves it to the first section, so the entry works
    // whether or not the consumer's URLs carry a prefix.
    { label: 'duxt.defaults.navigation.docs', icon: 'lucide:book-open-text' },
    {
      label: 'duxt.defaults.navigation.resources',
      icon: 'lucide:library',
      children: [
        {
          label: 'Nuxt',
          to: 'https://nuxt.com',
          icon: 'lucide:box',
          description: 'duxt.defaults.resources.nuxt',
          external: true
        },
        {
          label: 'Nuxt Content',
          to: 'https://content.nuxt.com',
          icon: 'lucide:file-text',
          description: 'duxt.defaults.resources.content',
          external: true
        },
        {
          label: 'shadcn-vue',
          to: 'https://www.shadcn-vue.com',
          icon: 'lucide:palette',
          description: 'duxt.defaults.resources.shadcn',
          external: true
        },
        {
          label: 'Tailwind CSS',
          to: 'https://tailwindcss.com',
          icon: 'lucide:paintbrush',
          description: 'duxt.defaults.resources.tailwind',
          external: true
        },
        {
          label: 'MDC syntax',
          to: 'https://content.nuxt.com/docs/files/markdown',
          icon: 'lucide:code',
          description: 'duxt.defaults.resources.mdc',
          external: true
        }
      ]
    }
  ],

  sections: [
    {
      label: 'duxt.defaults.sections.gettingStarted',
      to: '/getting-started',
      icon: 'lucide:rocket'
    },
    {
      label: 'duxt.defaults.sections.structure',
      to: '/structure',
      icon: 'lucide:folder-tree'
    },
    {
      label: 'duxt.defaults.sections.guide',
      to: '/guide',
      icon: 'lucide:book-open'
    },
    {
      label: 'duxt.defaults.sections.reference',
      to: '/reference',
      icon: 'lucide:list'
    }
  ],

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
    badge: 'duxt.defaults.landing.badge',
    headline: 'duxt.defaults.landing.headline',
    description: 'duxt.defaults.landing.description',
    // One action, and a generic one: "read the docs" is true of every site
    // built on this layer. A second button pointing at duxt's own repository
    // was not — see `links` above.
    actions: [
      {
        label: 'duxt.defaults.landing.actions.docs',
        to: '/getting-started',
        icon: 'lucide:arrow-right'
      }
    ],
    features: [
      {
        title: 'duxt.defaults.landing.features.extend.title',
        description: 'duxt.defaults.landing.features.extend.description',
        icon: 'lucide:package'
      },
      {
        title: 'duxt.defaults.landing.features.sources.title',
        description: 'duxt.defaults.landing.features.sources.description',
        icon: 'lucide:git-branch'
      },
      {
        title: 'duxt.defaults.landing.features.git.title',
        description: 'duxt.defaults.landing.features.git.description',
        icon: 'lucide:git-merge'
      },
      {
        title: 'duxt.defaults.landing.features.shadcn.title',
        description: 'duxt.defaults.landing.features.shadcn.description',
        icon: 'lucide:palette'
      },
      {
        title: 'duxt.defaults.landing.features.mdc.title',
        description: 'duxt.defaults.landing.features.mdc.description',
        icon: 'lucide:code'
      },
      {
        title: 'duxt.defaults.landing.features.machine.title',
        description: 'duxt.defaults.landing.features.machine.description',
        icon: 'lucide:bot'
      }
    ]
  },

  /**
   * Title only, no links — same reasoning as `links` above.
   *
   * "Star on GitHub" that stars duxt, an issue tracker that is not yours and a
   * Discord that is somebody else's community are worse than an empty column.
   * The block draws nothing until a consumer fills it.
   *
   * The title is the exception that stays: "Community" is chrome the layer
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
