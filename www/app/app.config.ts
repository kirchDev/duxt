// The consuming site's own config, merged over the layer's defaults. This is
// also the example: legal links belong to whoever runs the site, never to the
// template, so the layer ships the row empty and kirchDev fills it here.
import { duxtSourceManifest } from '@kirchdev/duxt/sources-resolve';
import { sourceOptions, sources } from '../duxt.sources';

export default defineAppConfig({
  duxt: {
    // The same list the collections come from, so the theme knows which
    // collection serves which prefix and the version switcher can only offer
    // versions that exist.
    sources: duxtSourceManifest(sources, sourceOptions),

    // Two repositories means every path carries a repository segment, so the
    // navigation the layer ships — which assumes a single unprefixed source —
    // no longer matches. A consumer with prefixes has to name its own.
    sections: [
      {
        label: 'Get started',
        to: '/duxt/getting-started',
        icon: 'lucide:rocket'
      },
      { label: 'Structure', to: '/duxt/structure', icon: 'lucide:folder-tree' },
      { label: 'Guide', to: '/duxt/guide', icon: 'lucide:book-open' },
      { label: 'Reference', to: '/duxt/reference', icon: 'lucide:list' },
      { label: 'Workflows', to: '/workflows', icon: 'lucide:workflow' }
    ],

    landing: {
      actions: [
        {
          label: 'Read the docs',
          to: '/duxt/getting-started',
          icon: 'lucide:arrow-right'
        },
        {
          label: 'GitHub',
          to: 'https://github.com/kirchDev/duxt',
          variant: 'outline',
          external: true
        }
      ]
    },

    footer: {
      copyright: `© ${new Date().getFullYear()} IT-Dienstleistungen Titus Kirch`,
      legal: [
        {
          label: 'Impressum',
          to: 'https://kirch.dev/impressum',
          external: true
        },
        {
          label: 'Datenschutz',
          to: 'https://kirch.dev/datenschutz',
          external: true
        }
      ]
    }
  }
});
