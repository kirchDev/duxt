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
    { label: 'Docs', to: '/getting-started', icon: 'lucide:book-open-text' },
    {
      label: 'Resources',
      icon: 'lucide:library',
      children: [
        {
          label: 'Nuxt',
          to: 'https://nuxt.com',
          icon: 'lucide:box',
          description: 'The framework underneath',
          external: true
        },
        {
          label: 'Nuxt Content',
          to: 'https://content.nuxt.com',
          icon: 'lucide:file-text',
          description: 'Sourcing, parsing and querying',
          external: true
        },
        {
          label: 'shadcn-vue',
          to: 'https://www.shadcn-vue.com',
          icon: 'lucide:palette',
          description: 'The component base',
          external: true
        },
        {
          label: 'Tailwind CSS',
          to: 'https://tailwindcss.com',
          icon: 'lucide:paintbrush',
          description: 'The styling system',
          external: true
        },
        {
          label: 'MDC syntax',
          to: 'https://content.nuxt.com/docs/files/markdown',
          icon: 'lucide:code',
          description: 'Components inside Markdown',
          external: true
        }
      ]
    }
  ],

  sections: [
    { label: 'Get started', to: '/getting-started', icon: 'lucide:rocket' },
    { label: 'Structure', to: '/structure', icon: 'lucide:folder-tree' },
    { label: 'Guide', to: '/guide', icon: 'lucide:book-open' },
    { label: 'Reference', to: '/reference', icon: 'lucide:list' }
  ],

  links: [
    {
      icon: 'lucide:github',
      to: 'https://github.com/kirchDev/duxt',
      label: 'Repository'
    }
  ],

  /** Which package managers a command block offers, in the order it shows them. */
  packageManagers: ['pnpm', 'npm', 'yarn', 'bun'],

  /** A flat docs tree gets a trail that only repeats its own section name. */
  breadcrumb: true,

  landing: {
    badge: 'Early days — nothing is decided',
    headline: 'Documentation for Nuxt, versioned and multi-repo',
    description:
      'Extend one layer and your docs/ folder becomes a site. Point it at other repositories, or at tags of the same one, and those become versions.',
    actions: [
      {
        label: 'Read the docs',
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
        title: "Extend, don't scaffold",
        description:
          'One line of config brings theme, pages and components — override any file.',
        icon: 'lucide:package'
      },
      {
        title: 'Sources as a list',
        description:
          'One declaration per source instead of one collection per version and repo.',
        icon: 'lucide:git-branch'
      },
      {
        title: 'Git-native, not reinvented',
        description:
          'Branches, tags, private repos and caching come from Content v3 itself.',
        icon: 'lucide:git-merge'
      },
      {
        title: 'shadcn-vue',
        description:
          'Components are copied in, not imported. Restyling one is editing a file.',
        icon: 'lucide:palette'
      },
      {
        title: 'Components in Markdown',
        description:
          'MDC ships with Content — call a Vue component with block syntax.',
        icon: 'lucide:code'
      },
      {
        title: 'Machine-readable',
        description:
          'llms.txt and an MCP route over the same content, planned as build output.',
        icon: 'lucide:bot'
      }
    ]
  },

  aside: {
    title: 'Community',
    links: [
      {
        label: 'Star on GitHub',
        to: 'https://github.com/kirchDev/duxt',
        icon: 'lucide:star',
        external: true
      },
      {
        label: 'Report an issue',
        to: 'https://github.com/kirchDev/duxt/issues/new/choose',
        icon: 'lucide:circle-alert',
        external: true
      },
      {
        label: 'Discord community',
        to: 'https://discord.kirch.dev/',
        icon: 'lucide:message-circle',
        external: true
      },
      // TODO: point at duxt's own published documentation once it is deployed.
      {
        label: 'Documentation',
        to: '/getting-started',
        icon: 'lucide:book-open-text'
      }
    ]
  },

  footer: {
    note: 'A documentation layer for Nuxt, built on Nuxt Content v3. Extend it in one line and your docs/ folder becomes a site — versioned across tags, sourced across repositories, and yours to override file by file.',
    columns: [
      {
        title: 'Documentation',
        links: [
          { label: 'Get started', to: '/getting-started' },
          { label: 'Structure', to: '/structure' },
          { label: 'Guide', to: '/guide' },
          { label: 'Reference', to: '/reference' }
        ]
      },
      {
        title: 'Project',
        links: [
          {
            label: 'Source',
            to: 'https://github.com/kirchDev/duxt',
            external: true
          },
          {
            label: 'Report an issue',
            to: 'https://github.com/kirchDev/duxt/issues/new/choose',
            external: true
          },
          {
            label: 'Releases',
            to: 'https://github.com/kirchDev/duxt/releases',
            external: true
          }
        ]
      },
      {
        title: 'Community',
        links: [
          {
            label: 'Discord',
            to: 'https://discord.kirch.dev/',
            external: true
          },
          { label: 'kirch.dev', to: 'https://kirch.dev', external: true }
        ]
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
