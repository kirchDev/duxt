// The consuming site's ENTIRE duxt config — sources, theme and legal links in
// one file. There is no duxt.sources.ts and no content.config.ts: the layer
// reads `sources` from here for both the collections and the resolved manifest.
//
// This is also the example: legal links belong to whoever runs the site, never
// to the template, so the layer ships the row empty and kirchDev fills it here.

/**
 * The demo tree's display name, shared by its four editions and the source that
 * carries its generated sections.
 *
 * One constant because five copies of one name drift, and a drifted copy does
 * not look like a typo in the search captions — it looks like a second project.
 */
const DEMO_NAME = {
  'en-GB': 'Demo documentation',
  de: 'Demo-Dokumentation',
  es: 'Documentación de demostración',
  fr: 'Documentation de démonstration',
  pt: 'Documentação de demonstração'
};

// This repository's documentation at the release, the unreleased branch
// and the original release. `repo` deliberately makes Content fetch each
// ref: a versioned source cannot read three revisions from this checkout.
const DUXT_DOCS = {
  repo: 'kirchDev/duxt',
  path: 'docs',
  // What the search captions call this source. Without it the fallback
  // is `title` above, which says "duxt" — the SITE. These are its
  // documentation pages specifically, and the demo tree below is the
  // other half of the same site. A record rather than a literal, because
  // unlike the wordmark this one is a noun that translates.
  name: {
    'en-GB': 'duxt documentation',
    de: 'duxt-Dokumentation',
    es: 'Documentación de duxt',
    fr: 'Documentation duxt',
    pt: 'Documentação do duxt'
  },
  statusDefaults: {
    latest: 'current',
    branch: 'upcoming',
    tag: 'deprecated'
  },
  refs: [
    { tag: 'latest', default: true },
    // Hidden while `latest` resolves to v0.2.0. The resolver retains it
    // automatically as deprecated when v0.3.1 is cut.
    { tag: 'v0.2.0' },
    { branch: 'main' },
    { tag: 'v0.1.0' }
  ],

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
  // The path resolves against the source's own root — this repository's,
  // because the source is read off disk. The public release history reads
  // the package's CHANGELOG.md, maintained by release-please.
  //
  // `label` is a plain string, not a record: it is also the URL segment,
  // and a translated text is not a stable URL — the same pair a version's
  // label makes. The entry appends itself to the section row above.
  generated: [
    // `navigation: 'navigation'` puts the entry in the TOP row rather
    // than in the section row: a release log is not a part of the
    // documentation the way "Guides" is, it is a thing the project has
    // beside its documentation. The entry itself is written by hand up in
    // `navigation`, between Resources and Credits — see there.
    {
      type: 'changelog',
      path: 'CHANGELOG.md',
      label: 'Releases',
      navigation: 'navigation'
    }
  ]
} satisfies DuxtSourceInput;

/**
 * IN `nuxt dev`, THE `main` EDITION IS THIS CHECKOUT.
 *
 * Every edition of `DUXT_DOCS` is downloaded — `latest` and `v0.2.0` from their
 * tags, `main` from the branch on GitHub — so an edit to `docs/` changed nothing
 * a dev server showed: the page was the pushed branch, and the working tree was
 * read by no collection at all.
 *
 * So on a dev server the branch is swapped for a source that reads the
 * checkout and NAMES the same version. Everything downstream keys off that
 * name — the `/main` prefix, the `docs_main` collections, the switcher entry,
 * the release pages — so the edition sits exactly where the downloaded one
 * did, and the released editions stay the real tags beside it.
 *
 * WITHOUT `generated`. Generated sections are identified per declaration, so
 * the changelog repeated here would be a SECOND artefact: a second "Releases"
 * entry in the navbar, and release pages no longer versions of the ones beside
 * them. The checkout's edition therefore has no release pages on a dev server;
 * the released editions keep theirs.
 *
 * `NODE_ENV` is what tells the two apart: `nuxi dev` sets `development` before
 * this file is read, and a build sets `production`. A deploy therefore still
 * serves the pushed `main`, never somebody's working tree.
 */
const DUXT_DOCS_EDITIONS: DuxtSourceInput[] =
  process.env.NODE_ENV === 'development'
    ? [
        {
          ...DUXT_DOCS,
          refs: DUXT_DOCS.refs.filter(
            (ref) => !('branch' in ref && ref.branch === 'main')
          )
        },
        {
          path: DUXT_DOCS.path,
          name: DUXT_DOCS.name,
          locales: DUXT_DOCS.locales,
          version: 'main',
          status: 'upcoming',
          origin: { repo: 'kirchDev/duxt', ref: 'main' }
        }
      ]
    : [DUXT_DOCS];

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
     * The release is canonical; the work in `main` and the retired first
     * release are explicitly reachable as editions. `latest` is resolved from
     * the remote tags during every build, so release-please never needs to
     * update this list when it cuts the next version.
     */
    sources: [
      ...DUXT_DOCS_EDITIONS,

      // The Demo overview is one document tree at four editions. The current
      // `v3.x` tree stays at `/demo`; the other editions keep the same overview
      // under their version prefix, just like the generated API does below.
      {
        path: 'www/demo/docs',
        slug: 'demo',
        name: DEMO_NAME,
        version: 'main',
        status: 'upcoming',
        origin: { repo: 'kirchDev/duxt', ref: 'main' }
      },
      {
        path: 'www/demo/docs',
        slug: 'demo',
        name: DEMO_NAME,
        version: 'v3.x',
        origin: { repo: 'kirchDev/duxt', ref: 'main' }
      },
      {
        path: 'www/demo/docs',
        slug: 'demo',
        name: DEMO_NAME,
        version: 'v2.x',
        status: 'deprecated',
        origin: { repo: 'kirchDev/duxt', ref: 'main' }
      },
      {
        path: 'www/demo/docs',
        slug: 'demo',
        name: DEMO_NAME,
        version: 'v1.x',
        status: 'eol',
        origin: { repo: 'kirchDev/duxt', ref: 'main' }
      },
      // A real provider reference, taken directly from the generator output
      // a consumer has in their repository. `v0.2.6` is the newest published
      // tag while this demo exists; a tag makes the example reproducible.
      {
        repo: 'kirchDev/terraform-provider-linear',
        path: 'docs',
        // Inside the demo area rather than an area of its own: the layer folds
        // a tree nested under another area's root into that area, so its pages
        // keep the demo row and the row's Terraform entry opens it.
        slug: 'demo/terraform',
        // Without this the search would caption every provider page with the
        // slug. A literal rather than a record: the product name is the same
        // word in every language.
        name: 'Terraform Provider',
        flavor: 'tfplugindocs',
        refs: [{ tag: 'v0.2.6', default: true }]
      },
      // Generated sections use the same default prefix but do not publish a
      // second Markdown collection there. Their declarations own the four
      // edition-specific artefacts, the API reference's and the changelogs'.
      {
        path: 'www/demo/docs',
        slug: 'demo',
        name: DEMO_NAME,
        content: false,
        origin: { repo: 'kirchDev/duxt', ref: 'main' },
        generated: [
          // An OpenAPI document, published as reference pages. `per-version`
          // like the changelogs below, but `per-locale` where they keep the
          // original language — the two policies the registry exists to make
          // parameters, one shared and one taking opposite values.
          //
          // No `locales` map: this site translates its prose and not its
          // (invented) API, so the reference is built once from the default
          // language and every other locale falls through to it with the
          // translation banner saying so. A site whose API description IS
          // translated names the file per locale instead.
          //
          // VERSIONED BY FILE, which is how an API usually is: four lines sit
          // beside each other in one checkout and none of them is a git ref.
          // Declared on the section rather than as four sources — two sections
          // are versions of one another only when one declaration produced
          // them.
          //
          // FOUR STATUSES, one each, which is the whole reason there are four:
          // `eol`, `deprecated`, `current` and `upcoming` are what a reader can
          // be told about the version they are in, and every one of them is now
          // rendered by `pnpm build:app` rather than described in a test.
          //
          // `navigation: 'sections'` — the default — puts the entry in the
          // SECTION ROW, and that row is now this source's own: the layer shows
          // the entries of the area the reader is in, so `/demo` and
          // `/demo/openapi` sit beside each other there while the documentation
          // keeps its six at the root. The navbar entry below opens the area;
          // the row moves around inside it.
          {
            type: 'openapi',
            path: 'www/demo/v3.yaml',
            label: 'OpenAPI',
            slug: 'openapi',
            icon: 'vscode-icons:file-type-swagger',
            versions: [
              {
                version: 'main',
                path: 'www/demo/main.yaml',
                status: 'upcoming'
              },
              { version: 'v3.x', path: 'www/demo/v3.yaml', default: true },
              {
                version: 'v2.x',
                path: 'www/demo/v2.yaml',
                status: 'deprecated'
              },
              { version: 'v1.x', path: 'www/demo/v1.yaml', status: 'eol' }
            ]
          },
          // THE SAME API, DESCRIBED THE OTHER WAY ROUND — a Bruno collection
          // beside the OpenAPI document above it, which is the comparison the
          // type was added to make visible. It is deliberately thinner: there
          // are no response schemas on these pages because a `.bru` file has
          // none, and the reference says so rather than inventing them.
          //
          // `tryIt` is the opt-in, and this site is the one place it can
          // honestly be turned on: `/demo/echo` is the one endpoint it really
          // answers, for every method the collection uses. The base is `/`
          // rather than `https://duxt.app` so every request goes to whatever
          // origin served the page — an absolute host sent `localhost` readers
          // to production, which answers no cross-origin request. A consumer
          // pointing it at a host that is not public would be handing readers a
          // send button that fails for a reason the page cannot explain.
          //
          // `fetch` turns on the Bruno deep link. It clones the repository's
          // default branch, which is why it sits BESIDE the archive rather than
          // instead of it — only the archive is pinned to the version on screen.
          {
            type: 'bruno',
            path: 'www/demo/collection',
            label: 'Bruno',
            slug: 'bruno',
            icon: 'vscode-icons:file-type-bruno',
            options: {
              tryIt: { baseUrl: '/' },
              fetch: 'https://github.com/kirchDev/duxt.git'
            }
          },
          // The fixture shows every change category in the split layout.
          {
            type: 'changelog',
            path: 'www/demo/CHANGELOG.md',
            label: 'Changelog',
            slug: 'changelog',
            navigation: 'sections',
            // PER VERSION, like the OpenAPI reference above: every demo
            // edition publishes its changelog at a route of its own, so the
            // switcher keeps a reader in the changelog when they change
            // versions. The editions are one fixture file, which is the demo's
            // stand-in for a changelog per ref.
            versions: [
              { version: 'main', status: 'upcoming' },
              { version: 'v3.x', default: true },
              { version: 'v2.x', status: 'deprecated' },
              { version: 'v1.x', status: 'eol' }
            ]
          },
          // Keep the full-file rendering available as a second demo.
          {
            type: 'changelog',
            path: 'www/demo/CHANGELOG.md',
            label: 'Changelog (flat)',
            slug: 'changelog-flat',
            navigation: false,
            options: { granularity: 'flat' },
            // PER VERSION, like the OpenAPI reference above: every demo
            // edition publishes its changelog at a route of its own, so the
            // switcher keeps a reader in the changelog when they change
            // versions. The editions are one fixture file, which is the demo's
            // stand-in for a changelog per ref.
            versions: [
              { version: 'main', status: 'upcoming' },
              { version: 'v3.x', default: true },
              { version: 'v2.x', status: 'deprecated' },
              { version: 'v1.x', status: 'eol' }
            ]
          }
        ]
      }
    ],
    // `latest` is the docs source's default (and therefore has no URL prefix);
    // the concrete tag behind it moves automatically whenever a newer release
    // exists. `v3.x` stays the default for the independently versioned demo.
    // Its `slug` keeps it below `/demo` while `showRepo` keeps the remote docs
    // source at the root.
    sourceOptions: {
      defaultLocale: 'en-GB',
      defaultRef: 'v3.x',
      showRepo: false
    },
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
      // THE DEMO AREA, placed by hand for the same reason the releases above
      // are: appended, it would land after Credits, and the thing this site
      // exists to show is not an afterthought of it.
      //
      // Labelled for the AREA and not for the reference inside it — `Demo`
      // rather than `Demo API`, because the row underneath already names the
      // two parts, and an entry called after one of its own children reads as
      // a second link to it.
      //
      // It points at the AREA, not at one page in it: `/demo` is where the
      // second source starts, and its own section row — the prose and the
      // reference — takes over from there. The highlight is a prefix match, so
      // the entry stays lit across every version of the reference under it.
      { label: 'Demo', to: '/demo', icon: 'lucide:flask-conical' },
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

    // THE DOCUMENTATION SOURCE'S OWN ROW, and it is written out because the
    // layer's default row assumes the section names it ships. These are this
    // site's folders, at the root, where the source that has no slug serves
    // them — the demo API beside them is in the navbar row instead, because it
    // is a thing standing next to the documentation rather than a part of it.
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
      },

      // THE SECOND SOURCE'S OWN PART, in the same list — the row is filtered by
      // the area the reader is in, so this one is invisible on every page of
      // the documentation above and stands beside the generated reference on
      // every page under `/demo`.
      //
      // The generated parts are written here too, and only for their ORDER:
      // appended, they would land after the Terraform entry. An entry at a
      // per-version section's own URL still follows the reader's version —
      // the layer points it at the edition being read, so `/demo/openapi`
      // below is `/demo/v2.x/openapi` to a reader on `v2.x`. The labels are
      // the tool or format each part renders, the same word in every language.
      {
        label: {
          'en-GB': 'Overview',
          'de-DE': 'Überblick',
          'es-ES': 'Resumen',
          'fr-FR': 'Vue d’ensemble',
          'pt-PT': 'Visão geral'
        },
        to: '/demo',
        icon: 'lucide:book-open-text'
      },
      {
        label: 'OpenAPI',
        to: '/demo/openapi',
        icon: 'vscode-icons:file-type-swagger'
      },
      {
        label: 'Bruno',
        to: '/demo/bruno',
        icon: 'vscode-icons:file-type-bruno'
      },
      { label: 'Changelog', to: '/demo/changelog', icon: 'lucide:tag' },
      // A source dialect remains ordinary documentation: a second source
      // nested under `/demo`, not a generated section.
      {
        label: 'Terraform',
        to: '/demo/terraform',
        icon: 'vscode-icons:file-type-terraform'
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
          to: 'https://discord.duxt.app/',
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
      // in either file. The pill links to this site's changelog.
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
        to: '/releases'
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
          'Versionierte Dokumentation aus den Repositories, die du schon hast',
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
          'duxt is a Nuxt layer: extend it and your docs/ folder becomes a site, with theme, search, API reference and llms.txt included. Point it at other repositories, or at tags of the same one, and each becomes a version.',
        'de-DE':
          'duxt ist ein Nuxt-Layer: erweitern, und dein docs/-Ordner wird zur Website, mit Theme, Suche, API-Referenz und llms.txt. Zeig damit auf andere Repositories oder auf Tags desselben, und jedes wird zu einer Version.',
        'es-ES':
          'duxt es una capa de Nuxt: extiéndela y tu carpeta docs/ se convierte en un sitio, con tema, búsqueda, referencia de API y llms.txt. Apúntala a otros repositorios, o a etiquetas del mismo, y cada uno se convierte en una versión.',
        'fr-FR':
          "duxt est une couche Nuxt : étendez-la et votre dossier docs/ devient un site, thème, recherche, référence d'API et llms.txt compris. Pointez-la vers d'autres dépôts, ou vers des tags du même, et chacun devient une version.",
        'pt-PT':
          'O duxt é uma camada Nuxt: estende-a e a tua pasta docs/ torna-se um site, com tema, pesquisa, referência de API e llms.txt. Aponta-a para outros repositórios, ou para tags do mesmo, e cada um torna-se uma versão.'
      },

      // How a reader installs the layer. The layer ships none — it does not
      // know what a consumer's project is called — so duxt's own site is where
      // duxt's own command belongs.
      command: 'npx nuxi@latest init -t github:kirchDev/duxt-starter',

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
      // ONE PAGE, AND THEREFORE NO TAB BAR. The window used to carry four tabs
      // — the guide, the API reference, the releases and `llms.txt` — and the
      // strip they drew sat directly over the framed site's own header and
      // section row: three rows of navigation stacked on top of each other
      // before the page began. Every one of those pages is a link away inside
      // the frame, so the strip bought nothing its own header does not.
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
              'duxt is a Nuxt layer, so extending it brings the theme, the pages, the components and the build steps at once, and leaves every one of them replaceable.',
            'de-DE':
              'duxt ist ein Nuxt-Layer: Erweitern bringt Theme, Seiten, Komponenten und Build-Schritte auf einmal und lässt jedes davon ersetzbar.',
            'es-ES':
              'duxt es una capa de Nuxt: extenderla aporta el tema, las páginas, los componentes y los pasos de compilación a la vez, y deja todo reemplazable.',
            'fr-FR':
              'duxt est une couche Nuxt : l’étendre apporte le thème, les pages, les composants et les étapes de build d’un coup, et laisse chacun remplaçable.',
            'pt-PT':
              'O duxt é uma camada Nuxt: estendê-la traz o tema, as páginas, os componentes e os passos da build de uma vez, e deixa tudo substituível.'
          },
          bullets: [
            {
              icon: 'lucide:folder-open',
              label: {
                'en-GB':
                  'No generator and nothing to eject: your repository keeps its own files.',
                'de-DE':
                  'Kein Generator, nichts zum Ejecten: dein Repository behält seine eigenen Dateien.',
                'es-ES':
                  'Sin generador y sin nada que expulsar: tu repositorio conserva sus archivos.',
                'fr-FR':
                  'Aucun générateur, rien à éjecter : votre dépôt garde ses propres fichiers.',
                'pt-PT':
                  'Sem gerador e sem nada para ejetar: o teu repositório mantém os seus ficheiros.'
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
                  'Builds to a static site: deploy it anywhere Nuxt goes.',
                'de-DE':
                  'Baut zu einer statischen Seite, deploybar überall, wo Nuxt läuft.',
                'es-ES':
                  'Compila a un sitio estático: despliégalo donde vaya Nuxt.',
                'fr-FR':
                  'Se compile en site statique, déployable partout où Nuxt va.',
                'pt-PT':
                  'Compila para um site estático: publica onde o Nuxt for.'
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
              'A source is a repository and the releases, tags or branches to publish from it. duxt turns the list into one collection per version and repo, and into the URL prefixes that keep them apart. Decided at build time, so nothing is resolved while a reader waits.',
            'de-DE':
              'Eine Quelle ist ein Repository und die Releases, Tags oder Branches, die daraus veröffentlicht werden. duxt macht daraus eine Collection je Version und Repository samt trennender URL-Präfixe — vollständig zur Build-Zeit.',
            'es-ES':
              'Una fuente es un repositorio y las versiones, tags o ramas que publicar. duxt convierte la lista en una colección por versión y repositorio y en los prefijos que las separan, todo durante la build.',
            'fr-FR':
              'Une source est un dépôt et les versions, tags ou branches à publier. duxt transforme la liste en une collection par version et dépôt et en préfixes qui les distinguent, le tout au build.',
            'pt-PT':
              'Uma fonte é um repositório e as versões, tags ou branches a publicar. O duxt transforma a lista numa coleção por versão e repositório e nos prefixos que as separam, tudo na build.'
          },
          bullets: [
            {
              icon: 'lucide:git-merge',
              label: {
                'en-GB':
                  'Cloning, private-repo auth and caching are Content v3’s own, not a rebuild.',
                'de-DE':
                  'Klonen, Auth für private Repos und Caching kommen von Content v3 selbst und werden nicht nachgebaut.',
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
                  'A single source needs no prefix at all: a segment with one value distinguishes nothing.',
                'de-DE':
                  'Eine einzelne Quelle braucht gar kein Präfix: ein Segment mit nur einem Wert unterscheidet nichts.',
                'es-ES':
                  'Una fuente única no necesita prefijo: un segmento con un solo valor no distingue nada.',
                'fr-FR':
                  'Une source unique n’a besoin d’aucun préfixe : un segment à valeur unique ne distingue rien.',
                'pt-PT':
                  'Uma fonte única não precisa de prefixo: um segmento com um só valor não distingue nada.'
              }
            },
            {
              icon: 'lucide:layers',
              label: {
                'en-GB':
                  'The switcher stays on the page you are reading, and says when it does not exist there.',
                'de-DE':
                  'Der Umschalter bleibt auf der Seite, die du liest, und sagt es, wenn es sie dort nicht gibt.',
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

  // Another one: retain the newest patch in every minor line.
  {
    repo: 'acme/api',
    path: 'docs',
    releases: { select: 'minor' },
    refs: [{ branch: 'main', status: 'upcoming' }]
  }
]
`
              },
              {
                name: 'routes',
                language: 'bash',
                code: `# What the build publishes from the list beside this.

/guides/deploying          # this repository, no prefix
/api/guides/retries        # acme/api at the newest selected release
/api/main/guides/retries   # the branch, marked "upcoming"
/api/v1.4.0/guides/retries # another retained minor line
`
              }
            ]
          }
        },
        {
          badge: {
            'en-GB': 'Generated reference',
            'de-DE': 'Generierte Referenz',
            'es-ES': 'Referencia generada',
            'fr-FR': 'Référence générée',
            'pt-PT': 'Referência gerada'
          },
          icon: 'lucide:plug',
          title: {
            'en-GB': 'Reference from the artefacts you already ship',
            'de-DE': 'Referenz aus den Artefakten, die du schon auslieferst',
            'es-ES': 'Referencia desde los artefactos que ya publicas',
            'fr-FR': 'Une référence depuis les artefacts que vous livrez déjà',
            'pt-PT': 'Referência a partir dos artefactos que já publicas'
          },
          description: {
            'en-GB':
              'OpenAPI documents become operation and schema pages, Bruno collections become request pages and downloads, and tfplugindocs trees become provider-aware references. All remain ordinary Content collections for search, versions and machine readers.',
            'de-DE':
              'OpenAPI-Dokumente werden zu Operations- und Schema-Seiten, Bruno-Collections zu Request-Seiten und Downloads und tfplugindocs-Bäume zu Provider-Referenzen. Alles bleibt eine gewöhnliche Content-Collection.',
            'es-ES':
              'OpenAPI se convierte en páginas de operaciones y schemas, Bruno en peticiones y descargas, y tfplugindocs en referencias de provider. Todo sigue siendo una colección Content corriente.',
            'fr-FR':
              'OpenAPI devient des pages d’opérations et de schémas, Bruno des requêtes et téléchargements, et tfplugindocs une référence de provider. Tout reste une collection Content ordinaire.',
            'pt-PT':
              'OpenAPI torna-se páginas de operações e schemas, Bruno pedidos e downloads, e tfplugindocs uma referência de provider. Tudo continua a ser uma coleção Content comum.'
          },
          bullets: [
            {
              icon: 'lucide:braces',
              label: {
                'en-GB':
                  'OpenAPI supplies operations, schemas, examples and security models.',
                'de-DE':
                  'OpenAPI liefert Operationen, Schemas, Beispiele und Security-Modelle.',
                'es-ES':
                  'OpenAPI aporta operaciones, schemas, ejemplos y modelos de seguridad.',
                'fr-FR':
                  'OpenAPI fournit opérations, schémas, exemples et modèles de sécurité.',
                'pt-PT':
                  'O OpenAPI fornece operações, schemas, exemplos e modelos de segurança.'
              }
            },
            {
              icon: 'lucide:folder-tree',
              label: {
                'en-GB':
                  'Bruno preserves request folders, docs and variables, and offers a redacted download.',
                'de-DE':
                  'Bruno erhält Request-Ordner, Doku und Variablen und bietet einen bereinigten Download.',
                'es-ES':
                  'Bruno conserva carpetas, documentación y variables y ofrece una descarga depurada.',
                'fr-FR':
                  'Bruno conserve dossiers, documentation et variables, avec un téléchargement expurgé.',
                'pt-PT':
                  'O Bruno preserva pastas, documentação e variáveis e oferece um download expurgado.'
              }
            },
            {
              icon: 'lucide:file-code-2',
              label: {
                'en-GB':
                  'tfplugindocs keeps provider categories and headings instead of flattening its Markdown tree.',
                'de-DE':
                  'tfplugindocs behält Provider-Kategorien und Überschriften, statt den Markdown-Baum zu glätten.',
                'es-ES':
                  'tfplugindocs conserva categorías y encabezados del provider sin aplanar el árbol Markdown.',
                'fr-FR':
                  'tfplugindocs conserve catégories et titres du provider sans aplatir l’arbre Markdown.',
                'pt-PT':
                  'O tfplugindocs conserva categorias e títulos do provider sem achatar a árvore Markdown.'
              }
            }
          ],
          action: {
            label: {
              'en-GB': 'How generated reference works',
              'de-DE': 'So funktioniert generierte Referenz',
              'es-ES': 'Cómo funciona la referencia generada',
              'fr-FR': 'Comment fonctionne la référence générée',
              'pt-PT': 'Como funciona a referência gerada'
            },
            to: '/concepts/generated-sections'
          },
          demo: {
            type: 'code',
            files: [
              {
                name: 'openapi.yaml',
                language: 'yaml',
                code: `openapi: 3.1.0
info:
  title: Acme API
  version: 2.4.0
paths:
  /widgets:
    get:
      operationId: listWidgets
`
              },
              {
                name: 'list-widgets.bru',
                language: 'text',
                code: `meta {
  name: List widgets
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/widgets
  body: none
  auth: inherit
}
`
              },
              {
                name: 'docs/resources/widget.md',
                language: 'markdown',
                code: `---
page_title: acme_widget Resource
subcategory: Widgets
---

# acme_widget (Resource)

Creates and manages an Acme widget.
`
              }
            ]
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
              'Every operation page carries a client. Fill in the parameters, edit the body against its schema, send it from your own browser, and read the response beside the sample that would have produced it.',
            'de-DE':
              'Jede Operationsseite bringt einen Client mit. Parameter ausfüllen, den Body gegen sein Schema bearbeiten, aus dem eigenen Browser abschicken und die Antwort neben dem Beispiel lesen, das sie erzeugt hätte.',
            'es-ES':
              'Cada página de operación lleva un cliente. Rellena los parámetros, edita el cuerpo contra su esquema, envíalo desde tu navegador y lee la respuesta junto al ejemplo que la habría producido.',
            'fr-FR':
              'Chaque page d’opération embarque un client. Remplissez les paramètres, modifiez le corps face à son schéma, envoyez depuis votre navigateur, et lisez la réponse à côté de l’exemple qui l’aurait produite.',
            'pt-PT':
              'Cada página de operação traz um cliente. Preenche os parâmetros, edita o corpo contra o seu esquema, envia a partir do teu browser, e lê a resposta ao lado do exemplo que a teria produzido.'
          },
          bullets: [
            {
              icon: 'lucide:terminal',
              label: {
                'en-GB':
                  'Seven samples out of the box, twelve shipped, or one of your own, rewritten as you type.',
                'de-DE':
                  'Sieben Beispiele ab Werk, zwölf mitgeliefert, oder ein eigenes, mitgeschrieben beim Tippen.',
                'es-ES':
                  'Siete ejemplos de fábrica, doce incluidos, o uno propio: reescritos mientras escribes.',
                'fr-FR':
                  'Sept exemples d’origine, douze fournis, ou le vôtre, réécrits à la frappe.',
                'pt-PT':
                  'Sete exemplos de origem, doze incluídos, ou um teu, reescritos enquanto escreves.'
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
                  'Your token stays in your browser: there is no server in this to send it to.',
                'de-DE':
                  'Dein Token bleibt im Browser: es gibt hier keinen Server, an den es ginge.',
                'es-ES':
                  'Tu token se queda en tu navegador: aquí no hay servidor al que enviarlo.',
                'fr-FR':
                  'Votre jeton reste dans votre navigateur : il n’y a ici aucun serveur à qui l’envoyer.',
                'pt-PT':
                  'O teu token fica no teu browser: aqui não há servidor a quem enviá-lo.'
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
            to: '/demo/openapi/demo/echoconsignment',
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
                  'Not an example of a request like the one above, but that request. The server you picked, the token you typed and the body you edited, rewritten on every keystroke into whichever client you are going to paste it in.',
                'de-DE':
                  'Kein Beispiel für einen Request wie den obigen, sondern genau dieser. Der gewählte Server, das eingetippte Token, der bearbeitete Body: bei jedem Tastendruck neu geschrieben, in den Client, in den du ihn einfügen wirst.',
                'es-ES':
                  'No un ejemplo de una petición como la de arriba: esa petición. El servidor que elegiste, el token que escribiste y el cuerpo que editaste, reescritos en cada pulsación al cliente donde vayas a pegarlo.',
                'fr-FR':
                  'Pas un exemple de requête comme celle du dessus, mais cette requête-là. Le serveur choisi, le jeton saisi et le corps modifié, réécrits à chaque frappe dans le client où vous allez la coller.',
                'pt-PT':
                  'Não um exemplo de um pedido como o de cima, mas esse pedido. O servidor que escolheste, o token que escreveste e o corpo que editaste, reescritos a cada tecla para o cliente onde o vais colar.'
              },
              bullets: [
                {
                  icon: 'lucide:refresh-cw',
                  label: {
                    'en-GB':
                      'One component, so the sample and the button can never disagree.',
                    'de-DE':
                      'Eine Komponente: Beispiel und Button können gar nicht auseinanderlaufen.',
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
                      'Eigene über `requestSamples` ergänzen oder die weglassen, die deine Leser nicht nutzen.',
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
              'The same content in the shapes a machine reads: an index at llms.txt, the default-version corpus at llms-full.txt, every page as Markdown, and an MCP route for listing versions and pages, searching and reading.',
            'de-DE':
              'Derselbe Inhalt in maschinenlesbaren Formen: ein Index unter llms.txt, die Standardversionen unter llms-full.txt, jede Seite als Markdown und eine MCP-Route zum Auflisten, Suchen und Lesen.',
            'es-ES':
              'El mismo contenido en formatos legibles por máquinas: índice en llms.txt, versiones predeterminadas en llms-full.txt, cada página en Markdown y una ruta MCP para listar, buscar y leer.',
            'fr-FR':
              'Le même contenu sous des formes lisibles par une machine : index dans llms.txt, versions par défaut dans llms-full.txt, chaque page en Markdown et route MCP pour lister, chercher et lire.',
            'pt-PT':
              'O mesmo conteúdo em formatos legíveis por máquinas: índice em llms.txt, versões predefinidas em llms-full.txt, cada página em Markdown e rota MCP para listar, pesquisar e ler.'
          },
          bullets: [
            {
              icon: 'lucide:file-text',
              label: {
                'en-GB':
                  'The text routes can be prerendered with the pages; MCP serves the same collections at runtime.',
                'de-DE':
                  'Textrouten können mit den Seiten vorgerendert werden; MCP liefert dieselben Collections zur Laufzeit.',
                'es-ES':
                  'Las rutas de texto pueden prerenderizarse; MCP sirve las mismas colecciones en ejecución.',
                'fr-FR':
                  'Les routes texte peuvent être prérendues ; MCP sert les mêmes collections à l’exécution.',
                'pt-PT':
                  'As rotas de texto podem ser pré-renderizadas; o MCP serve as mesmas coleções em execução.'
              }
            },
            {
              icon: 'lucide:clipboard-copy',
              label: {
                'en-GB':
                  'Every page has a "copy as Markdown", and a link that opens it in an assistant.',
                'de-DE':
                  'Jede Seite hat ein „als Markdown kopieren“ und einen Link, der sie in einem Assistenten öffnet.',
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
                  'The MCP route serves the same collections the site queries: one source, two readers.',
                'de-DE':
                  'Die MCP-Route liefert dieselben Collections, die auch die Seite abfragt: eine Quelle, zwei Leser.',
                'es-ES':
                  'La ruta MCP sirve las mismas colecciones que consulta el sitio: una fuente, dos lectores.',
                'fr-FR':
                  'La route MCP sert les mêmes collections que le site interroge : une source, deux lecteurs.',
                'pt-PT':
                  'A rota MCP serve as mesmas coleções que o site consulta: uma fonte, dois leitores.'
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
              'One line of config brings theme, pages and components. Override any file.',
            'de-DE':
              'Eine Zeile Konfiguration bringt Theme, Seiten und Komponenten. Jede Datei bleibt überschreibbar.',
            'es-ES':
              'Una línea de configuración aporta tema, páginas y componentes: cualquier archivo se puede sobrescribir.',
            'fr-FR':
              'Une ligne de configuration apporte thème, pages et composants, et chaque fichier reste remplaçable.',
            'pt-PT':
              'Uma linha de configuração traz tema, páginas e componentes, e qualquer ficheiro pode ser substituído.',
            'pt-BR':
              'Uma linha de configuração traz tema, páginas e componentes, e qualquer arquivo pode ser substituído.'
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
              'Discover every release or retain one per minor or major line; the switcher keeps your page.',
            'de-DE':
              'Alle Releases oder eines je Minor- oder Major-Linie entdecken; der Umschalter hält deine Seite.',
            'es-ES':
              'Descubre cada versión o conserva una por línea minor o major; el selector mantiene tu página.',
            'fr-FR':
              'Découvrez chaque version ou une par ligne mineure ou majeure ; le sélecteur garde votre page.',
            'pt-PT':
              'Descobre cada versão ou mantém uma por linha minor ou major; o seletor conserva a tua página.'
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
              'Locale fallbacks, hreflang and direction-aware UI; add an RTL locale without forking the theme.',
            'de-DE':
              'Locale-Fallbacks, hreflang und richtungsbewusste UI; RTL ohne Theme-Fork ergänzen.',
            'es-ES':
              'Fallbacks de locale, hreflang e interfaz sensible a la dirección; añade RTL sin bifurcar el tema.',
            'fr-FR':
              'Fallbacks de locale, hreflang et interface sensible au sens ; ajoutez RTL sans forker le thème.',
            'pt-PT':
              'Fallbacks de locale, hreflang e interface sensível à direção; acrescenta RTL sem fork do tema.'
          },
          icon: 'lucide:languages',
          to: '/concepts/localisation'
        },
        {
          title: {
            'en-GB': 'Checked before deploy',
            'de-DE': 'Vor dem Deploy geprüft',
            'es-ES': 'Comprobado antes del despliegue',
            'fr-FR': 'Vérifié avant le déploiement',
            'pt-PT': 'Verificado antes do deploy'
          },
          description: {
            'en-GB':
              'Dead links, missing anchors and untranslated pages stop or surface in the build.',
            'de-DE':
              'Tote Links, fehlende Anker und unübersetzte Seiten stoppen den Build oder werden darin sichtbar.',
            'es-ES':
              'Enlaces muertos, anclas ausentes y páginas sin traducir detienen la build o quedan visibles.',
            'fr-FR':
              'Liens morts, ancres absentes et pages non traduites arrêtent le build ou y sont signalés.',
            'pt-PT':
              'Ligações mortas, âncoras em falta e páginas por traduzir param a build ou ficam visíveis nela.',
            'pt-BR':
              'Links mortos, âncoras ausentes e páginas sem tradução param a build ou ficam visíveis nela.'
          },
          icon: 'lucide:shield-check',
          to: '/concepts/build-checks'
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
            'en-GB': 'Navigation from the content',
            'de-DE': 'Navigation aus dem Inhalt',
            'es-ES': 'Navegación desde el contenido',
            'fr-FR': 'Navigation issue du contenu',
            'pt-PT': 'Navegação a partir do conteúdo'
          },
          description: {
            'en-GB':
              'Sidebar, breadcrumbs, table of contents and previous or next links share one page tree.',
            'de-DE':
              'Sidebar, Breadcrumbs, Inhaltsverzeichnis und Vor- oder Zurück-Links teilen einen Seitenbaum.',
            'es-ES':
              'Barra lateral, migas, índice y enlaces anterior o siguiente comparten un árbol de páginas.',
            'fr-FR':
              'Barre latérale, fil d’Ariane, sommaire et liens précédent ou suivant partagent le même arbre.',
            'pt-PT':
              'Barra lateral, breadcrumbs, índice e ligações anterior ou seguinte partilham uma árvore.'
          },
          icon: 'lucide:route',
          to: '/reference/components/navigation'
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
              'llms.txt, page Markdown and four MCP tools over the same published content.',
            'de-DE':
              'llms.txt, Seiten-Markdown und vier MCP-Werkzeuge über denselben Inhalt.',
            'es-ES':
              'llms.txt, Markdown por página y cuatro herramientas MCP sobre el mismo contenido.',
            'fr-FR':
              'llms.txt, Markdown par page et quatre outils MCP sur le même contenu.',
            'pt-PT':
              'llms.txt, Markdown por página e quatro ferramentas MCP sobre o mesmo conteúdo.'
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
        'en-GB': 'The publishing system around your content',
        'de-DE': 'Das Veröffentlichungssystem rund um deine Inhalte',
        'es-ES': 'El sistema de publicación alrededor de tu contenido',
        'fr-FR': 'Le système de publication autour de votre contenu',
        'pt-PT': 'O sistema de publicação em torno do teu conteúdo'
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
              'Fuzzy and keyboard-first, with source, version, route and excerpts — no separate index to host.',
            'de-DE':
              'Unscharf und tastaturzuerst, mit Quelle, Version, Route und Auszügen — ohne separaten Index.',
            'es-ES':
              'Difusa y pensada para teclado, con fuente, versión, ruta y extractos — sin índice separado.',
            'fr-FR':
              'Floue et pensée clavier, avec source, version, route et extraits — sans index séparé.',
            'pt-PT':
              'Difusa e pensada para teclado, com fonte, versão, rota e excertos — sem índice separado.'
          }
        },
        {
          icon: 'lucide:history',
          title: {
            'en-GB': 'Recent pages, ready to return to',
            'de-DE': 'Zuletzt besucht, schnell wieder da',
            'es-ES': 'Páginas recientes, listas para volver',
            'fr-FR': 'Pages récentes, prêtes à retrouver',
            'pt-PT': 'Páginas recentes, prontas a retomar'
          },
          description: {
            'en-GB':
              'Search opens with the pages this reader visited last, kept locally and capped or disabled by config.',
            'de-DE':
              'Die Suche öffnet mit den zuletzt besuchten Seiten; lokal gespeichert und per Konfiguration begrenzt oder abschaltbar.',
            'es-ES':
              'La búsqueda abre con las últimas páginas visitadas, guardadas localmente y limitables o desactivables.',
            'fr-FR':
              'La recherche s’ouvre sur les dernières pages visitées, conservées localement et configurables.',
            'pt-PT':
              'A pesquisa abre com as últimas páginas visitadas, guardadas localmente e limitáveis ou desativáveis.'
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
              'Sitemap, robots, hreflang, schema.org and a rendered card per page, from the Nuxt SEO bundle.',
            'de-DE':
              'Sitemap, robots, hreflang, schema.org und eine gerenderte Karte je Seite, aus dem Nuxt-SEO-Bundle.',
            'es-ES':
              'Sitemap, robots, hreflang, schema.org y una tarjeta por página, del paquete Nuxt SEO.',
            'fr-FR':
              'Sitemap, robots, hreflang, schema.org et une carte rendue par page, issue du bundle Nuxt SEO.',
            'pt-PT':
              'Sitemap, robots, hreflang, schema.org e um cartão por página, do pacote Nuxt SEO.'
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
              'A CHANGELOG.md follows documentation versions, names each release’s contributors and can publish a feed.',
            'de-DE':
              'Eine CHANGELOG.md folgt den Dokumentationsversionen, nennt Contributors und kann einen Feed liefern.',
            'es-ES':
              'Un CHANGELOG.md sigue las versiones, nombra colaboradores y puede publicar un feed.',
            'fr-FR':
              'Un CHANGELOG.md suit les versions, nomme les contributeurs et peut publier un flux.',
            'pt-PT':
              'Um CHANGELOG.md segue as versões, nomeia contribuidores e pode publicar um feed.'
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
          icon: 'lucide:megaphone',
          title: {
            'en-GB': 'Announcements when needed',
            'de-DE': 'Ankündigungen, wenn nötig',
            'es-ES': 'Anuncios cuando hacen falta',
            'fr-FR': 'Des annonces quand il le faut',
            'pt-PT': 'Anúncios quando necessários'
          },
          description: {
            'en-GB':
              'Place, schedule and dismiss release or maintenance notices; nothing renders until one is configured.',
            'de-DE':
              'Release- oder Wartungshinweise platzieren, planen und schließen; ohne Konfiguration erscheint nichts.',
            'es-ES':
              'Ubica, programa y cierra avisos de versiones o mantenimiento; sin configuración no aparece nada.',
            'fr-FR':
              'Placez, planifiez et fermez les avis de version ou maintenance ; rien ne paraît sans configuration.',
            'pt-PT':
              'Posiciona, agenda e fecha avisos de versão ou manutenção; nada aparece sem configuração.'
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
              '⌘/Ctrl+K opens search, ? lists optional single-key bindings, and the skip link comes before both.',
            'de-DE':
              '⌘/Strg+K öffnet die Suche, ? listet optionale Einzeltasten, und der Sprunglink kommt vor beidem.',
            'es-ES':
              '⌘/Ctrl+K abre la búsqueda, ? lista atajos opcionales de una tecla y el enlace de salto va antes.',
            'fr-FR':
              '⌘/Ctrl+K ouvre la recherche, ? liste les touches simples optionnelles et le lien d’évitement précède.',
            'pt-PT':
              '⌘/Ctrl+K abre a pesquisa, ? lista teclas simples opcionais e a ligação de salto vem antes.'
          }
        },
        {
          icon: 'lucide:message-square-quote',
          title: {
            'en-GB': 'Feedback and analytics, provider-neutral',
            'de-DE': 'Feedback und Analytics, provider-neutral',
            'es-ES': 'Opiniones y analítica sin proveedor impuesto',
            'fr-FR': 'Retours et analytics sans fournisseur imposé',
            'pt-PT': 'Feedback e analytics sem provider imposto'
          },
          description: {
            'en-GB':
              'Send page feedback where you choose and hand reader events to an opt-in callback; duxt transmits nothing by default.',
            'de-DE':
              'Feedback geht an dein Ziel, Leserereignisse an ein optionales Callback; standardmäßig sendet duxt nichts.',
            'es-ES':
              'Envía feedback a tu destino y eventos a un callback opcional; duxt no transmite nada por defecto.',
            'fr-FR':
              'Envoyez les retours où vous voulez et les événements à un callback optionnel ; duxt ne transmet rien par défaut.',
            'pt-PT':
              'Envia feedback para o teu destino e eventos para um callback opcional; o duxt nada transmite por omissão.'
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
              'Last updated, the contributors and an edit link, read from git, not written by hand.',
            'de-DE':
              'Zuletzt geändert, die Mitwirkenden und ein Bearbeiten-Link, aus git gelesen, nicht getippt.',
            'es-ES':
              'Última actualización, los colaboradores y un enlace de edición: leídos de git, no escritos a mano.',
            'fr-FR':
              'Dernière modification, les contributeurs et un lien d’édition, lus dans git, pas saisis à la main.',
            'pt-PT':
              'Última atualização, os contribuidores e uma ligação de edição, lidos do git, não escritos à mão.'
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
              'Copy it as Markdown or open it in any configured assistant: the same content the site renders.',
            'de-DE':
              'Als Markdown kopieren oder in einem konfigurierten Assistenten öffnen: derselbe Inhalt wie auf der Seite.',
            'es-ES':
              'Cópiala como Markdown o ábrela en cualquier asistente configurado: el mismo contenido del sitio.',
            'fr-FR':
              'Copiez-la en Markdown ou ouvrez-la dans un assistant configuré : le même contenu que le site.',
            'pt-PT':
              'Copia-a como Markdown ou abre-a num assistente configurado: o mesmo conteúdo do site.'
          }
        },
        {
          icon: 'lucide:image',
          title: {
            'en-GB': 'Responsive images that still zoom',
            'de-DE': 'Responsive Bilder, die weiter zoomen',
            'es-ES': 'Imágenes responsivas que conservan el zoom',
            'fr-FR': 'Des images responsives qui zooment encore',
            'pt-PT': 'Imagens responsivas que continuam a ampliar'
          },
          description: {
            'en-GB':
              'Nuxt Image serves the right size with a visible zoom affordance; SVG and GIF pass through unchanged.',
            'de-DE':
              'Nuxt Image liefert die passende Größe mit sichtbarem Zoom; SVG und GIF bleiben unverändert.',
            'es-ES':
              'Nuxt Image sirve el tamaño correcto con zoom visible; SVG y GIF pasan sin cambios.',
            'fr-FR':
              'Nuxt Image sert la bonne taille avec un zoom visible ; SVG et GIF restent inchangés.',
            'pt-PT':
              'Nuxt Image serve o tamanho certo com zoom visível; SVG e GIF passam sem alterações.'
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
