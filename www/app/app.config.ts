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
          { type: 'changelog', path: 'www/CHANGELOG.md', label: 'Releases' },
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
          { type: 'openapi', path: 'www/openapi.yaml', label: 'API' }
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
      // A navbar entry of its own rather than an item inside the dropdown: a
      // link buried in a menu is a link nobody opens the menu for, and this one
      // is a page of the site while the five above leave it. It sits after
      // Resources because it is the smaller thing.
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
          icon: 'lucide:message-circle',
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
        'en-GB': 'Documentation for Nuxt, versioned and multi-repo',
        'de-DE':
          'Dokumentation für Nuxt, versioniert und über mehrere Repositories',
        'es-ES': 'Documentación para Nuxt, versionada y multirrepositorio',
        'fr-FR': 'Documentation pour Nuxt, versionnée et multidépôt',
        'pt-PT': 'Documentação para Nuxt, com versões e vários repositórios'
      },

      // Also the `<meta name="description">`, the llms.txt blurb and the RSS
      // channel description — one sentence, four readers.
      description: {
        'en-GB':
          'Extend one layer and your docs/ folder becomes a site. Point it at other repositories, or at tags of the same one, and those become versions.',
        'de-DE':
          'Einen Layer erweitern, und dein docs/-Ordner wird zur Website. Zeig damit auf andere Repositories oder auf Tags desselben, und daraus werden Versionen.',
        'es-ES':
          'Extiende una capa y tu carpeta docs/ se convierte en un sitio. Apúntala a otros repositorios, o a etiquetas del mismo, y estos se convierten en versiones.',
        'fr-FR':
          "Étendez une couche et votre dossier docs/ devient un site. Pointez-la vers d'autres dépôts, ou vers des tags du même, et ceux-ci deviennent des versions.",
        'pt-PT':
          'Estenda uma camada e a sua pasta docs/ torna-se um site. Aponte-a para outros repositórios, ou para tags do mesmo, e estes tornam-se versões.'
      },

      // The window under the hero: this site's own getting-started page,
      // embedded and operable. `to` stays inside the site — see DuxtPreview.
      preview: { to: '/getting-started' },

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
          icon: 'lucide:github',
          variant: 'outline',
          external: true
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
