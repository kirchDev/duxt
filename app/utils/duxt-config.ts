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

  links: [
    {
      icon: 'lucide:github',
      to: 'https://github.com/kirchDev/duxt',
      label: 'duxt.defaults.links.repository'
    }
  ],

  /** Which package managers a command block offers, in the order it shows them. */
  packageManagers: ['pnpm', 'npm', 'yarn', 'bun'],

  /** A flat docs tree gets a trail that only repeats its own section name. */
  breadcrumb: true,

  landing: {
    badge: 'duxt.defaults.landing.badge',
    headline: 'duxt.defaults.landing.headline',
    description: 'duxt.defaults.landing.description',
    actions: [
      {
        label: 'duxt.defaults.landing.actions.docs',
        to: '/getting-started',
        icon: 'lucide:arrow-right'
      },
      {
        label: 'GitHub',
        to: 'https://github.com/kirchDev/duxt',
        variant: 'outline',
        external: true
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

  aside: {
    title: 'duxt.defaults.aside.title',
    links: [
      {
        label: 'duxt.defaults.aside.star',
        to: 'https://github.com/kirchDev/duxt',
        icon: 'lucide:star',
        external: true
      },
      {
        label: 'duxt.defaults.aside.issue',
        to: 'https://github.com/kirchDev/duxt/issues/new/choose',
        icon: 'lucide:circle-alert',
        external: true
      },
      {
        label: 'duxt.defaults.aside.discord',
        to: 'https://discord.kirch.dev/',
        icon: 'lucide:message-circle',
        external: true
      },
      // TODO: point at duxt's own published documentation once it is deployed.
      {
        label: 'duxt.defaults.aside.docs',
        to: '/getting-started',
        icon: 'lucide:book-open-text'
      }
    ]
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
