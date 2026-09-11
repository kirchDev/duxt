declare global {
  /**
   * A configured string: a literal, an i18n key, or a per-locale record.
   *
   * Which one it is, is decided by whether a key is registered — see
   * `resolveDuxtText`. Every text field below accepts all three, so a
   * single-language site never sees the other two.
   */
  type DuxtText = string | Record<string, string>;

  /**
   * The package managers a command block can speak for.
   *
   * Declared here rather than in `app/utils/package-command.ts` because this is
   * the file that owns the public config surface, and one definition cannot
   * drift from the other. The translation table is checked against it: `dlx`
   * maps every member, so a fifth name added here fails to compile until it has
   * a spelling.
   */
  type DuxtPackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

  /**
   * The request the try-it client has built, as a sample generator receives it.
   *
   * Declared here rather than exported from `app/utils/openapi.ts` because it is
   * public now: `duxt.requestSamples` takes a consumer's own generator, and this
   * is the whole of what such a generator is given. `body` is the editor's text,
   * not parsed — a generator that wants it as data parses it itself, and gets to
   * decide what to do when it is not JSON.
   */
  interface DuxtOpenApiRequest {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
    /**
     * The component name of what a successful response returns, where the
     * document gave it one — `Widget`, or `Widget[]` for a list.
     *
     * This is what makes a TypeScript sample worth more than the JavaScript one
     * it would otherwise be character for character: `$fetch<Widget>(…)` is the
     * line somebody actually writes. Absent where the response schema is inline
     * rather than a `$ref`, which no generator can invent a name for — a sample
     * then simply has no type parameter.
     */
    responseType?: string;
  }

  /**
   * One code sample beside the try-it client.
   *
   * `generate` runs in the BROWSER, on every keystroke, because the sample has to
   * follow the request the reader is editing. It must therefore be synchronous,
   * pure, and cheap; it must not touch the network or the DOM.
   *
   * `language` is a Shiki id, and it is read at BUILD time: `modules/config.ts`
   * collects the ids of the configured samples and loads exactly those grammars
   * into the runtime highlighter, so a site pays for the languages it shows and
   * no others. A language Shiki does not know renders as plain text.
   *
   * `group` is the first level of the picker and `label` the second, so three
   * clients for one language cost one control rather than three tabs.
   */
  interface DuxtRequestSample {
    /** Stable across releases: it is also the value remembered in the cookie. */
    id: string;
    label: DuxtText;
    group: DuxtText;
    language: string;
    /**
     * The icon for this sample's GROUP, where the language does not answer for
     * it.
     *
     * Without one the picker draws `fileIcon(language)`, and the language is the
     * grammar rather than the tab: every JavaScript client asks for
     * `typescript`, so the tab reading "JavaScript" wore a TypeScript logo, and
     * `curl` wore a generic shell file. The first sample of a group that names
     * one wins, so a group needs it on at most one member — the shipped ones set
     * it on all of theirs, so dropping `fetch` from the list does not cost
     * JavaScript its mark.
     */
    icon?: string;
    generate: (request: DuxtOpenApiRequest) => string;
  }

  /**
   * The name of a page collection, as Content generated it for THIS site.
   *
   * Was the literal `'docs'` while the layer always shipped a collection by
   * that name. It no longer does — the collections are generated from the
   * site's own `duxt.sources`, so a site with two repositories has
   * `docs_duxt` and `docs_workflows` and no `docs` at all.
   *
   * A plain string, because the name is DATA: it comes from the resolved
   * manifest, which the build computed from a list only the consumer knows.
   * Content's own key union cannot be named here — it is generated per site —
   * so the few calls that need it derive it from Content's own signature
   * instead, with `DuxtCollectionArg`.
   */
  type DuxtCollectionName = string;

  /** The exact key type a Content query wants, taken from its own signature. */
  type DuxtCollectionArg = Parameters<typeof queryCollection>[0];

  /**
   * The same config after `useDuxtConfig()` has resolved it: every `DuxtText`
   * has collapsed to a string.
   *
   * Two types rather than one because they are genuinely two things — what a
   * consumer WRITES may be a key or a record, what a component READS is always
   * a word. Without the split every template would have to narrow a union it
   * can never actually receive.
   */
  type DuxtResolved<T> = [NonNullable<T>] extends [DuxtText]
    ? [Record<string, string>] extends [NonNullable<T>]
      ? undefined extends T
        ? string | undefined
        : string
      : T
    : // A FUNCTION IS AN OBJECT, and the mapped type below turns one into `{}` —
      // it has no own enumerable keys to map. Harmless while every field was
      // data; `DuxtRequestSample.generate` is a function a consumer writes, and
      // without this branch the config type says it cannot be called.
      T extends (...args: never[]) => unknown
      ? T
      : T extends readonly (infer U)[]
        ? DuxtResolved<U>[]
        : T extends object
          ? { [K in keyof T]: DuxtResolved<T[K]> }
          : T;

  type DuxtConfigResolved = DuxtResolved<DuxtConfig>;

  /** A navbar, footer or landing link. `children` turns a navbar entry into a dropdown. */
  /**
   * Where a version sits in its life — see `DuxtSourceStatus` in
   * `sources-resolve.ts` for what each one costs the page.
   */
  type DuxtSourceStatusInput =
    | 'upcoming'
    | 'current'
    | 'maintained'
    | 'deprecated'
    | 'eol';

  /** Lifecycle defaults a source may opt into for its different ref kinds. */
  type DuxtSourceStatusDefaultsInput = {
    /** The moving `latest` shorthand. */
    latest?: DuxtSourceStatusInput;
    /** An explicitly listed tag. */
    tag?: DuxtSourceStatusInput;
    /** A named branch, such as `main`. */
    branch?: DuxtSourceStatusInput;
  };

  /**
   * A branch by name, or a tag stated as one.
   *
   * `'latest'` is reserved: it resolves at build time to the newest semver tag
   * of that repository. A branch genuinely called latest needs `{ branch }`.
   */
  type DuxtRefInput =
    | string
    | {
        branch: string;
        label?: string;
        /** Serve this ref without a version prefix. */
        default?: boolean;
        status?: DuxtSourceStatusInput;
        locales?: DuxtSourceLocaleInput[];
      }
    | {
        tag: string;
        label?: string;
        /** Serve this ref without a version prefix. */
        default?: boolean;
        status?: DuxtSourceStatusInput;
        locales?: DuxtSourceLocaleInput[];
      };

  /**
   * One language of a source: the folder it lives in, or where else it lives.
   *
   * A string is a folder inside the source's `path`. The object form moves the
   * language wholesale — its own folder, repository or ref — which is how a
   * translation kept by other people at their own pace becomes a source rather
   * than a second website.
   */
  type DuxtSourceLocaleInput =
    | string
    | { locale: string; path?: string; repo?: string; ref?: DuxtRefInput };

  /**
   * A documentation source, as a consumer declares it in `app.config.ts`.
   *
   * Read at BUILD time — this is what the collections are generated from — so
   * a change here needs a rebuild, unlike the rest of this config.
   */
  interface DuxtSourceInput {
    /** Folder holding the Markdown, relative to the repository root. */
    path?: string;
    /**
     * Whether this source's Markdown is published as documentation pages.
     *
     * Set `false` for a source that only provides generated sections. It can
     * then share the default URL prefix of a versioned documentation source.
     */
    content?: boolean;
    /** Per-source conventions for files that are not documentation pages. */
    exclude?: { drafts?: string; partials?: string };
    /** A layer-owned Markdown dialect, such as tfplugindocs. */
    flavor?: 'tfplugindocs';
    /** `owner/name` or a full git URL. Omitted means this repository. */
    repo?: string;
    /** Refs to publish as versions. Omitted means the current checkout. */
    refs?: DuxtRefInput[];
    /**
     * Languages this source is available in, beyond the one in `path`.
     *
     * The default locale is the tree in `path` itself, so listing it changes
     * nothing and a site that adds this key does not move the pages it already
     * serves. A ref may override the list, because a translation is usually
     * kept for the current version and not for the two behind it.
     */
    locales?: DuxtSourceLocaleInput[];
    /**
     * The version THIS source is, where no ref names one.
     *
     * A version is normally a checkout — list `refs` and each becomes one. An API
     * is usually not versioned that way: `openapi/v1.yaml` sits beside
     * `openapi/v2.yaml` in one repository, and without this key the two are two
     * unrelated sections rather than two versions of one document.
     *
     * Named here, everything else follows the ref path exactly: the URL segment,
     * the switcher entry (scoped to the same artefact), the banner and the
     * canonical. A ref may name itself as the default; otherwise
     * `sourceOptions.defaultRef` names which is served without a prefix.
     *
     * Never beside `refs` — a source with both would have to be served at two
     * prefixes at once, and the resolver says so rather than picking one.
     */
    version?: string;
    /** Shown in the version switcher and used in the URL; defaults to the ref. */
    label?: DuxtText;
    /**
     * Segment used in the URL for this source; defaults to the repository name.
     *
     * A claim on a segment, not a spelling: a source that names one is served
     * under it whether or not the site has a second repository, which is what
     * lets one prefixed source sit beside documentation that stays at the root.
     */
    slug?: string;
    /** Lifecycle of every version this entry publishes, unless a ref says otherwise. */
    status?: DuxtSourceStatusInput;
    /** Lifecycle defaults by ref kind; an explicit ref status wins. */
    statusDefaults?: DuxtSourceStatusDefaultsInput;
    /**
     * The repository a source read off disk lives in, for links back to it.
     * Not `repo`, which is what makes Content download a source.
     */
    origin?: { repo: string; ref?: string };
    /**
     * Read this source's git history for "Last updated" and the contributors.
     * Off by default for a remote source: Content clones with `--depth 1`, and
     * unshallowing that is a download the consumer should choose.
     */
    history?: boolean;
    /**
     * Artefacts beside this source's Markdown, published as pages of the site.
     *
     * Off until declared. A list, because a monorepo declaring a changelog per
     * package is the normal case rather than the exotic one.
     */
    generated?: DuxtGeneratedSectionInput[];
  }

  /** Where a generated section's navbar entry goes. */
  type DuxtSectionPlacementInput = 'navigation' | 'sections' | false;

  /**
   * One artefact that is not Markdown, published as pages of the site.
   *
   * Not spelled `sections`: `duxt.sections` below is the second navbar row, and
   * two meanings on one public name is a collision the layer pays for later.
   */
  interface DuxtGeneratedSectionInput {
    /** The registry key of the type that parses it, e.g. `changelog`. */
    type: string;
    /**
     * The artefact, relative to the source's own root — the repository root
     * for a source read off disk, the root of the downloaded checkout for one
     * Content clones. A path only, never a URL.
     */
    path: string;
    /**
     * The navbar entry's label, and — slugified — its URL segment.
     *
     * A plain string, not a `DuxtText`: a translated text is not a stable URL,
     * the same rule a version's label follows.
     */
    label: string;
    /** URL segment for this section; defaults to the slugified label. */
    slug?: string;
    /**
     * The versions of THIS ARTEFACT, where the source's own refs do not name
     * them.
     *
     * A version is normally a checkout: list `refs` on the source and every
     * section it carries is published once per ref. An API is usually not kept
     * that way — `openapi/v1.yaml` beside `openapi/v2.yaml` in one repository,
     * versioned by FILE — and without this key the two are two unrelated
     * sections with two entries in the navbar.
     *
     * Declared here rather than as two sources: two sections are offered as
     * versions of one another only when they came from ONE declaration, and a
     * source always publishes a documentation tree, so a source per API version
     * would publish the prose twice.
     *
     * Never beside a source versioned by refs — both want the same segment of
     * the URL, and the build says so.
     *
     * ```ts
     * generated: [
     *   {
     *     type: 'openapi',
     *     label: 'API',
     *     versions: [
     *       { version: 'v2', path: 'openapi/v2.yaml' },
     *       { version: 'v1', path: 'openapi/v1.yaml', status: 'deprecated' }
     *     ]
     *   }
     * ]
     * ```
     */
    versions?: {
      /** Shown in the switcher and used in the URL. */
      version: string;
      /** The artefact this version reads; defaults to the declaration's. */
      path?: string;
      /** Per-locale artefacts for this version. */
      locales?: Record<string, string>;
      /** Lifecycle of this version. */
      status?: DuxtSourceStatusInput;
      /** Served without a version segment. Defaults to the first in the list. */
      default?: boolean;
    }[];
    /**
     * The knobs this TYPE offers, as this site turns them.
     *
     * Opaque to the layer: what a key means is the type's own business — the
     * `changelog` type reads `granularity` here (`split`, the default, or
     * `flat`), an API reference would read something else entirely. A type
     * names the option it does not recognise rather than ignoring it.
     */
    options?: Record<string, unknown>;
    /**
     * The artefact a LOCALE reads, where that locale ships one of its own.
     *
     * Only a `per-locale` type reads it. Keyed by the locale code the source
     * declares, with the language alone accepted too, so `pt` answers for
     * `pt-BR`. A locale absent from the map builds no collection at all, and
     * the existing fallback chain then serves it the default language's
     * section with the translation banner saying so.
     */
    locales?: Record<string, string>;
    /**
     * Where its navbar entry goes. The second navbar row unless stated, so a
     * declared section is findable without further config.
     */
    navigation?: DuxtSectionPlacementInput;
    /** Icon for that entry; falls back to the type's own. */
    icon?: string;
  }

  /** One page a section type's parser produced. */
  interface DuxtSectionPageInput {
    /** File name inside the section, extension included. */
    file: string;
    /** The whole file — frontmatter block and body. */
    body: string;
  }

  /**
   * A type in the section registry: what turns one artefact into pages.
   *
   * The whole extension surface, and public from day one — a consumer supplying
   * a parser and a layout inherits search, `llms.txt`, the feed, the sitemap and
   * the navigation, because what it produces is an ordinary collection.
   */
  interface DuxtSectionTypeInput {
    parse: (
      artefact: string,
      context: {
        label: string;
        prefix: string;
        /** The declaration's own `options`, empty where it named none. */
        options: Record<string, unknown>;
      }
    ) => DuxtSectionPageInput[];
    /** `global` is one history at a version-neutral URL; `per-version` is not. */
    versioning: 'global' | 'per-version';
    /**
     * `original` builds one collection and lets the translation banner say so;
     * `per-locale` builds one per language that declares an artefact of its own.
     */
    localisation: 'original' | 'per-locale';
    /**
     * The layout its pages render in. A name bound here is public surface.
     *
     * A function where the declaration's own options decide it — a changelog
     * split into a page per release draws chrome of its own, the same file
     * rendered whole is an ordinary docs page.
     */
    layout?:
      | string
      | ((options: Record<string, unknown>) => string | undefined);
    /** Icon for the navbar entry, when the declaration names none. */
    icon?: string;
  }

  interface DuxtSourceOptionsInput {
    /** Force a repository segment even with a single repository. */
    showRepo?: boolean;
    /** Force a version segment even with a single version. */
    showVersion?: boolean;
    /** The ref served without a version prefix, by name. Defaults to the first. */
    defaultRef?: string;
    /**
     * The locale whose pages are the tree in `path` itself, without a folder.
     * Defaults to the first locale any source declares.
     */
    defaultLocale?: string;
  }

  /** One entry of the resolved source manifest — see `duxtSourceManifest()`. */
  interface DuxtResolvedSource {
    collection: string;
    prefix: string;
    repo?: string;
    version?: string;
    isDefault: boolean;
    /** Where the pages came from — what "Edit this page" links back to. */
    repository?: string;
    repositoryUrl?: string;
    ref?: string;
    refKind?: 'branch' | 'tag';
    path: string;
    /** The locale this collection serves; absent on a site with no translations. */
    locale?: string;
    /** True for the locale served from `path` itself, without a folder. */
    isDefaultLocale: boolean;
    status: DuxtSourceStatusInput;
    history: boolean;
    /** The layer-owned Markdown dialect this collection is normalised from. */
    flavor?: 'tfplugindocs';
    /**
     * Present when this collection is a generated section rather than a docs
     * tree. `path` is then the artefact itself rather than a folder.
     */
    generated?: {
      type: string;
      label: string;
      slug: string;
      /**
       * Which declaration produced this entry — the identity, not an address.
       *
       * A section is one collection per version and per locale, so one declared
       * section reaches the manifest as several of these; the navbar puts one
       * link in the row for all of them, and this is how it knows which ones.
       * Compared for equality only, inside one manifest.
       */
      declaration: number;
      navigation: DuxtSectionPlacementInput;
      icon?: string;
      layout?: string;
      versioning: 'global' | 'per-version';
      localisation: 'original' | 'per-locale';
      remote: boolean;
      /** The declaration's own options, where it named any. */
      options?: Record<string, unknown>;
    };
  }

  interface DuxtLink {
    label: DuxtText;
    to?: string;
    icon?: string;
    description?: DuxtText;
    external?: boolean;
    children?: DuxtLink[];
  }

  interface DuxtSection extends DuxtLink {
    /**
     * The icon for pages in this section that carry none of their own.
     *
     * A page states its icon in frontmatter, and most do — the sidebar then
     * shows ten pages with ten symbols that actually distinguish them. Some
     * pages cannot: an ADR's frontmatter is fixed at `title`, `description`,
     * `status` and `date`, so a decision log renders eight rows with nothing
     * beside them while every other section has a column of icons.
     *
     * Set here, one symbol stands in for the whole section, which is what a set
     * of like records wants anyway. Falls back to `duxt.pageIcon`, and a page's
     * own icon always wins.
     */
    pageIcon?: string;
  }

  interface DuxtAction extends DuxtLink {
    variant?:
      | 'default'
      | 'secondary'
      | 'outline'
      | 'ghost'
      | 'link'
      | 'destructive';
  }

  interface DuxtFeature {
    title: DuxtText;
    description?: DuxtText;
    icon?: string;
    /** Makes the whole card a link — to the page that explains this feature. */
    to?: string;
    external?: boolean;
  }

  /**
   * The pill above the headline. A plain text is the short form; the object
   * adds an icon, a colour and a destination — "Latest release" pointing at the
   * releases page is the case it was built for.
   */
  interface DuxtBadge {
    label: DuxtText;
    icon?: string;
    variant?: 'default' | 'secondary' | 'outline' | 'success' | 'destructive';
    to?: string;
    external?: boolean;
  }

  interface DuxtLanding {
    badge?: DuxtText | DuxtBadge;
    headline?: DuxtText;
    description?: DuxtText;
    actions?: DuxtAction[];
    /**
     * The command under the hero buttons — how a reader installs the thing this
     * site documents, e.g. `pnpm add -D @acme/sdk`.
     *
     * Not a `DuxtText`: a shell command is the same in every language, and one
     * translated by mistake is one that does not run. The layer ships none, for
     * the same reason it ships no repository link — it does not know what your
     * project is called.
     */
    command?: string;
    /** A picture of the site itself, framed as a browser window. */
    preview?: DuxtPreview;
    /**
     * The claims the hero makes in numbers — "7 locales", "1 line of config".
     *
     * A row rather than a sentence, because a number read in a paragraph is a
     * number nobody remembers. Drawn under the hero's buttons; absent, the row
     * is not drawn at all.
     */
    stats?: DuxtStat[];
    /**
     * The window under the hero, in the shape a reader can drive: several pages
     * of this same site behind a tab bar, one frame, one page loaded at a time.
     *
     * `preview` is the single-page form of the same idea and stays what a site
     * with one thing to show writes. Where both are set the tabbed one wins,
     * because it is strictly the larger statement.
     */
    demo?: DuxtLandingDemo;
    /**
     * The bands between the window and the feature grid: one feature at a time,
     * its prose on one side and something running on the other.
     *
     * This is where a site shows rather than tells — a live page of its own API
     * reference, the config that produced it, a screenshot. The sides alternate
     * on their own, so a list written top to bottom needs no layout decisions.
     */
    showcase?: DuxtShowcase[];
    features?: DuxtFeature[];
    /**
     * The closing list: everything that is real but does not earn a band of its
     * own. An icon, a line, no link — a reader who wants one of these will find
     * it in the navigation.
     */
    highlights?: DuxtFeature[];
    /**
     * The visible heading over that list.
     *
     * A CONFIG FIELD rather than one of the layer's own strings, and the line
     * between the two is whether a reader sees it. `featuresTitle` is shipped
     * because it is `sr-only` — a name the document outline needs and nobody
     * reads. "And the rest" is prose on the page, and prose on the page belongs
     * to the site that wrote the list underneath it.
     *
     * Unset, the list draws no heading and its entries are paragraphs rather
     * than headings, so the outline gains nothing to explain.
     */
    highlightsTitle?: DuxtText;
  }

  /** One number in the hero's row, with the words that give it a meaning. */
  interface DuxtStat {
    /**
     * The number as it is printed — `'7'`, `'1 line'`, `'~0 KB'`. A string, not
     * a number: half of these are not quantities, and a site that has to format
     * `0` into `'zero config'` in the config is a site that will not.
     */
    value: string;
    label: DuxtText;
    icon?: string;
  }

  /**
   * The tabbed window: one live frame, several pages to point it at.
   *
   * Every tab is a page of THIS site, for the reason `DuxtPreview.to` gives —
   * a window framing somebody else's site is an advert.
   */
  interface DuxtLandingDemo {
    tabs: DuxtDemoTab[];
    /** Window height, any CSS length. Defaults to a responsive clamp. */
    height?: string;
  }

  interface DuxtDemoTab {
    label: DuxtText;
    to: string;
    icon?: string;
    /** The poster drawn while this page loads. Defaults to `docs`. */
    skeleton?: DuxtSkeletonVariant;
  }

  /**
   * Which shape the window draws while a page is on its way.
   *
   * Named per target rather than guessed from its path: the layer has no idea
   * that `/api` is an OpenAPI section or that `/llms.txt` is plain text — a
   * consumer may call them anything — and a poster whose layout is not the
   * layout that arrives reads as the frame having loaded the wrong page.
   */
  type DuxtSkeletonVariant = 'docs' | 'api' | 'text';

  /**
   * The words half of a band: eyebrow, heading, paragraph, list, link.
   *
   * A type of its own because a band may need TWO of them — a split client puts
   * its form in one row and its samples in the next, and each row wants its own
   * sentence about what the reader is looking at.
   */
  interface DuxtShowcaseProse {
    /** The eyebrow over the title — a two-word name for the area. */
    badge?: DuxtText;
    icon?: string;
    title: DuxtText;
    description?: DuxtText;
    /** The three things this feature actually does, as a checked list. */
    bullets?: DuxtShowcaseBullet[];
    /** The way into the page that explains it. */
    action?: DuxtAction;
  }

  /** One band: prose on one side, something running on the other. */
  interface DuxtShowcase extends DuxtShowcaseProse {
    /**
     * Put the demo on the LEFT, against the alternation.
     *
     * Unset, the bands alternate by their position in the list, which is what a
     * page of them wants. Set, a band overrides that — and every band after it
     * keeps alternating from wherever the list said, not from the override.
     */
    reverse?: boolean;
    /**
     * Give the demo the WHOLE width, with the prose above it rather than beside
     * it.
     *
     * For a demo that is not a picture of something but the thing itself: a
     * try-it client squeezed into half a band is the same mistake a framed page
     * makes one level down — a control built for a column of its own, put in a
     * column that is not one. `reverse` means nothing here; there are no sides.
     */
    full?: boolean;
    demo: DuxtDemo;
  }

  interface DuxtShowcaseBullet {
    label: DuxtText;
    icon?: string;
  }

  /**
   * What a band shows. Three kinds, and the discriminant is `type` rather than
   * which key happens to be set: a demo missing its one required field should
   * fail to typecheck, not fall through to another kind.
   */
  type DuxtDemo =
    | DuxtDemoFrame
    | DuxtDemoCode
    | DuxtDemoImage
    | DuxtDemoOperation;

  /**
   * The try-it client of one operation, rendered on its own.
   *
   * `frame` pointed at the same page shows the client inside a whole second
   * copy of the application — and below 80rem the panel sits under the entire
   * description, so a band-sized window opened the page and showed prose. This
   * renders the CONTROL, which is what the band is about: no frame, no poster,
   * no wait, and strictly less to download than the page around it.
   *
   * `to` is the operation page's own path; the operation is read from the page
   * Content already built for it, so nothing here parses OpenAPI a second time.
   */
  interface DuxtDemoOperation {
    type: 'operation';
    to: string;
    /**
     * `split` breaks the client into two rows — the form in one, the request
     * samples in the next — each with its own prose beside it, and the sides
     * alternating the way the bands themselves do. The shape a full-width band
     * wants. Defaults to the single card an operation page draws.
     */
    layout?: 'panel' | 'split';
    /**
     * The words beside the samples row.
     *
     * Only read when the client is split, because only then is there a second
     * row to write a sentence for. Without it the row draws the samples alone
     * and the space beside them stays empty.
     */
    samples?: DuxtShowcaseProse;
    /**
     * How tall the panel may get before it scrolls itself, any CSS length.
     *
     * A `max-height`, not a height: a GET with two parameters is a short panel
     * and padding it out to the height of a POST would be a box mostly empty.
     * Defaults to the same measure the windows beside it use.
     */
    height?: string;
  }

  /** A live page of this site, framed and operable — mounted on approach. */
  interface DuxtDemoFrame {
    type: 'frame';
    to: string;
    height?: string;
    /** `false` drops the browser chrome, leaving the page in a plain box. */
    chrome?: boolean;
    /** The poster drawn while the page loads. Defaults to `docs`. */
    skeleton?: DuxtSkeletonVariant;
  }

  /**
   * The config or the command behind the feature, highlighted.
   *
   * A list rather than one file, because the interesting answer is often two
   * files — what you write and what comes out. Several become tabs.
   */
  interface DuxtDemoCode {
    type: 'code';
    files: DuxtDemoFile[];
  }

  interface DuxtDemoFile {
    /** The tab's label and the block's header — a file name, or a command. */
    name?: string;
    /** A grammar the RUNTIME highlighter carries: bash, json, typescript. */
    language?: string;
    code: string;
  }

  /** A picture, for what cannot be framed — a devtools panel, an editor. */
  interface DuxtDemoImage {
    type: 'image';
    src: string;
    srcDark?: string;
    alt?: DuxtText;
  }

  /**
   * The window under the hero: a page of THIS site, embedded and operable —
   * the reader scrolls it, opens its navigation and switches its theme without
   * leaving the landing page.
   *
   * A still image is the POSTER, not the alternative: the frame is a second
   * copy of the application, and the picture covers the box until that copy has
   * booted. Where no picture is given the window draws the shape of a page
   * instead — see `DuxtPreviewSkeleton`, which needs no asset and is right in
   * both themes by construction. `live: false` is how a site says it would
   * rather not load itself twice at all.
   */
  interface DuxtPreview {
    /** The page to embed. Defaults to the first section. */
    to?: string;
    /** Window height, any CSS length. Defaults to a responsive clamp. */
    height?: string;
    /**
     * A screenshot shown until the live page is up — or instead of it, where
     * `live` is false. `srcDark` serves dark mode; without one, `src` serves
     * both, which on a dark page is a torch.
     */
    src?: string;
    srcDark?: string;
    /**
     * Embed the page at all. `false` shows only `src`, which is what a site
     * picks when a second copy of the application is a cost it will not pay.
     */
    live?: boolean;
    /** The image's alt text, and the frame's accessible name. */
    alt?: DuxtText;
  }

  interface DuxtConfig {
    title: DuxtText;
    /**
     * A wordmark shown in the header and footer instead of the icon-and-title
     * pair. Unset by default, and deliberately so: the layer ships no branding,
     * because a site extending duxt has its own.
     *
     * `srcDark` is swapped in by CSS, not by reading the colour mode — see
     * `DuxtBrand`. The image is drawn at a fixed height with the width left to
     * follow, so any aspect ratio works. `alt` falls back to `title`.
     */
    logo?: {
      src?: string;
      srcDark?: string;
      alt?: DuxtText;
    };
    /**
     * Which of the layer's locales this site serves. Omitted means all of them.
     *
     * Read at BUILD time — locales decide routes and hreflang, not just what a
     * component draws — so a change here needs a rebuild, unlike the rest of
     * this config. `i18n.defaultLocale` in nuxt.config picks which one is
     * served without a prefix.
     */
    locales?: string[];
    /**
     * Who publishes the site, for the `Organization` node schema.org readers
     * look for — a knowledge panel, a rich result, an AI summary naming a
     * source.
     *
     * Unset by default and unset in the layer: duxt does not know, and must not
     * guess, whose documentation it is rendering (ADR 0005). Without it the
     * site still describes itself as a `WebSite`; what it loses is the publisher
     * behind it.
     *
     * `logo` wants an ABSOLUTE URL or a path from the site root, and schema.org
     * wants it square-ish and at least 112px; `url` defaults to `site.url`.
     */
    organization?: {
      name?: DuxtText;
      url?: string;
      logo?: string;
    };
    /**
     * The icon for any page that carries none of its own, anywhere in the tree.
     *
     * A section's own `pageIcon` overrides it; a page's frontmatter overrides
     * both. Unset, a page without an icon simply shows none — which is the right
     * default, because an icon repeated down a whole sidebar carries no
     * information.
     */
    pageIcon?: string;
    /** Shown as a badge beside the title. */
    version?: string;
    /** Model hand-off entries, in display order. */
    copy?: { models?: { label: DuxtText; icon: string; url: string }[] };
    /** URL template for contributor avatars; `{username}` is replaced. */
    contributors?: { avatarUrl?: string };
    /** Generated-outline and active-heading controls. */
    toc?: { depth?: number; scrollOffset?: number };
    /** Search behaviour that depends on a site's corpus. */
    search?: {
      fuzzy?: {
        threshold?: number;
        minMatchCharLength?: number;
        limit?: number;
      };
      /** `0` disables the visible recent-pages list. */
      recentPages?: number;
    };
    /** Separate limits for derived examples and schema-tree rendering. */
    openapi?: { exampleDepth?: number; schemaDepth?: number };
    /** Replaces the default bindings, including any conflicting one. */
    shortcuts?: {
      action: 'search' | 'help' | 'previous' | 'next';
      key: string;
      meta?: boolean;
      keys: string[];
    }[];
    navigation?: DuxtLink[];
    /** The second navbar row: top-level parts of the documentation. */
    sections?: DuxtSection[];
    /** Fixed links under the table of contents. */
    aside?: {
      title?: DuxtText;
      links?: DuxtLink[];
    };
    links?: DuxtLink[];
    landing?: DuxtLanding;
    /**
     * Package managers offered by a command block, in display order.
     *
     * A closed set, not free text: `packageCommand` translates one written
     * command into each manager's own spelling, and it can only do that for the
     * four it has a table for. A fifth name used to be accepted and then
     * prefixed naively — `deno add -D pkg`, where deno wants `deno add npm:pkg`
     * — which is a configurable list with closed semantics, and an invitation.
     */
    packageManagers?: DuxtPackageManager[];
    /**
     * The code samples the try-it client offers, in display order.
     *
     * A string picks one the layer ships — `curl`, `fetch`, `ofetch`,
     * `use-fetch`, `axios`, `python-requests`, `python-httpx`, `python-urllib`,
     * `go`, `php-guzzle`, `php-laravel`, `php-curl` — and an object adds one of
     * the site's own, or replaces a shipped one by reusing its id.
     *
     * Unset means the default seven. A configured list REPLACES rather than
     * extends, like every other list in `duxtDefaults`: otherwise a site
     * documenting a PHP API could add its clients but never drop the ones it
     * does not want.
     */
    requestSamples?: (string | DuxtRequestSample)[];
    /**
     * Extra Shiki grammars for the runtime highlighter, beyond the ones the
     * configured samples already name.
     *
     * The one case that needs it is `x-codeSamples`: a sample written into the
     * OpenAPI document is coloured in the browser like a generated one, and its
     * language is not visible to the build — the document may live in a
     * repository that has not been cloned yet. A spec carrying Ruby samples
     * names `ruby` here, and pays for that one grammar.
     */
    sampleLanguages?: string[];
    /** Layout a consumer can switch off. */
    breadcrumb?: boolean;
    /**
     * The section `/rss.xml` publishes — a changelog, a release log, a blog.
     *
     * Off until it is set. A feed is a list of things that happened, and a
     * reference page being edited is not an event.
     */
    feed?: {
      /** Path prefix whose pages are the feed's items, e.g. `/changelog`. */
      path?: string;
      title?: DuxtText;
    };
    /**
     * The documentation sources. The only place they are declared: the
     * collections and the manifest below are both generated from this.
     */
    sources?: DuxtSourceInput[];
    /** How those sources become URL prefixes. */
    sourceOptions?: DuxtSourceOptionsInput;
    /**
     * Types a source's `generated` sections may name, beyond `changelog`.
     *
     * Read at BUILD time, like `sources` — a map rather than a registration
     * call, because the two loaders that need it cannot see one another's
     * globals. A consumer's entry wins, so a shipped type can be replaced.
     */
    sectionTypes?: Record<string, DuxtSectionTypeInput>;
    /**
     * GENERATED, not written. The duxt module resolves `sources` at build time
     * and writes the manifest here: which collection serves which prefix. It is
     * what the theme and the version switcher actually read.
     */
    resolvedSources?: DuxtResolvedSource[];
    /**
     * GENERATED, not written. The layer's own version and repository, read out
     * of its `package.json` by the duxt module — what the footer's "Powered by"
     * line says and links to.
     */
    layerVersion?: string;
    layerRepository?: string;
    /** `false` drops the "Powered by duxt" line from the footer. */
    poweredBy?: boolean;
    /** Overrides the versions derived from `sources`, when they need labels. */
    versions?: { label: DuxtText; to?: string; description?: DuxtText }[];
    footer?: {
      /** The consumer's own legal links — imprint, privacy policy. */
      legal?: DuxtLink[];
      copyright?: DuxtText;
    };
  }

  // Typing the config is what makes a consumer's override checkable — without
  // this it is inferred structurally from the layer's own literal, and every
  // optional key the layer happens not to use becomes a type error downstream.
}

declare module 'nuxt/schema' {
  interface AppConfigInput {
    duxt?: Partial<DuxtConfig>;
  }

  interface AppConfig {
    duxt: DuxtConfig;
  }
}

export {};
