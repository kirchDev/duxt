// The consuming site's ENTIRE duxt config — sources, theme and legal links in
// one file. There is no duxt.sources.ts and no content.config.ts: the layer
// reads `sources` from here for both the collections and the resolved manifest.
//
// This is also the example: legal links belong to whoever runs the site, never
// to the template, so the layer ships the row empty and kirchDev fills it here.
export default defineAppConfig({
  duxt: {
    /**
     * Deliberately the awkward case, so every branch of the resolver is
     * exercised by the site the layer is built against: a repository segment
     * appears because there is more than one repository, a version segment
     * because `workflows` is published at two refs. A consumer with one
     * unversioned folder declares none of this and gets none of it.
     */
    sources: [
      // This repository's own documentation.
      { path: 'docs', slug: 'duxt' },

      // Another repository, at a branch and at a tag. kirchDev/workflows is
      // used because it has a real docs/ tree and a real tag to read from.
      {
        repo: 'kirchDev/workflows',
        path: 'docs',
        refs: ['main', { tag: 'v0.7.0' }]
      }
    ],
    sourceOptions: { defaultRef: 'main' },

    // Two repositories means every path carries a repository segment, so the
    // navigation the layer ships — which assumes a single unprefixed source —
    // no longer matches. A consumer with prefixes has to name its own.
    // Both forms a label may take, side by side on purpose — this site is the
    // example a consumer reads. The first four reuse the layer's OWN keys,
    // which are translated in every language duxt ships. `Workflows` is this
    // site's alone, so it carries its translations inline rather than earning
    // a locale file of its own for one word.
    sections: [
      {
        label: 'duxt.defaults.sections.gettingStarted',
        to: '/duxt/getting-started',
        icon: 'lucide:rocket'
      },
      {
        label: 'duxt.defaults.sections.structure',
        to: '/duxt/structure',
        icon: 'lucide:folder-tree'
      },
      {
        label: 'duxt.defaults.sections.guide',
        to: '/duxt/guide',
        icon: 'lucide:book-open'
      },
      {
        label: 'duxt.defaults.sections.reference',
        to: '/duxt/reference',
        icon: 'lucide:list'
      },
      {
        label: {
          'en-GB': 'Workflows',
          'de-DE': 'Workflows',
          'es-ES': 'Flujos de trabajo',
          'fr-FR': 'Flux de travail',
          'pt-PT': 'Fluxos de trabalho'
        },
        to: '/workflows',
        icon: 'lucide:workflow'
      }
    ],

    landing: {
      actions: [
        {
          label: 'duxt.defaults.landing.actions.docs',
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
      // The footer is where the record form earns its keep: two labels a
      // German company must show, needed in every language the site serves,
      // and not worth a locale file each.
      legal: [
        {
          label: {
            'en-GB': 'Legal notice',
            'de-DE': 'Impressum',
            'es-ES': 'Aviso legal',
            'fr-FR': 'Mentions légales',
            'pt-PT': 'Informação legal'
          },
          to: 'https://kirch.dev/impressum',
          external: true
        },
        {
          label: {
            'en-GB': 'Privacy',
            'de-DE': 'Datenschutz',
            'es-ES': 'Privacidad',
            'fr-FR': 'Confidentialité',
            'pt-PT': 'Privacidade'
          },
          to: 'https://kirch.dev/datenschutz',
          external: true
        }
      ]
    }
  }
});
