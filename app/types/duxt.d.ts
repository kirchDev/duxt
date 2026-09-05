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
    | { branch: string; label?: string; status?: DuxtSourceStatusInput }
    | { tag: string; label?: string; status?: DuxtSourceStatusInput };

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
  }

  interface DuxtSourceOptionsInput {
    /** Force a repository segment even with a single repository. */
    showRepo?: boolean;
    /** Force a version segment even with a single version. */
    showVersion?: boolean;
    /** The ref served without a version prefix, by name. Defaults to the first. */
    defaultRef?: string;
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
    status: DuxtSourceStatusInput;
  }

  interface DuxtLink {
    label: DuxtText;
    to?: string;
    icon?: string;
    description?: DuxtText;
    external?: boolean;
    children?: DuxtLink[];
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
  }

  interface DuxtLanding {
    badge?: DuxtText;
    headline?: DuxtText;
    description?: DuxtText;
    actions?: DuxtAction[];
    features?: DuxtFeature[];
  }

  interface DuxtConfig {
    title: DuxtText;
    /**
     * Which of the layer's locales this site serves. Omitted means all of them.
     *
     * Read at BUILD time — locales decide routes and hreflang, not just what a
     * component draws — so a change here needs a rebuild, unlike the rest of
     * this config. `i18n.defaultLocale` in nuxt.config picks which one is
     * served without a prefix.
     */
    locales?: string[];
    /** Shown as a badge beside the title. */
    version?: string;
    navigation?: DuxtLink[];
    /** The second navbar row: top-level parts of the documentation. */
    sections?: DuxtLink[];
    /** Fixed links under the table of contents. */
    aside?: {
      title?: DuxtText;
      links?: DuxtLink[];
    };
    links?: DuxtLink[];
    landing?: DuxtLanding;
    /** Package managers offered by a command block, in display order. */
    packageManagers?: string[];
    /** Chrome a consumer can switch off. */
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
     * GENERATED, not written. The duxt module resolves `sources` at build time
     * and writes the manifest here: which collection serves which prefix. It is
     * what the theme and the version switcher actually read.
     */
    resolvedSources?: DuxtResolvedSource[];
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
