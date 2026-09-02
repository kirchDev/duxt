// Layer defaults a consumer overrides in its own app.config.ts — Nuxt merges
// them, the consumer winning. Nothing here needs editing to get a site up.
export default defineAppConfig({
  duxt: {
    /** Shown in the navbar and used as the SEO title. */
    title: 'duxt',

    /** Navbar links. An entry with `children` becomes a dropdown. */
    navigation: [
      { label: 'Docs', to: '/getting-started', icon: 'lucide:book-open-text' },
      {
        label: 'Resources',
        icon: 'lucide:library',
        children: [
          {
            label: 'Nuxt Content',
            to: 'https://content.nuxt.com',
            icon: 'lucide:file-text',
            description: 'The engine underneath',
            external: true
          },
          {
            label: 'shadcn-vue',
            to: 'https://www.shadcn-vue.com',
            icon: 'lucide:palette',
            description: 'The component base',
            external: true
          }
        ]
      }
    ],

    /** Icon links on the right of the navbar. */
    links: [
      {
        icon: 'lucide:github',
        to: 'https://github.com/kirchDev/duxt',
        label: 'Repository'
      }
    ],

    /** The landing page at `/`. Drop your own index.vue to replace it wholesale. */
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

    /** Footer columns and the line below them. */
    footer: {
      note: 'Built with duxt.',
      links: [
        {
          label: 'Source',
          to: 'https://github.com/kirchDev/duxt',
          external: true
        }
      ]
    }
  }
});
