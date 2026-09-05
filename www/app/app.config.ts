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
      // This repository's own documentation. `origin` names the repository for
      // the "Edit this page" link WITHOUT making Content download it — that is
      // what `repo` would do, and it would clone the checkout we stand in.
      {
        path: 'docs',
        slug: 'duxt',
        origin: { repo: 'kirchDev/duxt', ref: 'main' }
      },

      /**
       * Another repository, at a branch and at four tags. kirchDev/workflows is
       * used because it has a real docs/ tree and real tags to read from.
       *
       * Deliberately one of EACH lifecycle, so every branch of the version
       * banner is exercised by the site the layer is built against:
       *
       *  - `v0.8.0` is the default, so it is the current documentation;
       *  - `v0.7.0` is older by semver, so its reader is told to upgrade;
       *  - `v0.6.0` says `eol`, so it warns and leaves the sitemap;
       *  - `main` is a branch, which semver cannot place against a tag — so the
       *    config says what it is, and `upcoming` is the one state that must
       *    never be reached by guessing. Its reader is told the documentation
       *    may still change, and is NOT told to upgrade.
       */
      {
        repo: 'kirchDev/workflows',
        path: 'docs',
        refs: [
          { branch: 'main', status: 'upcoming' },
          { tag: 'v0.8.0' },
          { tag: 'v0.7.0' },
          { tag: 'v0.6.0', status: 'eol' }
        ]
      }
    ],
    sourceOptions: { defaultRef: 'v0.8.0' },

    // The feed, pointed at a section that has dated entries. Off by default in
    // the layer; this site turns it on so the route is exercised.
    feed: { path: '/workflows/adr', title: 'duxt — decisions' },

    // Two repositories means every path carries a repository segment, so the
    // navigation the layer ships — which assumes a single unprefixed source —
    // no longer matches. A consumer with prefixes has to name its own.
    //
    // Written out per language rather than pointed at the layer's own
    // `duxt.defaults.sections.*` keys. Those keys are the layer's PRIVATE
    // namespace: they exist to translate the defaults a consumer has not
    // overridden, and renaming one is an internal change that would silently
    // leave this site rendering the key itself. A consumer's labels are the
    // consumer's, and for a handful of strings the record form costs less than
    // a locale file per language. `pt-BR` and `en-US` resolve through the
    // base-language fallback in `resolveDuxtText`, so five entries serve seven
    // locales.
    sections: [
      {
        label: {
          'en-GB': 'Get started',
          'de-DE': 'Loslegen',
          'es-ES': 'Primeros pasos',
          'fr-FR': 'Démarrer',
          'pt-PT': 'Começar'
        },
        to: '/duxt/getting-started',
        icon: 'lucide:rocket'
      },
      {
        label: {
          'en-GB': 'Structure',
          'de-DE': 'Struktur',
          'es-ES': 'Estructura',
          'fr-FR': 'Structure',
          'pt-PT': 'Estrutura'
        },
        to: '/duxt/structure',
        icon: 'lucide:folder-tree'
      },
      {
        label: {
          'en-GB': 'Guide',
          'de-DE': 'Anleitung',
          'es-ES': 'Guía',
          'fr-FR': 'Guide',
          'pt-PT': 'Guia'
        },
        to: '/duxt/guide',
        icon: 'lucide:book-open'
      },
      {
        label: {
          'en-GB': 'Reference',
          'de-DE': 'Referenz',
          'es-ES': 'Referencia',
          'fr-FR': 'Référence',
          'pt-PT': 'Referência'
        },
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

    /**
     * kirchDev's own links, here rather than in the layer.
     *
     * The layer ships `links` and `aside.links` EMPTY, on the same principle
     * the footer's legal row settled: a link naming a repository, an issue
     * tracker or a community belongs to whoever runs the site. Shipped as a
     * default, a stranger extending duxt got a "Star on GitHub" that stars
     * duxt and a Discord that is not theirs.
     *
     * The labels reuse the layer's OWN i18n keys, translated in every language
     * duxt ships — that is what those keys are for, and why they stayed behind
     * when the links left.
     */
    // The layer ships this row empty — a repository link belongs to whoever
    // runs the site. Labels written out for the same reason as the sections
    // above: `duxt.defaults.*` is the layer's private namespace, and a
    // consumer reaching into it turns an internal rename into a silent break.
    links: [
      {
        icon: 'lucide:github',
        to: 'https://github.com/kirchDev/duxt',
        label: {
          'en-GB': 'Repository',
          'de-DE': 'Repository',
          'es-ES': 'Repositorio',
          'fr-FR': 'Dépôt',
          'pt-PT': 'Repositório'
        }
      }
    ],

    // Also empty in the layer. Its title ("Community") is generic chrome and
    // stays there; the links are kirchDev's own and belong here.
    aside: {
      links: [
        {
          label: {
            'en-GB': 'Star on GitHub',
            'de-DE': 'Auf GitHub mit Stern markieren',
            'es-ES': 'Dar una estrella en GitHub',
            'fr-FR': 'Mettre une étoile sur GitHub',
            'pt-PT': 'Dar uma estrela no GitHub'
          },
          to: 'https://github.com/kirchDev/duxt',
          icon: 'lucide:star',
          external: true
        },
        {
          label: {
            'en-GB': 'Report an issue',
            'de-DE': 'Ein Issue melden',
            'es-ES': 'Informar de un problema',
            'fr-FR': 'Signaler un problème',
            'pt-PT': 'Reportar um problema'
          },
          to: 'https://github.com/kirchDev/duxt/issues/new/choose',
          icon: 'lucide:circle-alert',
          external: true
        },
        {
          label: {
            'en-GB': 'Discord community',
            'de-DE': 'Discord-Community',
            'es-ES': 'Comunidad de Discord',
            'fr-FR': 'Communauté Discord',
            'pt-PT': 'Comunidade no Discord'
          },
          to: 'https://discord.kirch.dev/',
          icon: 'lucide:message-circle',
          external: true
        },
        // An internal link, deliberately beside three external ones: `to` is
        // run through `useDuxtLink`, so it picks up the locale prefix while
        // the absolute URLs above pass through untouched. `external` only
        // decides the new tab and the arrow, never the routing.
        //
        // TODO: point at duxt's own published documentation once it is
        // deployed. It links to this same site today, which is circular.
        {
          label: {
            'en-GB': 'Documentation',
            'de-DE': 'Dokumentation',
            'es-ES': 'Documentación',
            'fr-FR': 'Documentation',
            'pt-PT': 'Documentação'
          },
          to: '/duxt/getting-started',
          icon: 'lucide:book-open-text'
        }
      ]
    },

    landing: {
      actions: [
        {
          label: {
            'en-GB': 'Read the docs',
            'de-DE': 'Dokumentation lesen',
            'es-ES': 'Leer la documentación',
            'fr-FR': 'Lire la documentation',
            'pt-PT': 'Ler a documentação'
          },
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
