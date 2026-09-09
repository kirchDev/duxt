// The consuming site's ENTIRE duxt config — sources, theme and legal links in
// one file. There is no duxt.sources.ts and no content.config.ts: the layer
// reads `sources` from here for both the collections and the resolved manifest.
//
// This is also the example: legal links belong to whoever runs the site, never
// to the template, so the layer ships the row empty and kirchDev fills it here.
export default defineAppConfig({
  duxt: {
    /**
     * The site's own name. The layer ships no `title` of its own: a name is the
     * one thing a documentation theme cannot guess, and "duxt" in every
     * downstream header was exactly that mistake.
     *
     * A plain literal, not a record: the word is the same in every language —
     * the rule that also keeps `'GitHub'` and `'shadcn-vue'` below unwrapped.
     */
    title: 'duxt',

    /**
     * This site's own wordmark, set exactly the way a consumer sets theirs.
     *
     * The layer ships no `logo` at all, so `DuxtBrand` falls back to a generic
     * icon beside `title` for anyone who does not set one. Serving duxt's mark
     * from the layer would put it in every downstream header, which is the one
     * thing a documentation theme must not do.
     */
    logo: {
      src: '/wordmark.svg',
      srcDark: '/wordmark-dark.svg',
      alt: 'duxt'
    },

    /**
     * One source, and therefore no prefixes: with a single repository and a
     * single ref the resolver serves `/getting-started` rather than
     * `/duxt/v1/getting-started`, because a segment that can only ever hold one
     * value distinguishes nothing. `sourceOptions.showRepo` and `showVersion`
     * force them back on for a site that wants the segment anyway.
     */
    sources: [
      // This repository's own documentation. `origin` names the repository for
      // the "Edit this page" link WITHOUT making Content download it — that is
      // what `repo` would do, and it would clone the checkout we stand in.
      {
        path: 'docs',
        origin: { repo: 'kirchDev/duxt', ref: 'main' },

        // FOUR languages over one tree, named by LANGUAGE rather than locale.
        // `docs/pt/` serves both `pt-PT` and `pt-BR`, and `en-US` reads the
        // original through `fallbackLocale` — the same rule the locale FILES in
        // nuxt.config already follow, so seven locales need four folders.
        //
        // `en-GB` is the tree in `docs/` itself and takes no folder of its own,
        // which keeps every URL this site already serves where it is.
        locales: ['en-GB', 'de', 'es', 'fr', 'pt'],

        // An artefact that is not Markdown, published as pages of the site.
        //
        // The path resolves against the SOURCE'S OWN ROOT — this repository's,
        // because the source is read off disk — which is why it reads
        // `www/CHANGELOG.md` and not `CHANGELOG.md`: the artefact belongs to
        // the site rather than to the package, exactly the shape a monorepo
        // has when `release-please-config.json` names a changelog per package.
        //
        // `label` is a plain string, not a record: it is also the URL segment,
        // and a translated text is not a stable URL — the same pair a version's
        // label makes. The entry appends itself to the section row above.
        generated: [
          // TO BE REPOINTED AT THE PACKAGE'S OWN CHANGELOG once release-please
          // cuts the first version: `path: 'CHANGELOG.md'`, the file at the
          // repository root. It cannot be that today — the manifest stands at
          // `0.0.0`, the file does not exist, and a generated section whose
          // artefact is missing fails the build at config load, by design.
          //
          // The site's own log stays the fixture either way: it is the one file
          // in the repository carrying every section release-please writes and
          // a patch release at `###`, which is what puts both of the parser's
          // heading rules on the build's path.
          //
          // `navigation: 'navigation'` puts the entry in the TOP row rather
          // than in the section row: a release log is not a part of the
          // documentation the way "Guides" is, it is a thing the project has
          // beside its documentation. The entry itself is written by hand up in
          // `navigation`, between Resources and Credits — see there.
          {
            type: 'changelog',
            path: 'www/CHANGELOG.md',
            label: 'Releases',
            navigation: 'navigation'
          },
          // The SAME artefact at the other granularity, which is what puts the
          // second rendering path on the build's own path: `flat` is one page
          // holding the file as it was written, and a page that nothing renders
          // is a page whose failures nobody sees.
          //
          // `navigation: false` keeps it out of the section row — one changelog
          // belongs in a navbar, and this is a fixture standing beside the real
          // entry rather than a second thing to read.
          {
            type: 'changelog',
            path: 'www/CHANGELOG.md',
            label: 'Changelog',
            navigation: false,
            options: { granularity: 'flat' }
          },
          // An OpenAPI document, published as reference pages. `per-version`
          // and `per-locale`, unlike the changelog above — the two policies the
          // registry exists to make parameters, taking their opposite values.
          //
          // No `locales` map: this site translates its prose and not its
          // (invented) API, so the reference is built once from the default
          // language and every other locale falls through to it with the
          // translation banner saying so. A site whose API description IS
          // translated names the file per locale instead.
          //
          // VERSIONED BY FILE, which is how an API usually is: `v1` and `v2`
          // sit beside each other in one checkout and neither is a git ref.
          // Declared on the section rather than as two sources — two sections
          // are versions of one another only when one declaration produced
          // them, and a source always publishes a documentation tree, so a
          // source per API version would publish this site's prose twice.
          {
            type: 'openapi',
            path: 'www/openapi.yaml',
            label: 'API',
            versions: [
              { version: 'v2', path: 'www/openapi.yaml' },
              {
                version: 'v1',
                path: 'www/openapi.v1.yaml',
                status: 'deprecated'
              }
            ]
          }
        ]
      }
    ],
    sourceOptions: { defaultLocale: 'en-GB' },
    // The feed, pointed at a section that has dated entries. Off by default in
    // the layer; this site turns it on so the route is exercised.
    feed: { path: '/adr', title: 'duxt — decisions' },

    // Written out in full, both entries: `mergeDuxtConfig` REPLACES an array
    // rather than merging into it, so naming `navigation` at all means naming
    // every entry. The layer ships only the generic Docs entry; the Resources
    // dropdown below and the Credits link after it are duxt's own — five links
    // to duxt's tech stack and the page that thanks them, which belong to this
    // site and not to a stranger's header.
    //
    // The Docs entry carries no `to` on purpose. `DuxtHeader.linkTarget`
    // resolves it to the first section, and `entryActive` lights it wherever
    // ANY section is — giving it an explicit `to` would narrow the highlight
    // back to one section.
    navigation: [
      { label: 'Docs', icon: 'lucide:book-open-text' },
      {
        label: {
          'en-GB': 'Resources',
          'de-DE': 'Ressourcen',
          'es-ES': 'Recursos',
          'fr-FR': 'Ressources',
          'pt-PT': 'Recursos'
        },
        icon: 'lucide:library',
        children: [
          {
            label: 'Nuxt',
            to: 'https://nuxt.com',
            icon: 'lucide:box',
            description: {
              'en-GB': 'The framework underneath',
              'de-DE': 'Das Framework darunter',
              'es-ES': 'El framework de base',
              'fr-FR': 'Le framework sous-jacent',
              'pt-PT': 'A framework subjacente'
            },
            external: true
          },
          {
            label: 'Nuxt Content',
            to: 'https://content.nuxt.com',
            icon: 'lucide:file-text',
            description: {
              'en-GB': 'Sourcing, parsing and querying',
              'de-DE': 'Beschaffen, parsen und abfragen',
              'es-ES': 'Obtención, análisis y consulta',
              'fr-FR': 'Récupération, analyse et requêtes',
              'pt-PT': 'Obtenção, análise e consulta'
            },
            external: true
          },
          {
            label: 'shadcn-vue',
            to: 'https://www.shadcn-vue.com',
            icon: 'lucide:palette',
            description: {
              'en-GB': 'The component base',
              'de-DE': 'Die Komponentenbasis',
              'es-ES': 'La base de componentes',
              'fr-FR': 'La base de composants',
              'pt-PT': 'A base de componentes'
            },
            external: true
          },
          {
            label: 'Tailwind CSS',
            to: 'https://tailwindcss.com',
            icon: 'lucide:paintbrush',
            description: {
              'en-GB': 'The styling system',
              'de-DE': 'Das Styling-System',
              'es-ES': 'El sistema de estilos',
              'fr-FR': 'Le système de styles',
              'pt-PT': 'O sistema de estilos'
            },
            external: true
          },
          {
            label: 'MDC syntax',
            to: 'https://content.nuxt.com/docs/files/markdown',
            icon: 'lucide:code',
            description: {
              'en-GB': 'Components inside Markdown',
              'de-DE': 'Komponenten in Markdown',
              'es-ES': 'Componentes dentro de Markdown',
              'fr-FR': 'Des composants dans le Markdown',
              'pt-PT': 'Componentes dentro do Markdown'
            },
            external: true
          }
        ]
      },
      // The generated changelog, PLACED BY HAND — which is the whole reason
      // `withGeneratedSections` leaves a section it already finds in the row
      // alone. The declaration below says `navigation: 'navigation'`, so the
      // entry belongs in this row rather than in the section row; appending it
      // would put it last, and after Credits is not where a release log goes.
      //
      // The label is a plain string for the reason the declaration's is: it is
      // the same word the section itself is labelled with, and the two saying
      // different things in the same language is worse than not translating a
      // word most languages have borrowed anyway.
      { label: 'Releases', to: '/releases', icon: 'lucide:tag' },
      // A navbar entry of its own rather than an item inside the dropdown: a
      // link buried in a menu is a link nobody opens the menu for, and this one
      // is a page of the site while the five above leave it. It sits after
      // Resources and after the releases because it is the smallest thing.
      {
        label: {
          'en-GB': 'Credits',
          'de-DE': 'Credits',
          'es-ES': 'Créditos',
          'fr-FR': 'Crédits',
          'pt-PT': 'Créditos'
        },
        to: '/credits',
        icon: 'lucide:heart'
      }
    ],

    // The source carries a slug, so every path has a repository segment and the
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
        to: '/getting-started',
        icon: 'lucide:rocket'
      },
      {
        label: {
          'en-GB': 'Concepts',
          'de-DE': 'Konzepte',
          'es-ES': 'Conceptos',
          'fr-FR': 'Concepts',
          'pt-PT': 'Conceitos'
        },
        to: '/concepts',
        icon: 'lucide:compass'
      },
      {
        label: {
          'en-GB': 'Guides',
          'de-DE': 'Anleitungen',
          'es-ES': 'Guías',
          'fr-FR': 'Guides',
          'pt-PT': 'Guias'
        },
        to: '/guides',
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
        to: '/reference',
        icon: 'lucide:list'
      },
      {
        label: {
          'en-GB': 'Conventions',
          'de-DE': 'Konventionen',
          'es-ES': 'Convenciones',
          'fr-FR': 'Conventions',
          'pt-PT': 'Convenções'
        },
        to: '/conventions',
        icon: 'lucide:ruler'
      },
      {
        // Last, and deliberately so: the decision log is an appendix rather
        // than reading order — which is what `99.` encodes in the folder name.
        // It earns a row anyway, because a section the row omits falls back to
        // the branch it is in, and a reader who lands there has no way back up.
        label: {
          'en-GB': 'Architecture decisions',
          'de-DE': 'Architekturentscheidungen',
          'es-ES': 'Decisiones de arquitectura',
          'fr-FR': "Décisions d'architecture",
          'pt-PT': 'Decisões de arquitetura'
        },
        to: '/adr',
        icon: 'lucide:gavel',
        // A document, not a second gavel. An ADR's frontmatter is fixed at
        // `title`, `description`, `status` and `date`, so the records carry no
        // icon of their own and the log rendered as eight bare rows beside
        // sections that all have a column of them. The section is the decision
        // log — the gavel above says so; each row in it is one written record,
        // and repeating the section's own symbol on every child would say
        // nothing the heading has not already said.
        pageIcon: 'lucide:file-text'
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
        icon: 'simple-icons:github',
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

    // Also empty in the layer. Its title ("Community") is generic interface text
    // and stays there; the links are kirchDev's own and belong here.
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
          icon: 'simple-icons:discord',
          external: true
        },
        // duxt's published documentation, by its own domain rather than by a
        // path on whatever site is rendering this. That is what makes the entry
        // mean anything in the row it sits in: the three links above take the
        // reader to duxt's repository, its tracker and its community, and a
        // relative `/getting-started` took them back to the page they were
        // already on.
        //
        // Absolute, so `useDuxtLink` passes it through untouched instead of
        // prefixing a locale onto it. `external` only decides the new tab and
        // the arrow, never the routing.
        {
          label: {
            'en-GB': 'Documentation',
            'de-DE': 'Dokumentation',
            'es-ES': 'Documentación',
            'fr-FR': 'Documentation',
            'pt-PT': 'Documentação'
          },
          to: 'https://duxt.app/',
          icon: 'lucide:book-open-text',
          external: true
        }
      ]
    },

    landing: {
      // `{version}` reads this site's `version`, which `nuxt.config.ts` reads
      // out of duxt's own `package.json` — see the note there. Nothing to bump
      // in either file. The pill links to the release it names.
      badge: {
        label: {
          'en-GB': '{version} released',
          'de-DE': '{version} veröffentlicht',
          'es-ES': '{version} publicada',
          'fr-FR': '{version} publiée',
          'pt-PT': '{version} publicada'
        },
        icon: 'lucide:rocket',
        // The accent, not the success colour: this pill announces a release,
        // it does not report that something went well. Green reads as a status
        // and pulls harder than the headline underneath it.
        variant: 'default',
        to: 'https://github.com/kirchDev/duxt/releases/latest',
        external: true
      },

      /**
       * The hero copy, written out here rather than inherited.
       *
       * The layer used to ship both as `duxt.defaults.landing.*` keys, which
       * made duxt's own marketing the default headline of every site that
       * extended it. `duxt.defaults.*` translates the interface the layer
       * draws, never content a site writes.
       *
       * The record form rather than a locale file, for the reason the sections
       * above give — and for one more: `llms.txt`, `llms-full.txt` and the feed
       * are Nitro routes with no i18n, and `resolveServerTexts` reads only the
       * LAYER's English messages. A key in a `www/i18n/` file would be printed
       * to a model verbatim; a record resolves to its `en-GB` entry there.
       */
      headline: {
        // NOT "Documentation for Nuxt", which is what stood here and which
        // reads as documentation ABOUT Nuxt — the way "documentation for React"
        // does. duxt is the opposite: a tool that runs ON Nuxt. The framework
        // moved into the first sentence below, where it explains the mechanism
        // instead of naming the subject.
        //
        // And a promise rather than two adjectives: "versioned and multi-repo"
        // was a feature list in the one line every visitor reads.
        'en-GB': 'Versioned docs, from the repositories you already have',
        'de-DE':
          'Versionierte Dokumentation — aus den Repositories, die du schon hast',
        'es-ES':
          'Documentación versionada, desde los repositorios que ya tienes',
        'fr-FR':
          'Une documentation versionnée, depuis les dépôts que vous avez déjà',
        'pt-PT':
          'Documentação com versões, a partir dos repositórios que já tens'
      },

      // Also the `<meta name="description">`, the llms.txt blurb and the RSS
      // channel description — one sentence, four readers.
      description: {
        // The headline makes the promise; this says HOW and WHAT COMES WITH IT.
        // The old pair both said "versions" and neither said what a reader
        // actually gets for the one line of config.
        //
        // No Markdown: this string is also the meta description, the llms.txt
        // blurb and the RSS channel description, and none of the three renders
        // a backtick.
        'en-GB':
          'duxt is a Nuxt layer: extend it and your docs/ folder becomes a site — theme, search, API reference and llms.txt included. Point it at other repositories, or at tags of the same one, and each becomes a version.',
        'de-DE':
          'duxt ist ein Nuxt-Layer: erweitern, und dein docs/-Ordner wird zur Website — mit Theme, Suche, API-Referenz und llms.txt. Zeig damit auf andere Repositories oder auf Tags desselben, und jedes wird zu einer Version.',
        'es-ES':
          'duxt es una capa de Nuxt: extiéndela y tu carpeta docs/ se convierte en un sitio, con tema, búsqueda, referencia de API y llms.txt. Apúntala a otros repositorios, o a etiquetas del mismo, y cada uno se convierte en una versión.',
        'fr-FR':
          "duxt est une couche Nuxt : étendez-la et votre dossier docs/ devient un site — thème, recherche, référence d'API et llms.txt compris. Pointez-la vers d'autres dépôts, ou vers des tags du même, et chacun devient une version.",
        'pt-PT':
          'O duxt é uma camada Nuxt: estende-a e a tua pasta docs/ torna-se um site — com tema, pesquisa, referência de API e llms.txt. Aponta-a para outros repositórios, ou para tags do mesmo, e cada um torna-se uma versão.'
      },

      // How a reader installs the layer. The layer ships none — it does not
      // know what a consumer's project is called — so duxt's own site is where
      // duxt's own command belongs.
      command: 'pnpm add -D @kirchdev/duxt',

      actions: [
        {
          label: {
            'en-GB': 'Read the docs',
            'de-DE': 'Dokumentation lesen',
            'es-ES': 'Leer la documentación',
            'fr-FR': 'Lire la documentation',
            'pt-PT': 'Ler a documentação'
          },
          to: '/getting-started',
          icon: 'lucide:arrow-right'
        },
        {
          label: 'GitHub',
          to: 'https://github.com/kirchDev/duxt',
          icon: 'simple-icons:github',
          variant: 'outline',
          external: true
        }
      ],

      /**
       * The numbers under the hero.
       *
       * THREE, because three are true. Every one is checkable on this very
       * site: the line of config is the snippet in the first band, the seven
       * locales are the ones in the language menu, the licence is the file in
       * the repository.
       *
       * A fourth stood here twice and had to go both times. "12 request
       * samples" moves with a config key — seven are on by default, which is
       * the number a reader counts in the try-it window three bands below. "0
       * services to run" was simply false: the MCP route and the search
       * endpoint are Nitro handlers, and a site rendering on demand runs a
       * server like any other Nuxt app.
       *
       * A number nobody can verify is the one thing a landing page must not
       * print, and a fourth column is not worth one.
       */
      stats: [
        {
          value: '1',
          icon: 'lucide:code',
          label: {
            'en-GB': 'line of config',
            'de-DE': 'Zeile Konfiguration',
            'es-ES': 'línea de configuración',
            'fr-FR': 'ligne de configuration',
            'pt-PT': 'linha de configuração'
          }
        },
        {
          value: '7',
          icon: 'lucide:languages',
          label: {
            'en-GB': 'locales shipped',
            'de-DE': 'Sprachen mitgeliefert',
            'es-ES': 'idiomas incluidos',
            'fr-FR': 'langues fournies',
            'pt-PT': 'idiomas incluídos'
          }
        },
        {
          value: 'MIT',
          icon: 'lucide:scale',
          label: {
            'en-GB': 'licensed, open source',
            'de-DE': 'lizenziert, quelloffen',
            'es-ES': 'con licencia, código abierto',
            'fr-FR': 'sous licence, open source',
            'pt-PT': 'licenciado, código aberto'
          }
        }
      ],

      /**
       * The window under the hero, with a tab bar over it.
       *
       * Four pages that are four different rendering paths, which is the point:
       * a Markdown page, an operation page built from an OpenAPI document, a
       * changelog parsed out of a file, and a plain-text artefact written for a
       * model. A tab bar showing four Markdown pages would demonstrate that the
       * theme has a sidebar.
       *
       * `preview` is the SAME idea with one page and no tab bar, and it is what
       * the layer falls back to. This site sets only `demo`: configuring both
       * leaves the losing one in the file looking like it does something.
       */
      demo: {
        tabs: [
          {
            label: {
              'en-GB': 'Guide',
              'de-DE': 'Anleitung',
              'es-ES': 'Guía',
              'fr-FR': 'Guide',
              'pt-PT': 'Guia'
            },
            icon: 'lucide:book-open',
            to: '/getting-started'
          },
          {
            label: {
              'en-GB': 'API reference',
              'de-DE': 'API-Referenz',
              'es-ES': 'Referencia de API',
              'fr-FR': 'Référence API',
              'pt-PT': 'Referência da API'
            },
            icon: 'lucide:plug',
            // The FRAGMENT is the point: the client sits beside the endpoint
            // only above 80rem and below the whole description everywhere
            // narrower, so a frame this size opened at the top of the page
            // showed the prose and hid the one control the tab is named for.
            to: '/api/widgets/createwidget#createwidget-try-it',
            skeleton: 'api'
          },
          {
            label: {
              'en-GB': 'Releases',
              'de-DE': 'Releases',
              'es-ES': 'Versiones',
              'fr-FR': 'Versions',
              'pt-PT': 'Versões'
            },
            icon: 'lucide:rocket',
            to: '/releases'
          },
          // The one tab that is not a page of the theme at all: the file a
          // model reads, served from the same content and framed as it is.
          // Plain text, and the poster says so: a documentation page drawn in
          // front of a `text/plain` document is a promise the frame breaks.
          {
            label: 'llms.txt',
            icon: 'lucide:bot',
            to: '/llms.txt',
            skeleton: 'text'
          }
        ]
      },

      /**
       * The bands between the window and the grid: one feature each, its prose
       * on one side and the feature itself running on the other.
       *
       * ORDERED AS A READER MEETS THEM — install, point it at sources, then the
       * two things that are hardest to believe from a sentence (an API
       * reference built from a document, a client that sends the request), then
       * what the site is for a machine. The sides alternate on their own.
       */
      showcase: [
        {
          badge: {
            'en-GB': 'Setup',
            'de-DE': 'Einrichtung',
            'es-ES': 'Configuración',
            'fr-FR': 'Installation',
            'pt-PT': 'Configuração'
          },
          icon: 'lucide:package',
          title: {
            'en-GB': 'One line, and the folder is a site',
            'de-DE': 'Eine Zeile, und der Ordner ist eine Website',
            'es-ES': 'Una línea, y la carpeta es un sitio',
            'fr-FR': 'Une ligne, et le dossier devient un site',
            'pt-PT': 'Uma linha, e a pasta é um site'
          },
          description: {
            'en-GB':
              'duxt is a Nuxt layer, so extending it brings the theme, the pages, the components and the build steps at once — and leaves every one of them replaceable.',
            'de-DE':
              'duxt ist ein Nuxt-Layer: Erweitern bringt Theme, Seiten, Komponenten und Build-Schritte auf einmal — und lässt jedes davon ersetzbar.',
            'es-ES':
              'duxt es una capa de Nuxt: extenderla aporta el tema, las páginas, los componentes y los pasos de compilación a la vez, y deja todo reemplazable.',
            'fr-FR':
              'duxt est une couche Nuxt : l’étendre apporte le thème, les pages, les composants et les étapes de build d’un coup — et laisse chacun remplaçable.',
            'pt-PT':
              'O duxt é uma camada Nuxt: estendê-la traz o tema, as páginas, os componentes e os passos da build de uma vez — e deixa tudo substituível.'
          },
          bullets: [
            {
              icon: 'lucide:folder-open',
              label: {
                'en-GB':
                  'No generator and nothing to eject — your repository keeps its own files.',
                'de-DE':
                  'Kein Generator, nichts zum Ejecten — dein Repository behält seine eigenen Dateien.',
                'es-ES':
                  'Sin generador y sin nada que expulsar: tu repositorio conserva sus archivos.',
                'fr-FR':
                  'Aucun générateur, rien à éjecter — votre dépôt garde ses propres fichiers.',
                'pt-PT':
                  'Sem gerador e sem nada para ejetar — o teu repositório mantém os seus ficheiros.'
              }
            },
            {
              icon: 'lucide:file-pen-line',
              label: {
                'en-GB':
                  'Override a component by putting your own at the same path.',
                'de-DE':
                  'Eine Komponente überschreiben heißt: die eigene an denselben Pfad legen.',
                'es-ES':
                  'Sobrescribe un componente colocando el tuyo en la misma ruta.',
                'fr-FR':
                  'Remplacez un composant en plaçant le vôtre au même chemin.',
                'pt-PT':
                  'Substitui um componente colocando o teu no mesmo caminho.'
              }
            },
            {
              icon: 'lucide:rocket',
              label: {
                'en-GB':
                  'Builds to a static site — deploy it anywhere Nuxt goes.',
                'de-DE':
                  'Baut zu einer statischen Seite — deploybar überall, wo Nuxt läuft.',
                'es-ES':
                  'Compila a un sitio estático: despliégalo donde vaya Nuxt.',
                'fr-FR':
                  'Se compile en site statique — déployable partout où Nuxt va.',
                'pt-PT':
                  'Compila para um site estático — publica onde o Nuxt for.'
              }
            }
          ],
          action: {
            label: {
              'en-GB': 'Installation',
              'de-DE': 'Installation',
              'es-ES': 'Instalación',
              'fr-FR': 'Installation',
              'pt-PT': 'Instalação'
            },
            to: '/getting-started/installation'
          },
          demo: {
            type: 'code',
            files: [
              {
                name: 'nuxt.config.ts',
                language: 'typescript',
                code: `export default defineNuxtConfig({
  extends: ['@kirchdev/duxt']
})
`
              },
              {
                name: 'app/app.config.ts',
                language: 'typescript',
                code: `export default defineAppConfig({
  duxt: {
    title: 'Acme',
    // The folder you already write in.
    sources: [{ path: 'docs' }]
  }
})
`
              }
            ]
          }
        },
        {
          badge: {
            'en-GB': 'Sources',
            'de-DE': 'Quellen',
            'es-ES': 'Fuentes',
            'fr-FR': 'Sources',
            'pt-PT': 'Fontes'
          },
          icon: 'lucide:git-branch',
          title: {
            'en-GB': 'Several repositories, several versions, one list',
            'de-DE': 'Mehrere Repositories, mehrere Versionen, eine Liste',
            'es-ES': 'Varios repositorios, varias versiones, una lista',
            'fr-FR': 'Plusieurs dépôts, plusieurs versions, une seule liste',
            'pt-PT': 'Vários repositórios, várias versões, uma lista'
          },
          description: {
            'en-GB':
              'A source is a repository and the refs to publish from it. duxt turns the list into one collection per version and repo, and into the URL prefixes that keep them apart — decided at build time, so nothing is resolved while a reader waits.',
            'de-DE':
              'Eine Quelle ist ein Repository und die Refs, die daraus veröffentlicht werden. duxt macht daraus eine Collection je Version und Repository — samt der URL-Präfixe, die sie trennen. Entschieden zur Build-Zeit, damit zur Laufzeit nichts aufgelöst wird.',
            'es-ES':
              'Una fuente es un repositorio y las refs que publicar de él. duxt convierte la lista en una colección por versión y repositorio, y en los prefijos de URL que las separan: decidido en tiempo de compilación.',
            'fr-FR':
              'Une source, c’est un dépôt et les refs à en publier. duxt transforme la liste en une collection par version et par dépôt, et en préfixes d’URL qui les distinguent — décidés au build.',
            'pt-PT':
              'Uma fonte é um repositório e as refs a publicar dele. O duxt transforma a lista numa coleção por versão e repositório, e nos prefixos de URL que as separam — decididos na build.'
          },
          bullets: [
            {
              icon: 'lucide:git-merge',
              label: {
                'en-GB':
                  'Cloning, private-repo auth and caching are Content v3’s own, not a rebuild.',
                'de-DE':
                  'Klonen, Auth für private Repos und Caching kommen von Content v3 selbst — nicht nachgebaut.',
                'es-ES':
                  'Clonado, autenticación de repos privados y caché son del propio Content v3.',
                'fr-FR':
                  'Clonage, authentification des dépôts privés et cache viennent de Content v3.',
                'pt-PT':
                  'Clonagem, autenticação de repositórios privados e cache vêm do próprio Content v3.'
              }
            },
            {
              icon: 'lucide:link',
              label: {
                'en-GB':
                  'A single source needs no prefix at all — a segment with one value distinguishes nothing.',
                'de-DE':
                  'Eine einzelne Quelle braucht gar kein Präfix — ein Segment mit nur einem Wert unterscheidet nichts.',
                'es-ES':
                  'Una fuente única no necesita prefijo: un segmento con un solo valor no distingue nada.',
                'fr-FR':
                  'Une source unique n’a besoin d’aucun préfixe — un segment à valeur unique ne distingue rien.',
                'pt-PT':
                  'Uma fonte única não precisa de prefixo — um segmento com um só valor não distingue nada.'
              }
            },
            {
              icon: 'lucide:layers',
              label: {
                'en-GB':
                  'The switcher stays on the page you are reading, and says when it does not exist there.',
                'de-DE':
                  'Der Umschalter bleibt auf der Seite, die du liest — und sagt es, wenn es sie dort nicht gibt.',
                'es-ES':
                  'El selector permanece en la página que lees, y avisa cuando allí no existe.',
                'fr-FR':
                  'Le sélecteur reste sur la page que vous lisez, et le dit quand elle n’y existe pas.',
                'pt-PT':
                  'O seletor permanece na página que está a ler, e avisa quando ela não existe lá.'
              }
            }
          ],
          action: {
            label: {
              'en-GB': 'URLs and versions',
              'de-DE': 'URLs und Versionen',
              'es-ES': 'URLs y versiones',
              'fr-FR': 'URL et versions',
              'pt-PT': 'URLs e versões'
            },
            to: '/concepts/urls-and-versions'
          },
          demo: {
            type: 'code',
            files: [
              {
                name: 'app/app.config.ts',
                language: 'typescript',
                code: `sources: [
  // The repository you are standing in.
  { path: 'docs' },

  // Another one, at three of its tags.
  {
    repo: 'acme/api',
    path: 'docs',
    refs: [
      { branch: 'main', status: 'upcoming' },
      { tag: 'v2.0.0' },
      { tag: 'v1.4.0', status: 'eol' }
    ]
  }
],
sourceOptions: { defaultRef: 'v2.0.0' }
`
              },
              {
                name: 'routes',
                language: 'bash',
                code: `# What the build publishes from the list beside this.

/guides/deploying          # this repository, no prefix
/api/guides/retries        # acme/api at v2.0.0, the default ref
/api/main/guides/retries   # the branch, marked "upcoming"
/api/v1.4.0/guides/retries # the old tag, noindex + canonical
`
              }
            ]
          }
        },
        {
          badge: {
            'en-GB': 'API reference',
            'de-DE': 'API-Referenz',
            'es-ES': 'Referencia de API',
            'fr-FR': 'Référence API',
            'pt-PT': 'Referência da API'
          },
          icon: 'lucide:plug',
          title: {
            'en-GB': 'An OpenAPI document, published as pages',
            'de-DE': 'Ein OpenAPI-Dokument, veröffentlicht als Seiten',
            'es-ES': 'Un documento OpenAPI, publicado como páginas',
            'fr-FR': 'Un document OpenAPI, publié en pages',
            'pt-PT': 'Um documento OpenAPI, publicado como páginas'
          },
          description: {
            'en-GB':
              'Point a source at the file and duxt builds an overview, a page per tag and a page per operation — with the schemas expanded, the security named and the examples derived. They are an ordinary collection, which is the whole point.',
            'de-DE':
              'Zeig mit einer Quelle auf die Datei, und duxt baut daraus eine Übersicht, eine Seite je Tag und eine je Operation — mit aufgelösten Schemas, benannter Security und abgeleiteten Beispielen. Das Ergebnis ist eine ganz normale Collection, und genau das ist der Punkt.',
            'es-ES':
              'Apunta una fuente al archivo y duxt construye un resumen, una página por etiqueta y otra por operación, con los esquemas expandidos, la seguridad nombrada y los ejemplos derivados. Son una colección normal, y ese es el objetivo.',
            'fr-FR':
              'Pointez une source vers le fichier et duxt en construit un aperçu, une page par tag et une par opération — schémas dépliés, sécurité nommée, exemples dérivés. C’est une collection ordinaire, et c’est tout l’intérêt.',
            'pt-PT':
              'Aponta uma fonte para o ficheiro e o duxt constrói uma visão geral, uma página por tag e uma por operação — com os esquemas expandidos, a segurança nomeada e os exemplos derivados. São uma coleção normal, e é esse o objetivo.'
          },
          bullets: [
            {
              icon: 'lucide:search',
              label: {
                'en-GB':
                  'Search finds them, llms.txt lists them, the sitemap carries them.',
                'de-DE':
                  'Die Suche findet sie, llms.txt listet sie, die Sitemap führt sie.',
                'es-ES':
                  'La búsqueda las encuentra, llms.txt las lista, el sitemap las incluye.',
                'fr-FR':
                  'La recherche les trouve, llms.txt les liste, le sitemap les porte.',
                'pt-PT':
                  'A pesquisa encontra-as, o llms.txt lista-as, o sitemap transporta-as.'
              }
            },
            {
              icon: 'lucide:git-compare',
              label: {
                'en-GB':
                  'Versioned like the prose: the switcher moves between two versions of one endpoint.',
                'de-DE':
                  'Versioniert wie die Prosa: Der Umschalter wechselt zwischen zwei Versionen desselben Endpunkts.',
                'es-ES':
                  'Versionada como la prosa: el selector cambia entre dos versiones de un mismo endpoint.',
                'fr-FR':
                  'Versionnée comme la prose : le sélecteur passe d’une version d’un endpoint à l’autre.',
                'pt-PT':
                  'Versionada como a prosa: o seletor alterna entre duas versões do mesmo endpoint.'
              }
            },
            {
              icon: 'lucide:file-code-2',
              label: {
                'en-GB':
                  'Written next to your Markdown — an operation page can carry prose of its own.',
                'de-DE':
                  'Steht neben deinem Markdown — eine Operationsseite kann eigene Prosa tragen.',
                'es-ES':
                  'Junto a tu Markdown: una página de operación puede llevar su propia prosa.',
                'fr-FR':
                  'À côté de votre Markdown — une page d’opération peut porter sa propre prose.',
                'pt-PT':
                  'Ao lado do teu Markdown — uma página de operação pode ter prosa própria.'
              }
            }
          ],
          action: {
            label: {
              'en-GB': 'Open the reference',
              'de-DE': 'Referenz öffnen',
              'es-ES': 'Abrir la referencia',
              'fr-FR': 'Ouvrir la référence',
              'pt-PT': 'Abrir a referência'
            },
            to: '/api'
          },
          demo: {
            type: 'frame',
            to: '/api/widgets',
            height: '34rem',
            skeleton: 'api'
          }
        },
        {
          badge: {
            'en-GB': 'Try it',
            'de-DE': 'Ausprobieren',
            'es-ES': 'Pruébalo',
            'fr-FR': 'Essayer',
            'pt-PT': 'Experimentar'
          },
          icon: 'lucide:send',
          title: {
            'en-GB': 'A client that sends the real request',
            'de-DE': 'Ein Client, der den echten Request schickt',
            'es-ES': 'Un cliente que envía la petición real',
            'fr-FR': 'Un client qui envoie la vraie requête',
            'pt-PT': 'Um cliente que envia o pedido real'
          },
          description: {
            'en-GB':
              'Every operation page carries a client. Fill in the parameters, edit the body against its schema, send it from your own browser — and read the response beside the sample that would have produced it.',
            'de-DE':
              'Jede Operationsseite bringt einen Client mit. Parameter ausfüllen, den Body gegen sein Schema bearbeiten, aus dem eigenen Browser abschicken — und die Antwort neben dem Beispiel lesen, das sie erzeugt hätte.',
            'es-ES':
              'Cada página de operación lleva un cliente. Rellena los parámetros, edita el cuerpo contra su esquema, envíalo desde tu navegador y lee la respuesta junto al ejemplo que la habría producido.',
            'fr-FR':
              'Chaque page d’opération embarque un client. Remplissez les paramètres, modifiez le corps face à son schéma, envoyez depuis votre navigateur — et lisez la réponse à côté de l’exemple qui l’aurait produite.',
            'pt-PT':
              'Cada página de operação traz um cliente. Preenche os parâmetros, edita o corpo contra o seu esquema, envia a partir do teu browser — e lê a resposta ao lado do exemplo que a teria produzido.'
          },
          bullets: [
            {
              icon: 'lucide:terminal',
              label: {
                'en-GB':
                  'Seven samples out of the box, twelve shipped, or one of your own — rewritten as you type.',
                'de-DE':
                  'Sieben Beispiele ab Werk, zwölf mitgeliefert, oder ein eigenes — mitgeschrieben beim Tippen.',
                'es-ES':
                  'Siete ejemplos de fábrica, doce incluidos, o uno propio: reescritos mientras escribes.',
                'fr-FR':
                  'Sept exemples d’origine, douze fournis, ou le vôtre — réécrits à la frappe.',
                'pt-PT':
                  'Sete exemplos de origem, doze incluídos, ou um teu — reescritos enquanto escreves.'
              }
            },
            {
              icon: 'lucide:braces',
              label: {
                'en-GB':
                  'The body editor is CodeMirror, loaded on demand: a page without an endpoint downloads none of it.',
                'de-DE':
                  'Der Body-Editor ist CodeMirror, bei Bedarf geladen: Eine Seite ohne Endpunkt lädt davon nichts.',
                'es-ES':
                  'El editor del cuerpo es CodeMirror, cargado bajo demanda: una página sin endpoint no descarga nada de él.',
                'fr-FR':
                  'L’éditeur de corps est CodeMirror, chargé à la demande : une page sans endpoint n’en télécharge rien.',
                'pt-PT':
                  'O editor do corpo é CodeMirror, carregado a pedido: uma página sem endpoint não descarrega nada dele.'
              }
            },
            {
              icon: 'lucide:key-round',
              label: {
                'en-GB':
                  'Your token stays in your browser — there is no server in this to send it to.',
                'de-DE':
                  'Dein Token bleibt im Browser — es gibt hier keinen Server, an den es ginge.',
                'es-ES':
                  'Tu token se queda en tu navegador: aquí no hay servidor al que enviarlo.',
                'fr-FR':
                  'Votre jeton reste dans votre navigateur — il n’y a ici aucun serveur à qui l’envoyer.',
                'pt-PT':
                  'O teu token fica no teu browser — aqui não há servidor a quem enviá-lo.'
              }
            }
          ],
          action: {
            label: {
              'en-GB': 'How the client works',
              'de-DE': 'Wie der Client funktioniert',
              'es-ES': 'Cómo funciona el cliente',
              'fr-FR': 'Comment le client fonctionne',
              'pt-PT': 'Como funciona o cliente'
            },
            to: '/reference/openapi/try-it'
          },
          // THE CLIENT ITSELF, not the page it lives on. A frame of that page
          // showed the description and hid the panel — it sits beside the
          // endpoint only above 80rem — and it booted a second copy of the
          // application to do it. The tab in the window above still shows the
          // page, which is the other true thing to show.
          // THE ONE OPERATION THIS SITE ANSWERS. `createWidget` was the honest
          // choice for a page and the wrong one for a band: two schemes, a
          // server with a stage variable, six parameters — and a Send button
          // that could only fail, because no host is behind the invented API.
          //
          // `/echo` is the same shape at a tenth the height, with one server,
          // one bearer field and two body fields, answered by a Nitro route in
          // `www/server/`. A reader presses Send and gets a 201 back.
          // THE WHOLE WIDTH, and the prose above it rather than beside it: the
          // client is a control built for a column of its own, and half a band
          // is not one. `full` also splits it — form in one card, "this request
          // in your stack" as a section under it.
          full: true,
          demo: {
            type: 'operation',
            to: '/api/demo/echowidget',
            // The words beside the SECOND row. The client splits itself into
            // the form and the samples, and each row wants its own sentence —
            // one component, so the sample really is the request the button
            // above just sent, down to the token you typed.
            samples: {
              badge: {
                'en-GB': 'In your stack',
                'de-DE': 'In deinem Stack',
                'es-ES': 'En tu stack',
                'fr-FR': 'Dans votre stack',
                'pt-PT': 'Na tua stack'
              },
              icon: 'lucide:terminal',
              title: {
                'en-GB': 'The same request, in your own language',
                'de-DE': 'Derselbe Request, in deiner Sprache',
                'es-ES': 'La misma petición, en tu propio lenguaje',
                'fr-FR': 'La même requête, dans votre langage',
                'pt-PT': 'O mesmo pedido, na tua linguagem'
              },
              description: {
                'en-GB':
                  'Not an example of a request like the one above — that request. The server you picked, the token you typed and the body you edited, rewritten on every keystroke into whichever client you are going to paste it in.',
                'de-DE':
                  'Kein Beispiel für einen Request wie den obigen — genau dieser. Der gewählte Server, das eingetippte Token, der bearbeitete Body — bei jedem Tastendruck neu geschrieben, in den Client, in den du ihn einfügen wirst.',
                'es-ES':
                  'No un ejemplo de una petición como la de arriba: esa petición. El servidor que elegiste, el token que escribiste y el cuerpo que editaste, reescritos en cada pulsación al cliente donde vayas a pegarlo.',
                'fr-FR':
                  'Pas un exemple de requête comme celle du dessus — cette requête-là. Le serveur choisi, le jeton saisi et le corps modifié, réécrits à chaque frappe dans le client où vous allez la coller.',
                'pt-PT':
                  'Não um exemplo de um pedido como o de cima — esse pedido. O servidor que escolheste, o token que escreveste e o corpo que editaste, reescritos a cada tecla para o cliente onde o vais colar.'
              },
              bullets: [
                {
                  icon: 'lucide:refresh-cw',
                  label: {
                    'en-GB':
                      'One component, so the sample and the button can never disagree.',
                    'de-DE':
                      'Eine Komponente — Beispiel und Button können gar nicht auseinanderlaufen.',
                    'es-ES':
                      'Un solo componente: el ejemplo y el botón no pueden discrepar.',
                    'fr-FR':
                      'Un seul composant : l’exemple et le bouton ne peuvent pas diverger.',
                    'pt-PT':
                      'Um só componente: o exemplo e o botão não podem divergir.'
                  }
                },
                {
                  icon: 'lucide:list-plus',
                  label: {
                    'en-GB':
                      'Add your own with `requestSamples`, or drop the ones your readers do not use.',
                    'de-DE':
                      'Eigene über `requestSamples` ergänzen — oder die weglassen, die deine Leser nicht nutzen.',
                    'es-ES':
                      'Añade los tuyos con `requestSamples`, o quita los que tus lectores no usan.',
                    'fr-FR':
                      'Ajoutez les vôtres avec `requestSamples`, ou retirez ceux que vos lecteurs n’utilisent pas.',
                    'pt-PT':
                      'Acrescenta os teus com `requestSamples`, ou tira os que os teus leitores não usam.'
                  }
                }
              ],
              action: {
                label: {
                  'en-GB': 'Request samples',
                  'de-DE': 'Request-Beispiele',
                  'es-ES': 'Ejemplos de petición',
                  'fr-FR': 'Exemples de requête',
                  'pt-PT': 'Exemplos de pedido'
                },
                to: '/reference/openapi/request-samples'
              }
            }
          }
        },
        {
          badge: {
            'en-GB': 'Machine readers',
            'de-DE': 'Maschinenleser',
            'es-ES': 'Lectores automáticos',
            'fr-FR': 'Lecteurs machine',
            'pt-PT': 'Leitores automáticos'
          },
          icon: 'lucide:bot',
          title: {
            'en-GB': 'Written for the model reading it too',
            'de-DE': 'Auch für das Modell geschrieben, das mitliest',
            'es-ES': 'Escrita también para el modelo que la lee',
            'fr-FR': 'Écrite aussi pour le modèle qui la lit',
            'pt-PT': 'Escrita também para o modelo que a lê'
          },
          description: {
            'en-GB':
              'The same content, published a second time in the shapes a machine reads: an index at llms.txt, the whole site at llms-full.txt, every page available as its own Markdown, and an MCP route an assistant can search.',
            'de-DE':
              'Derselbe Inhalt, ein zweites Mal veröffentlicht in den Formen, die eine Maschine liest: ein Index unter llms.txt, die ganze Seite unter llms-full.txt, jede Seite als eigenes Markdown — und eine MCP-Route, die ein Assistent durchsuchen kann.',
            'es-ES':
              'El mismo contenido, publicado por segunda vez en las formas que lee una máquina: un índice en llms.txt, el sitio entero en llms-full.txt, cada página como su propio Markdown y una ruta MCP que un asistente puede buscar.',
            'fr-FR':
              'Le même contenu, publié une seconde fois dans les formes qu’une machine lit : un index à llms.txt, tout le site à llms-full.txt, chaque page en Markdown, et une route MCP qu’un assistant peut interroger.',
            'pt-PT':
              'O mesmo conteúdo, publicado uma segunda vez nas formas que uma máquina lê: um índice em llms.txt, o site inteiro em llms-full.txt, cada página como o seu próprio Markdown e uma rota MCP que um assistente pode pesquisar.'
          },
          bullets: [
            {
              icon: 'lucide:file-text',
              label: {
                'en-GB':
                  'Build output, not a runtime service — the files are on the CDN with the pages.',
                'de-DE':
                  'Build-Ausgabe, kein Laufzeitdienst — die Dateien liegen mit den Seiten im CDN.',
                'es-ES':
                  'Salida de compilación, no un servicio en ejecución: los archivos están en el CDN con las páginas.',
                'fr-FR':
                  'Sortie de build, pas un service à l’exécution — les fichiers sont sur le CDN avec les pages.',
                'pt-PT':
                  'Saída da build, não um serviço em execução — os ficheiros estão no CDN com as páginas.'
              }
            },
            {
              icon: 'lucide:clipboard-copy',
              label: {
                'en-GB':
                  'Every page has a "copy as Markdown", and a link that opens it in an assistant.',
                'de-DE':
                  'Jede Seite hat ein „als Markdown kopieren“ — und einen Link, der sie in einem Assistenten öffnet.',
                'es-ES':
                  'Cada página tiene un «copiar como Markdown» y un enlace que la abre en un asistente.',
                'fr-FR':
                  'Chaque page a un « copier en Markdown » et un lien qui l’ouvre dans un assistant.',
                'pt-PT':
                  'Cada página tem um «copiar como Markdown» e uma ligação que a abre num assistente.'
              }
            },
            {
              icon: 'lucide:plug-zap',
              label: {
                'en-GB':
                  'The MCP route serves the same collections the site queries — one source, two readers.',
                'de-DE':
                  'Die MCP-Route liefert dieselben Collections, die auch die Seite abfragt — eine Quelle, zwei Leser.',
                'es-ES':
                  'La ruta MCP sirve las mismas colecciones que consulta el sitio: una fuente, dos lectores.',
                'fr-FR':
                  'La route MCP sert les mêmes collections que le site interroge — une source, deux lecteurs.',
                'pt-PT':
                  'A rota MCP serve as mesmas coleções que o site consulta — uma fonte, dois leitores.'
              }
            }
          ],
          action: {
            label: {
              'en-GB': 'Machine readers',
              'de-DE': 'Maschinenleser',
              'es-ES': 'Lectores automáticos',
              'fr-FR': 'Lecteurs machine',
              'pt-PT': 'Leitores automáticos'
            },
            to: '/concepts/machine-readers'
          },
          demo: {
            type: 'frame',
            to: '/llms.txt',
            height: '28rem',
            skeleton: 'text'
          }
        }
      ],

      // Written out here rather than inherited, because each card now POINTS at
      // the page that explains it — and the layer cannot know those paths. Same
      // reason `sections` above is written out: `duxt.defaults.*` is the layer's
      // private namespace, and a consumer reaching into it turns an internal
      // rename into a silent break.
      features: [
        {
          title: {
            'en-GB': "Extend, don't scaffold",
            'de-DE': 'Erweitern statt generieren',
            'es-ES': 'Extender, no generar',
            'fr-FR': 'Étendre, pas générer',
            'pt-PT': 'Estender, não gerar'
          },
          description: {
            'en-GB':
              'One line of config brings theme, pages and components — override any file.',
            'de-DE':
              'Eine Zeile Konfiguration bringt Theme, Seiten und Komponenten — jede Datei bleibt überschreibbar.',
            'es-ES':
              'Una línea de configuración aporta tema, páginas y componentes: cualquier archivo se puede sobrescribir.',
            'fr-FR':
              'Une ligne de configuration apporte thème, pages et composants — chaque fichier reste remplaçable.',
            'pt-PT':
              'Uma linha de configuração traz tema, páginas e componentes — qualquer ficheiro pode ser substituído.',
            'pt-BR':
              'Uma linha de configuração traz tema, páginas e componentes — qualquer arquivo pode ser substituído.'
          },
          icon: 'lucide:package',
          to: '/getting-started/installation'
        },
        {
          title: {
            'en-GB': 'Sources as a list',
            'de-DE': 'Quellen als Liste',
            'es-ES': 'Fuentes como una lista',
            'fr-FR': 'Les sources comme une liste',
            'pt-PT': 'Fontes como uma lista'
          },
          description: {
            'en-GB':
              'One declaration per source instead of one collection per version and repo.',
            'de-DE':
              'Eine Deklaration pro Quelle statt einer Collection pro Version und Repository.',
            'es-ES':
              'Una declaración por fuente en lugar de una colección por versión y repositorio.',
            'fr-FR':
              "Une déclaration par source au lieu d'une collection par version et par dépôt.",
            'pt-PT':
              'Uma declaração por fonte em vez de uma coleção por versão e repositório.'
          },
          icon: 'lucide:git-branch',
          to: '/concepts/sources'
        },
        {
          title: {
            'en-GB': 'Versions that switch',
            'de-DE': 'Versionen zum Umschalten',
            'es-ES': 'Versiones conmutables',
            'fr-FR': 'Des versions commutables',
            'pt-PT': 'Versões comutáveis'
          },
          description: {
            'en-GB':
              'A tag becomes a version, and the switcher stays on the page you are reading.',
            'de-DE':
              'Ein Tag wird zur Version — der Umschalter bleibt auf der Seite, die du liest.',
            'es-ES':
              'Una etiqueta se convierte en versión, y el selector no abandona la página que lees.',
            'fr-FR':
              'Un tag devient une version, et le sélecteur reste sur la page que vous lisez.',
            'pt-PT':
              'Uma tag torna-se uma versão, e o seletor permanece na página que está a ler.'
          },
          icon: 'lucide:layers',
          to: '/concepts/urls-and-versions'
        },
        {
          title: {
            'en-GB': 'Localised out of the box',
            'de-DE': 'Mehrsprachig ab Werk',
            'es-ES': 'Localizado de fábrica',
            'fr-FR': "Localisé d'origine",
            'pt-PT': 'Localizado de origem'
          },
          description: {
            'en-GB':
              'The interface is translated; your pages carry a locale prefix and an hreflang.',
            'de-DE':
              'Die Oberfläche ist übersetzt; deine Seiten bekommen Locale-Präfix und hreflang.',
            'es-ES':
              'La interfaz está traducida; tus páginas llevan prefijo de idioma y hreflang.',
            'fr-FR':
              "L'interface est traduite ; vos pages portent un préfixe de langue et un hreflang.",
            'pt-PT':
              'A interface está traduzida; as suas páginas levam prefixo de idioma e hreflang.'
          },
          icon: 'lucide:languages',
          to: '/concepts/localisation'
        },
        {
          title: {
            'en-GB': 'Git-native, not reinvented',
            'de-DE': 'Git-nativ, nicht nachgebaut',
            'es-ES': 'Nativo de Git, no reinventado',
            'fr-FR': 'Natif Git, pas réinventé',
            'pt-PT': 'Nativo de Git, não reinventado'
          },
          description: {
            'en-GB':
              'Branches, tags, private repos and caching come from Content v3 itself.',
            'de-DE':
              'Branches, Tags, private Repositories und Caching kommen aus Content v3 selbst.',
            'es-ES':
              'Ramas, etiquetas, repositorios privados y caché vienen del propio Content v3.',
            'fr-FR':
              'Branches, tags, dépôts privés et cache viennent de Content v3 lui-même.',
            'pt-PT':
              'Ramos, tags, repositórios privados e cache vêm do próprio Content v3.',
            'pt-BR':
              'Branches, tags, repositórios privados e cache vêm do próprio Content v3.'
          },
          icon: 'lucide:git-merge',
          to: '/concepts/collections'
        },
        {
          title: 'shadcn-vue',
          description: {
            'en-GB':
              'Components are copied in, not imported. Restyling one is editing a file.',
            'de-DE':
              'Komponenten werden kopiert, nicht importiert. Umgestalten heißt eine Datei bearbeiten.',
            'es-ES':
              'Los componentes se copian, no se importan. Rediseñar uno es editar un archivo.',
            'fr-FR':
              "Les composants sont copiés, pas importés. En restyler un, c'est modifier un fichier.",
            'pt-PT':
              'Os componentes são copiados, não importados. Redesenhar um é editar um ficheiro.',
            'pt-BR':
              'Os componentes são copiados, não importados. Redesenhar um é editar um arquivo.'
          },
          icon: 'lucide:palette',
          to: '/guides/override-the-theme'
        },
        {
          title: {
            'en-GB': 'Components in Markdown',
            'de-DE': 'Komponenten in Markdown',
            'es-ES': 'Componentes en Markdown',
            'fr-FR': 'Des composants dans le Markdown',
            'pt-PT': 'Componentes em Markdown'
          },
          description: {
            'en-GB':
              'MDC ships with Content — call a Vue component with block syntax.',
            'de-DE':
              'MDC kommt mit Content — eine Vue-Komponente per Block-Syntax aufrufen.',
            'es-ES':
              'MDC viene con Content: llama a un componente Vue con sintaxis de bloque.',
            'fr-FR':
              'MDC est livré avec Content — appelez un composant Vue en syntaxe de bloc.',
            'pt-PT':
              'O MDC vem com o Content — chame um componente Vue com sintaxe de bloco.'
          },
          icon: 'lucide:code',
          to: '/reference/mdc-components'
        },
        {
          title: {
            'en-GB': 'Machine-readable',
            'de-DE': 'Maschinenlesbar',
            'es-ES': 'Legible por máquinas',
            'fr-FR': 'Lisible par une machine',
            'pt-PT': 'Legível por máquinas'
          },
          description: {
            'en-GB':
              'llms.txt and an MCP route over the same content, planned as build output.',
            'de-DE':
              'llms.txt und eine MCP-Route über denselben Inhalt, geplant als Build-Ausgabe.',
            'es-ES':
              'llms.txt y una ruta MCP sobre el mismo contenido, previstas como salida de compilación.',
            'fr-FR':
              'llms.txt et une route MCP sur le même contenu, prévues comme sortie de build.',
            'pt-PT':
              'llms.txt e uma rota MCP sobre o mesmo conteúdo, previstos como saída da build.'
          },
          icon: 'lucide:bot',
          to: '/concepts/machine-readers'
        }
      ],

      /**
       * The heading over that list — written HERE, not shipped by the layer.
       *
       * The rule is whether a reader sees the string: `featuresTitle` is
       * `sr-only`, so the layer may own it; this one is a line of prose on the
       * page, and prose on the page is the site's.
       */
      highlightsTitle: {
        'en-GB': 'And the rest',
        'de-DE': 'Und der Rest',
        'es-ES': 'Y lo demás',
        'fr-FR': 'Et le reste',
        'pt-PT': 'E o resto'
      },

      /**
       * The closing list: real, useful, and not worth a band or a card each.
       *
       * No links, deliberately. A reader who has come this far and wants the
       * offline search has the navigation; six more destinations at the bottom
       * of a landing page is a second navigation nobody asked for.
       */
      highlights: [
        {
          icon: 'lucide:search',
          title: {
            'en-GB': 'Search without a service',
            'de-DE': 'Suche ohne Dienst',
            'es-ES': 'Búsqueda sin servicio',
            'fr-FR': 'Recherche sans service',
            'pt-PT': 'Pesquisa sem serviço'
          },
          description: {
            'en-GB':
              'Fuzzy, keyboard-first, built from the same collections — no index to host.',
            'de-DE':
              'Unscharf, tastaturzuerst, aus denselben Collections gebaut — kein Index zu hosten.',
            'es-ES':
              'Difusa, primero el teclado, construida desde las mismas colecciones: sin índice que alojar.',
            'fr-FR':
              'Floue, clavier d’abord, construite sur les mêmes collections — aucun index à héberger.',
            'pt-PT':
              'Difusa, primeiro o teclado, construída a partir das mesmas coleções — sem índice para alojar.'
          }
        },
        {
          icon: 'lucide:shield-check',
          title: {
            'en-GB': 'Checks that fail the build',
            'de-DE': 'Prüfungen, die den Build kippen',
            'es-ES': 'Comprobaciones que rompen la build',
            'fr-FR': 'Des contrôles qui font échouer le build',
            'pt-PT': 'Verificações que quebram a build'
          },
          description: {
            'en-GB':
              'Dead internal links, missing anchors and untranslated pages are reported before deploy.',
            'de-DE':
              'Tote interne Links, fehlende Anker und unübersetzte Seiten werden vor dem Deploy gemeldet.',
            'es-ES':
              'Enlaces internos muertos, anclas ausentes y páginas sin traducir se informan antes del despliegue.',
            'fr-FR':
              'Liens internes morts, ancres manquantes et pages non traduites sont signalés avant le déploiement.',
            'pt-PT':
              'Ligações internas mortas, âncoras em falta e páginas por traduzir são reportadas antes do deploy.'
          }
        },
        {
          icon: 'lucide:wrench',
          title: {
            'en-GB': 'A devtools panel',
            'de-DE': 'Ein Devtools-Panel',
            'es-ES': 'Un panel de devtools',
            'fr-FR': 'Un panneau devtools',
            'pt-PT': 'Um painel de devtools'
          },
          description: {
            'en-GB':
              'Which source serves which prefix, which page came from where, what the checks found.',
            'de-DE':
              'Welche Quelle welches Präfix bedient, woher eine Seite kommt, was die Prüfungen fanden.',
            'es-ES':
              'Qué fuente sirve qué prefijo, de dónde vino cada página, qué encontraron las comprobaciones.',
            'fr-FR':
              'Quelle source sert quel préfixe, d’où vient chaque page, ce que les contrôles ont trouvé.',
            'pt-PT':
              'Que fonte serve que prefixo, de onde veio cada página, o que as verificações encontraram.'
          }
        },
        {
          icon: 'lucide:share-2',
          title: {
            'en-GB': 'SEO and OG images',
            'de-DE': 'SEO und OG-Bilder',
            'es-ES': 'SEO e imágenes OG',
            'fr-FR': 'SEO et images OG',
            'pt-PT': 'SEO e imagens OG'
          },
          description: {
            'en-GB':
              'Sitemap, robots, hreflang, schema.org and a rendered card per page — from the Nuxt SEO bundle.',
            'de-DE':
              'Sitemap, robots, hreflang, schema.org und eine gerenderte Karte je Seite — aus dem Nuxt-SEO-Bundle.',
            'es-ES':
              'Sitemap, robots, hreflang, schema.org y una tarjeta por página, del paquete Nuxt SEO.',
            'fr-FR':
              'Sitemap, robots, hreflang, schema.org et une carte rendue par page — du bundle Nuxt SEO.',
            'pt-PT':
              'Sitemap, robots, hreflang, schema.org e um cartão por página — do pacote Nuxt SEO.'
          }
        },
        {
          icon: 'lucide:scroll-text',
          title: {
            'en-GB': 'Changelogs as sections',
            'de-DE': 'Changelogs als Bereiche',
            'es-ES': 'Changelogs como secciones',
            'fr-FR': 'Des changelogs comme sections',
            'pt-PT': 'Changelogs como secções'
          },
          description: {
            'en-GB':
              'A CHANGELOG.md becomes a release log with a feed — one entry per version, or one page flat.',
            'de-DE':
              'Eine CHANGELOG.md wird zum Release-Log mit Feed — ein Eintrag je Version, oder eine Seite am Stück.',
            'es-ES':
              'Un CHANGELOG.md se convierte en registro de versiones con feed: una entrada por versión, o una página entera.',
            'fr-FR':
              'Un CHANGELOG.md devient un journal de versions avec flux — une entrée par version, ou une page entière.',
            'pt-PT':
              'Um CHANGELOG.md torna-se um registo de versões com feed — uma entrada por versão, ou uma página inteira.'
          }
        },
        {
          icon: 'lucide:signpost',
          title: {
            'en-GB': 'Redirects that survive a rename',
            'de-DE': 'Weiterleitungen, die eine Umbenennung überleben',
            'es-ES': 'Redirecciones que sobreviven a un renombrado',
            'fr-FR': 'Des redirections qui survivent à un renommage',
            'pt-PT': 'Redireções que sobrevivem a uma mudança de nome'
          },
          description: {
            'en-GB':
              'A moved page names its old path in frontmatter; the build turns the list into route rules.',
            'de-DE':
              'Eine verschobene Seite nennt ihren alten Pfad im Frontmatter; der Build macht Route-Rules daraus.',
            'es-ES':
              'Una página movida declara su ruta antigua en el frontmatter; la build las convierte en route rules.',
            'fr-FR':
              'Une page déplacée déclare son ancien chemin en frontmatter ; le build en fait des route rules.',
            'pt-PT':
              'Uma página movida declara o seu caminho antigo no frontmatter; a build transforma isso em route rules.'
          }
        },
        {
          icon: 'lucide:rss',
          title: {
            'en-GB': 'A feed, where there is news',
            'de-DE': 'Ein Feed, wo es Neues gibt',
            'es-ES': 'Un feed, donde hay novedades',
            'fr-FR': 'Un flux, là où il y a du neuf',
            'pt-PT': 'Um feed, onde há novidades'
          },
          description: {
            'en-GB':
              '/rss.xml over the section you name — off until you name one, because an edited page is not an event.',
            'de-DE':
              '/rss.xml über den Bereich, den du nennst — aus, bis du einen nennst: eine bearbeitete Seite ist kein Ereignis.',
            'es-ES':
              '/rss.xml sobre la sección que indiques; apagado hasta entonces, porque editar una página no es un evento.',
            'fr-FR':
              '/rss.xml sur la section que vous nommez — inactif tant que vous n’en nommez aucune : une page modifiée n’est pas un événement.',
            'pt-PT':
              '/rss.xml sobre a secção que indicares — desligado até indicares uma, porque editar uma página não é um evento.'
          }
        },
        {
          icon: 'lucide:command',
          title: {
            'en-GB': 'Keyboard from the first key',
            'de-DE': 'Tastatur ab der ersten Taste',
            'es-ES': 'Teclado desde la primera tecla',
            'fr-FR': 'Clavier dès la première touche',
            'pt-PT': 'Teclado desde a primeira tecla'
          },
          description: {
            'en-GB':
              '⌘K opens search, ? lists every binding the theme has, and the skip link comes before both.',
            'de-DE':
              '⌘K öffnet die Suche, ? listet jede Tastenbelegung des Themes, und der Sprunglink kommt vor beidem.',
            'es-ES':
              '⌘K abre la búsqueda, ? lista todos los atajos del tema, y el enlace de salto va antes que ambos.',
            'fr-FR':
              '⌘K ouvre la recherche, ? liste tous les raccourcis du thème, et le lien d’évitement précède les deux.',
            'pt-PT':
              '⌘K abre a pesquisa, ? lista todos os atalhos do tema, e a ligação de salto vem antes de ambos.'
          }
        },
        {
          icon: 'lucide:message-square-quote',
          title: {
            'en-GB': 'Feedback under every page',
            'de-DE': 'Feedback unter jeder Seite',
            'es-ES': 'Opiniones bajo cada página',
            'fr-FR': 'Un retour sous chaque page',
            'pt-PT': 'Feedback sob cada página'
          },
          description: {
            'en-GB':
              '"Was this helpful?" posted wherever you point it — your own endpoint, or an issue on the repo.',
            'de-DE':
              '„War das hilfreich?" — gesendet wohin du zeigst: an deinen eigenen Endpunkt oder als Issue im Repository.',
            'es-ES':
              '«¿Te ha servido?», enviado a donde lo apuntes: tu propio endpoint o una issue en el repositorio.',
            'fr-FR':
              '« Cette page vous a-t-elle aidé ? », envoyé où vous voulez : votre propre endpoint, ou une issue du dépôt.',
            'pt-PT':
              '«Isto ajudou?», enviado para onde apontares: o teu próprio endpoint ou uma issue no repositório.'
          }
        },
        {
          icon: 'lucide:git-commit-horizontal',
          title: {
            'en-GB': 'Who wrote it, and when',
            'de-DE': 'Wer es geschrieben hat, und wann',
            'es-ES': 'Quién lo escribió, y cuándo',
            'fr-FR': 'Qui l’a écrit, et quand',
            'pt-PT': 'Quem o escreveu, e quando'
          },
          description: {
            'en-GB':
              'Last updated, the contributors and an edit link — read from git, not written by hand.',
            'de-DE':
              'Zuletzt geändert, die Mitwirkenden und ein Bearbeiten-Link — aus git gelesen, nicht getippt.',
            'es-ES':
              'Última actualización, los colaboradores y un enlace de edición: leídos de git, no escritos a mano.',
            'fr-FR':
              'Dernière modification, les contributeurs et un lien d’édition — lus dans git, pas saisis à la main.',
            'pt-PT':
              'Última atualização, os contribuidores e uma ligação de edição — lidos do git, não escritos à mão.'
          }
        },
        {
          icon: 'lucide:share',
          title: {
            'en-GB': 'Hand a page to an assistant',
            'de-DE': 'Eine Seite an einen Assistenten geben',
            'es-ES': 'Pasar una página a un asistente',
            'fr-FR': 'Donner une page à un assistant',
            'pt-PT': 'Entregar uma página a um assistente'
          },
          description: {
            'en-GB':
              'Copy it as Markdown, or open it in Claude or ChatGPT — the same content the site renders.',
            'de-DE':
              'Als Markdown kopieren oder in Claude bzw. ChatGPT öffnen — derselbe Inhalt, den die Seite rendert.',
            'es-ES':
              'Cópiala como Markdown, o ábrela en Claude o ChatGPT: el mismo contenido que renderiza el sitio.',
            'fr-FR':
              'Copiez-la en Markdown, ou ouvrez-la dans Claude ou ChatGPT — le contenu même que le site rend.',
            'pt-PT':
              'Copia-a como Markdown, ou abre-a no Claude ou no ChatGPT — o mesmo conteúdo que o site apresenta.'
          }
        },
        {
          icon: 'lucide:blocks',
          title: {
            'en-GB': 'Components in Markdown',
            'de-DE': 'Komponenten in Markdown',
            'es-ES': 'Componentes en Markdown',
            'fr-FR': 'Des composants dans le Markdown',
            'pt-PT': 'Componentes em Markdown'
          },
          description: {
            'en-GB':
              'Callouts, steps, tabs, file trees, package-manager blocks and Mermaid — MDC, no extra module.',
            'de-DE':
              'Callouts, Steps, Tabs, Dateibäume, Paketmanager-Blöcke und Mermaid — MDC, ohne Zusatzmodul.',
            'es-ES':
              'Avisos, pasos, pestañas, árboles de archivos, bloques de gestor de paquetes y Mermaid: MDC, sin módulo extra.',
            'fr-FR':
              'Encarts, étapes, onglets, arborescences, blocs de gestionnaire de paquets et Mermaid — MDC, sans module supplémentaire.',
            'pt-PT':
              'Avisos, passos, separadores, árvores de ficheiros, blocos de gestor de pacotes e Mermaid — MDC, sem módulo extra.'
          }
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
