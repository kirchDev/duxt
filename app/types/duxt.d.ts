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
        status?: DuxtSourceStatusInput;
        locales?: DuxtSourceLocaleInput[];
      }
    | {
        tag: string;
        label?: string;
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
    /** Shown in the version switcher and used in the URL; defaults to the ref. */
    label?: DuxtText;
    /** Segment used in the URL for this repository; defaults to the repo name. */
    slug?: string;
    /** Lifecycle of every version this entry publishes, unless a ref says otherwise. */
    status?: DuxtSourceStatusInput;
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
      context: { label: string; prefix: string }
    ) => DuxtSectionPageInput[];
    /** `global` is one history at a version-neutral URL; `per-version` is not. */
    versioning: 'global' | 'per-version';
    /** `original` builds one collection and lets the translation banner say so. */
    localisation: 'original' | 'per-locale';
    /** The layout its pages render in. A name bound here is public surface. */
    layout?: string;
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
    /**
     * Present when this collection is a generated section rather than a docs
     * tree. `path` is then the artefact itself rather than a folder.
     */
    generated?: {
      type: string;
      label: string;
      slug: string;
      navigation: DuxtSectionPlacementInput;
      icon?: string;
      layout?: string;
      versioning: 'global' | 'per-version';
      localisation: 'original' | 'per-locale';
      remote: boolean;
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
    features?: DuxtFeature[];
  }

  /**
   * The window under the hero: a page of THIS site, embedded and operable —
   * the reader scrolls it, opens its navigation and switches its theme without
   * leaving the landing page.
   *
   * A still image is the alternative, not the default: set `src` and the window
   * shows that instead, for a site that would rather not load itself twice.
   */
  interface DuxtPreview {
    /** The page to embed. Defaults to the first section. */
    to?: string;
    /** Window height, any CSS length. Defaults to a responsive clamp. */
    height?: string;
    /** A screenshot instead of the live page. `srcDark` serves dark mode. */
    src?: string;
    srcDark?: string;
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
    /** Package managers offered by a command block, in display order. */
    packageManagers?: string[];
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
