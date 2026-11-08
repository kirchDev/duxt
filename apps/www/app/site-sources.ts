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

// This repository's documentation at its release lines and the unreleased
// branch. `repo` deliberately makes Content fetch each ref: a versioned source
// cannot read several revisions from this checkout.
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
  // This repository tags each published package on its own — `duxt@v0.10.0`
  // beside `duxt-typesense@v0.10.0` — so `latest` and the release selection
  // have to say whose tags they mean. The three are one family on a linked
  // version line, and a companion-only release changes the documentation too
  // (its add-on page), so the canonical edition follows whichever of them
  // released last. A version they share is one release, read from the layer's
  // tag. The plain `v0.1.0`…`v0.5.0` tags cut before the monorepo still count.
  tagComponent: ['duxt', 'duxt-typesense', 'duxt-meilisearch'],
  releases: { select: 'minor' },
  refs: [{ branch: 'main' }, { tag: 'latest', default: true }],

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
 * Every edition of `DUXT_DOCS` is downloaded — released editions from their
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

export const siteSources = [
  ...DUXT_DOCS_EDITIONS,
  {
    path: 'apps/www/demo/wiki',
    slug: 'demo/wiki',
    name: { 'en-GB': 'Lumen field guide', de: 'Lumen-Inselführer' },
    pageType: 'article',
    history: false,
    locales: ['en-GB', { locale: 'de', path: 'apps/www/demo/wiki-de' }]
  },
  // The Demo overview is one document tree at four editions. The current
  // `v3.x` tree stays at `/demo`; the other editions keep the same overview
  // under their version prefix, just like the generated API does below.
  {
    path: 'apps/www/demo/docs',
    slug: 'demo',
    name: DEMO_NAME,
    version: 'main',
    status: 'upcoming',
    origin: { repo: 'kirchDev/duxt', ref: 'main' }
  },
  {
    path: 'apps/www/demo/docs',
    slug: 'demo',
    name: DEMO_NAME,
    version: 'v3.x',
    origin: { repo: 'kirchDev/duxt', ref: 'main' }
  },
  {
    path: 'apps/www/demo/docs',
    slug: 'demo',
    name: DEMO_NAME,
    version: 'v2.x',
    status: 'deprecated',
    origin: { repo: 'kirchDev/duxt', ref: 'main' }
  },
  {
    path: 'apps/www/demo/docs',
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
    path: 'apps/www/demo/docs',
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
        path: 'apps/www/demo/v3.yaml',
        label: 'OpenAPI',
        slug: 'openapi',
        icon: 'vscode-icons:file-type-swagger',
        versions: [
          {
            version: 'main',
            path: 'apps/www/demo/main.yaml',
            status: 'upcoming'
          },
          { version: 'v3.x', path: 'apps/www/demo/v3.yaml', default: true },
          {
            version: 'v2.x',
            path: 'apps/www/demo/v2.yaml',
            status: 'deprecated'
          },
          { version: 'v1.x', path: 'apps/www/demo/v1.yaml', status: 'eol' }
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
        path: 'apps/www/demo/collection',
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
        path: 'apps/www/demo/CHANGELOG.md',
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
        path: 'apps/www/demo/CHANGELOG.md',
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
] satisfies DuxtSourceInput[];
