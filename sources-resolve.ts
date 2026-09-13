// Type-only, and therefore erased: the section resolver imports the functions
// below, so a value import here would be a cycle between the two files.
import type {
  DuxtGeneratedMeta,
  DuxtGeneratedSection
} from './sections-resolve';

/**
 * A documentation source: a folder, in this repository or another, at the
 * current checkout or at named refs.
 */
export interface DuxtSource {
  /** Folder holding the Markdown, relative to the repository root. */
  path?: string;
  /**
   * Whether this source's Markdown is published as documentation pages.
   *
   * A source can carry generated sections without publishing its own tree. That
   * lets a versioned documentation source and a generated artefact share their
   * default URL prefix without declaring two page collections for it.
   */
  content?: boolean;
  /** Per-source conventions for draft pages and reusable Markdown blocks. */
  exclude?: { drafts?: string; partials?: string };
  /**
   * The Markdown dialect this source was generated in.
   *
   * Dialects are layer-owned normalisers, not consumer-supplied transforms:
   * one compact marker keeps an upstream repository readable without making
   * its generator emit duxt-specific Markdown.
   */
  flavor?: DuxtSourceFlavor;
  /** `owner/name` or a full git URL. Omitted reads the local checkout. */
  repo?: string;
  /**
   * Refs to publish as versions. Requires an explicit source or locale repo.
   *
   * A bare string is a branch. A tag has to say so — git keeps the two in
   * separate namespaces, and asking for a tag under refs/heads fails the
   * build with "Could not find refs/heads/…".
   */
  refs?: DuxtRef[];
  /**
   * Discover release tags to publish as versions.
   *
   * Discovery is opt-in: a source still needs to say whether every release,
   * one release per minor, or one per major belongs in its public URLs. Explicit
   * `refs` stay available beside this object and override a discovered tag's
   * label, lifecycle, default and locales.
   */
  releases?: DuxtSourceReleases;
  /**
   * Languages this source is available in, beyond the one written in `path`.
   *
   * A string is the folder inside `path`: `'de-DE'` reads `docs/de-DE/`. An
   * object overrides where that language lives — its own folder, its own
   * repository, its own ref — which is what lets a translation be maintained by
   * other people, at another pace, in a repository of their own.
   *
   * The DEFAULT locale is the exception: it is the tree in `path` itself, with
   * no folder, so listing it changes nothing. That is what keeps this key
   * additive — a site that adds `locales` does not move the pages it already
   * serves. Which one is the default comes from `defaultLocale`. Omitting
   * `locales` serves that default language too.
   */
  locales?: DuxtSourceLocale[];
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
  label?: string;
  /**
   * What to CALL this source where the site names it to a reader.
   *
   * Display only — it never reaches a collection name, a URL prefix, a version
   * or the ranking, which is what separates it from `label` and `slug`. Those
   * two are addresses that happen to be readable; this is a name that is
   * nothing else, so it is free to be prose and free to be translated.
   *
   * The one thing no rule can derive. A segment is an abbreviation as often as
   * it is a word — `tf`, `sdk`, `api` — and a search result labelled with one
   * tells a reader which URL they are in rather than which project. Unset, the
   * ladder in `app/utils/search-display.ts` falls back to the segment and then
   * to the site's own name, so a site that sets nothing is still never shown
   * the bare `/` this key was added for.
   */
  name?: string | Record<string, string>;
  /**
   * Segment used in the URL for this source; defaults to the repository name.
   *
   * NAMING ONE IS A CLAIM ON A SEGMENT, and that is what makes it more than a
   * spelling: the automatic rule adds a segment to every source once the list
   * holds more than one repository, which cannot express "the documentation at
   * the root, one thing beside it". A source that names a slug gets its segment
   * whether or not the rule fires, and the sources that name none are untouched
   * — so a site adding a second source keeps every URL it already serves.
   */
  slug?: string;
  /**
   * Lifecycle of every version this entry publishes, unless a ref says
   * otherwise. See `DuxtSourceStatus`.
   */
  status?: DuxtSourceStatus;
  /**
   * Lifecycle defaults by ref kind. An explicit ref `status` wins; `status`
   * above remains the legacy all-refs fallback. A source opts in because only
   * its maintainer knows whether an older release is really deprecated.
   */
  statusDefaults?: DuxtSourceStatusDefaults;
  /**
   * The repository these pages live in, for a source read off disk.
   *
   * Only ever used to link back — "Edit this page", the contributor list.
   * Writing `repo` instead would be the obvious move and the wrong one: `repo`
   * is what makes Content DOWNLOAD a source, so naming this repository there
   * would have the build clone the checkout it is already standing in.
   */
  origin?: { repo: string; ref?: string };
  /**
   * Read this source's git history for "Last updated" and the contributors.
   *
   * Off by default for a REMOTE source, and the reason is a cost, not a
   * limitation: Content clones a repository with `--depth 1`, so the checkout
   * on disk holds exactly one commit and every file appears to have been
   * written by whoever cut the tip — wrong data rather than missing data.
   * Turning this on has the build unshallow that clone once, which downloads
   * the repository's whole history. Worth it for a docs repo, a real cost for
   * a monorepo, and the consumer is the one who knows which they have.
   *
   * A source read off disk is already a full checkout, so its history is read
   * whether or not this is set.
   */
  history?: boolean;
  /**
   * Artefacts beside this source's Markdown, published as pages of the site.
   *
   * Off until declared, the same rule as `feed.path`. A changelog, an OpenAPI
   * document, whatever a registered type can read — see `DuxtGeneratedSection`.
   */
  generated?: DuxtGeneratedSection[];
}

/** Source dialects the layer understands. */
export type DuxtSourceFlavor = 'tfplugindocs';

/**
 * Where a version sits in its life.
 *
 * Not the same question as "is this the default". A site can publish v2 as the
 * default while v1 is merely older and v0 is genuinely dead, and the reader has
 * to be told which of the three they are in — a badge in the switcher, a banner
 * on the page, and for `eol` no place in the sitemap at all. Driven by the
 * config rather than derived, because only the maintainer knows.
 *
 * `upcoming` is the one that is not about age. A version can be off the default
 * because it has not happened yet, and telling that reader to "upgrade" is
 * exactly backwards — what they need told is that what they are reading may
 * still change.
 */
export type DuxtSourceStatus =
  | 'upcoming'
  | 'current'
  | 'maintained'
  | 'deprecated'
  | 'eol';

/** Lifecycle defaults a source may opt into for its different ref kinds. */
export interface DuxtSourceStatusDefaults {
  /** The moving `latest` shorthand, before it becomes a concrete tag. */
  latest?: DuxtSourceStatus;
  /** A tag explicitly listed beside `latest`. */
  tag?: DuxtSourceStatus;
  /** A named branch, such as `main` or a preview branch. */
  branch?: DuxtSourceStatus;
}

/** A branch by name, or a tag stated as one. */
export type DuxtRef =
  | string
  | ({ branch: string } & DuxtRefOptions)
  | ({ tag: string } & DuxtRefOptions);

/** The release lines a source publishes when it discovers Git tags. */
export interface DuxtSourceReleases {
  /** Every release, or the newest release in each minor or major line. */
  select: 'all' | 'minor' | 'major';
  /** Include SemVer pre-releases; stable releases are the default. */
  prereleases?: boolean;
}

interface DuxtRefOptions {
  /** Shown in the switcher and used in the URL; defaults to the ref name. */
  label?: string;
  /**
   * Serve this ref without a version prefix, even when another source has its
   * own default. A site with several independently versioned trees needs this:
   * its docs can serve the newest release at `/` while an API stays at its own
   * current edition.
   */
  default?: boolean;
  /** This one version's lifecycle, overriding the source's. */
  status?: DuxtSourceStatus;
  /**
   * The languages THIS version is available in, overriding the source's.
   *
   * Resolved exactly as `status` is (`ref.locales ?? source.locales`), because
   * a translation is usually kept for the current version and not for the two
   * behind it — and a version whose translation nobody maintains is better
   * declared untranslated than served stale.
   */
  locales?: DuxtSourceLocale[];
}

/**
 * One language of a source: the folder it lives in, or where else it lives.
 *
 * The string form is the whole of it for a repository that translates in
 * place. The object form is what the big projects do instead — React keeps
 * `de.react.dev` as its own repository, Vue an entire `vuejs-translations`
 * org — because translators work at their own pace under their own review. A
 * layer that already sources across repositories and refs can offer that as a
 * source entry rather than as a second website.
 */
export type DuxtSourceLocale =
  | string
  | {
      /** The locale code, matching one the site serves. */
      locale: string;
      /** Folder holding this language, relative to the repository root. */
      path?: string;
      /** A repository of its own — `owner/name` or a git URL. */
      repo?: string;
      /** A ref of its own; requires an explicit source or locale repo. */
      ref?: DuxtRef;
    };

/** The code of a locale entry, whichever form it takes. */
export const localeCode = (locale: DuxtSourceLocale): string =>
  typeof locale === 'string' ? locale : locale.locale;

/**
 * The tag shorthand: the newest one, resolved at build time.
 *
 * Reserved as a ref NAME, so a branch genuinely called `latest` has to be
 * written `{ branch: 'latest' }`. Worth the collision: naming a tag by hand
 * means every release edits the consumer's source list, which is the one thing
 * a version model should not require.
 */
export const LATEST = 'latest';

/** The name of a ref, whichever kind it is. */
export const refName = (ref: DuxtRef): string =>
  typeof ref === 'string' ? ref : 'tag' in ref ? ref.tag : ref.branch;

/** Is this ref the `latest` shorthand rather than a name git knows? */
export const isLatestRef = (ref: DuxtRef): boolean =>
  refName(ref) === LATEST && (typeof ref === 'string' || !('branch' in ref));

/** A tag has to say so — git keeps the two namespaces apart. */
export const refIsTag = (ref: DuxtRef): boolean =>
  typeof ref !== 'string' && 'tag' in ref;

export interface DuxtSourcesOptions {
  /**
   * Force a repository segment even with a single repository.
   *
   * All or nothing, and deliberately: it answers "does this site have prefixes
   * at all". A single source that wants one uses `slug` instead.
   */
  showRepo?: boolean;
  /** Force a version segment even with a single version. */
  showVersion?: boolean;
  /** The ref served without a version prefix, by name. Defaults to the first. */
  defaultRef?: string;
  /**
   * The locale whose pages are the tree in `path` itself, with no folder.
   *
   * Defaults to the first entry of the first `locales` list, so a site that
   * never sets it still resolves the same way on both sides. It has to be
   * read from the config rather than from `i18n.defaultLocale`: the
   * collections are declared in `content.config.ts`, which has no access to
   * the Nuxt config, and the two halves must land on identical names.
   */
  defaultLocale?: string;
}

/** One resolved source: which collection serves which URL prefix. */
export interface DuxtResolvedSource {
  /** Collection name Content will register. */
  collection: string;
  /** URL prefix it serves; '' for the root. */
  prefix: string;
  /**
   * The source's own segment, where it has one — because the list holds more
   * than one repository, or because the source named a `slug`.
   *
   * Read as an IDENTITY as much as a segment: the version switcher and the
   * search grouping both scope themselves by it, so two sources with different
   * segments never offer each other's versions.
   */
  repo?: string;
  /** Version label, when the list has more than one version. */
  version?: string;
  /**
   * The source's display name, as the consumer wrote it — see `DuxtSource`.
   *
   * Carried through UNRESOLVED, because a locale record cannot be collapsed at
   * build time: the manifest is one object for every language the site serves,
   * and `useDuxtConfig` resolves it per request like every other text field.
   */
  name?: string | Record<string, string>;
  /** True for the version served without a prefix. */
  isDefault: boolean;
  /**
   * Where the pages came from, carried through so the theme can link back to
   * them. "Edit this page", "Last updated" and the contributor list are all
   * this plus a file name — none of them needs config of its own.
   */
  repository?: string;
  /** The browsable URL of that repository, when there is one. */
  repositoryUrl?: string;
  /** The ref the pages were read at, by name. */
  ref?: string;
  /** Which namespace that ref lives in. */
  refKind?: 'branch' | 'tag';
  /** Folder inside the repository holding the Markdown. */
  path: string;
  /**
   * The locale this collection serves, when the site has translations.
   *
   * Absent on a site with none — which keeps every existing collection name,
   * prefix and query exactly as it was.
   */
  locale?: string;
  /** True for the locale served from `path` itself, without a folder. */
  isDefaultLocale: boolean;
  /** Where this version sits in its life; `current` unless stated. */
  status: DuxtSourceStatus;
  /** Whether the build may read this source's git history. */
  history: boolean;
  /** The layer-owned Markdown dialect this collection is normalised from. */
  flavor?: DuxtSourceFlavor;
  /**
   * Present when this collection is a GENERATED SECTION rather than a docs
   * tree — see `resolveGeneratedSections`.
   *
   * The one question anything downstream asks: the version switcher to know it
   * has nothing to offer here, the layout slot to know which layout to set, and
   * "edit this page" to link at the artefact instead of at a file per page.
   */
  generated?: DuxtGeneratedMeta;
}

/**
 * A ref or a repository name, as a URL segment.
 *
 * The trim is a loop rather than `/^[-.]+|[-.]+$/`: an anchored `+` over a
 * character class backtracks, so a name that is nothing but separators — which
 * a branch name may be, and which comes from config this layer does not
 * own — costs time quadratic in its length. Scanning from each end costs its
 * length, once.
 */
export const slugify = (value: string) => {
  const collapsed = value.replace(/[^a-z0-9.]+/gi, '-');

  const isSeparator = (char: string | undefined) =>
    char === '-' || char === '.';

  let start = 0;
  let end = collapsed.length;
  while (start < end && isSeparator(collapsed[start])) start += 1;
  while (end > start && isSeparator(collapsed[end - 1])) end -= 1;

  return collapsed.slice(start, end);
};

/**
 * Collection names are not URL segments.
 *
 * Content requires a valid JavaScript identifier and silently DROPS a
 * collection whose name is not one — a warning in the build log, a version
 * missing from the site, and nothing connecting the two. So the name is
 * derived separately from the prefix: dashes and dots become underscores.
 */
/** The name a partial in the default language resolves against. */
export const PARTIALS_COLLECTION = 'duxt_partials';

/**
 * The partials collection one language reads.
 *
 * Named exactly as the page collections are: the default language keeps the
 * bare name a single-language site already had, and every other language
 * appends its code. So a site that declares no `locales` gets the one
 * collection it always got, under the name it always had.
 *
 * Takes the RESOLVED SOURCE rather than a code, because "the default language"
 * is a property of the manifest and not of the string `en`: a site whose
 * default is `de` still calls that collection `duxt_partials`. A bare string is
 * accepted for the build's own grouping, where the default is already
 * `undefined`.
 */
export function partialsCollection(
  locale?: Pick<DuxtResolvedSource, 'locale' | 'isDefaultLocale'> | string
): string {
  const code =
    typeof locale === 'string'
      ? locale
      : locale && !locale.isDefaultLocale
        ? locale.locale
        : undefined;

  return code
    ? `${PARTIALS_COLLECTION}_${identifier(code)}`
    : PARTIALS_COLLECTION;
}

/**
 * A collection name Content and TypeScript both accept.
 *
 * Exported because the partials collections are named from the same pieces the
 * page collections are, and a second spelling of this rule is a name that
 * drifts the first time a locale carries a character neither expected.
 */
export const identifier = (value: string) =>
  value.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');

export const repoSlug = (source: DuxtSource) =>
  source.slug ??
  slugify(
    source.repo
      ?.split('/')
      .pop()
      ?.replace(/\.git$/, '') ?? 'docs'
  );

/**
 * The URL a repository is cloned from.
 *
 * A value starting with `-` is REJECTED rather than passed on: it reaches `git`
 * as an argument, and `git ls-remote --upload-pack=<anything>` runs that
 * anything. The config it comes from is a file in the consumer's repository
 * rather than user input, but a source list may be computed — from an
 * environment variable, from a directory listing — and the cost of the check is
 * one comparison.
 */
export const repoUrl = (repo: string) => {
  if (repo.startsWith('-')) {
    throw new Error(
      `duxt: a repository may not start with "-" — got ${JSON.stringify(repo)}`
    );
  }

  return repo.includes('://') ? repo : `https://github.com/${repo}`;
};

/**
 * The locales one source-and-ref combination expands into.
 *
 * `[undefined]` — one entry, no locale — is the shape every site had before
 * this key existed, and the one every site without it still has. That is what
 * keeps the whole feature additive: no `locales`, no second collection, no
 * change to a single name.
 */
function localesOf(
  source: DuxtSource,
  ref: DuxtRef | undefined
): (DuxtSourceLocale | undefined)[] {
  const declared =
    (ref && typeof ref === 'object' ? ref.locales : undefined) ??
    source.locales;

  return declared?.length ? declared : [undefined];
}

/** The first locale any source declares — the default when none is configured. */
function firstLocale(sources: DuxtSource[]): string | undefined {
  for (const source of sources) {
    const declared =
      source.locales ??
      source.refs?.flatMap((ref) =>
        typeof ref === 'object' && ref.locales ? ref.locales : []
      );

    if (declared?.length) return localeCode(declared[0]!);
  }

  return undefined;
}

/**
 * Where one language of a source actually lives.
 *
 * The default locale is the tree in `path` itself; every other language is a
 * folder inside it unless the entry says otherwise. An object may move the
 * language wholesale — its own folder, repository and ref — which is the case
 * a translation maintained by other people needs.
 */
function localeEntry(
  source: DuxtSource,
  locale: DuxtSourceLocale | undefined,
  defaultLocale: string | undefined
): { path: string; repo?: string; ref?: DuxtRef } {
  const base = source.path ?? 'docs';
  if (!locale) return { path: base, repo: source.repo };

  const code = localeCode(locale);
  const override = typeof locale === 'string' ? undefined : locale;

  if (code === defaultLocale) {
    return {
      path: override?.path ?? base,
      repo: override?.repo ?? source.repo,
      ref: override?.ref
    };
  }

  return {
    // A folder INSIDE the source's own path, so one repository holds its
    // translations beside the original — and an override escapes that.
    path: override?.path ?? `${base}/${code}`,
    repo: override?.repo ?? source.repo,
    ref: override?.ref
  };
}

/**
 * Resolve the list once: names, prefixes and labels.
 *
 * Both halves of the layer read this — `duxtSources` to declare the
 * collections, `duxtSourceManifest` to tell the app which collection serves the
 * route it is on. Computing it twice is how the two would drift.
 *
 * Each prefix is switched on by the SHAPE OF THE LIST, not per request: a
 * repository segment once there is more than one repository, a version segment
 * once there is more than one version. A single unversioned source therefore
 * serves `/guide/deploying`, and nothing in the URL betrays that repositories
 * or versions exist at all — which is also what keeps the scheme routable,
 * since the shape is fixed before the first request.
 */
/** One expanded combination: a source, at a ref, in a language. */
export interface DuxtExpandedSource {
  source: DuxtSource;
  ref?: DuxtRef;
  locale?: DuxtSourceLocale;
  /** Where this combination's Markdown actually lives. */
  effective: { path: string; repo?: string; ref?: DuxtRef };
}

/**
 * The one expansion both halves of the layer read.
 *
 * `content.config.ts` declares the collections and the duxt module resolves
 * the manifest, and the two MUST agree entry for entry — the manifest tells
 * the theme which collection serves a route, and a name computed twice is a
 * name that drifts once. Exported for exactly that reason.
 */
export function expandSources(
  sources: DuxtSource[],
  options: DuxtSourcesOptions = {}
): DuxtExpandedSource[] {
  const defaultLocale = options.defaultLocale ?? firstLocale(sources);

  return sources.flatMap((source) =>
    (source.refs?.length ? source.refs : [undefined]).flatMap((ref) =>
      localesOf(source, ref).map((locale) => {
        const effective = localeEntry(source, locale, defaultLocale);
        if (!effective.repo && (effective.ref ?? ref)) {
          throw new Error(
            `duxt: source "${source.path ?? 'docs'}" reads the local checkout and cannot select a ref. ` +
              'Set an explicit repo to publish Git refs, or use version folders without refs.'
          );
        }
        return { source, ref, locale, effective };
      })
    )
  );
}

export function resolveSources(
  sources: DuxtSource[],
  options: DuxtSourcesOptions = {}
): DuxtResolvedSource[] {
  const defaultLocale = options.defaultLocale ?? firstLocale(sources);
  const expanded = expandSources(sources, options);

  const repos = new Set(sources.map((source) => source.repo ?? ''));

  /**
   * What NAMES a version — a ref, or a source that declares one.
   *
   * A ref is the usual answer and the only one this resolver had: a version was
   * a checkout, so a repository that does not tag its API had no versions at
   * all. That is the common shape for an API — `openapi/v1.yaml` beside
   * `openapi/v2.yaml` in one checkout, versioned by FILE — and it produced two
   * unrelated sections rather than two versions of one document.
   *
   * So a source may name its own version. Everything downstream is unchanged,
   * because everything downstream reads this name: the URL segment, the
   * switcher entry, the banner, the canonical.
   */
  const names = new Set(
    expanded
      .map((entry) => (entry.ref ? refName(entry.ref) : entry.source.version))
      .filter(Boolean) as string[]
  );

  const withRepo = options.showRepo ?? repos.size > 1;
  const withVersion = options.showVersion ?? names.size > 1;
  const defaultRef = options.defaultRef ?? [...names][0];

  /**
   * Does THIS source get a segment of its own?
   *
   * The list-wide rule above, or the source's own `slug` — see there for why a
   * slug is a claim rather than a spelling. Per source rather than per list,
   * which is the whole difference: a site whose docs sit at the root can hang
   * one prefixed source beside them without moving a single existing URL.
   */
  const segmented = (source: DuxtSource) => withRepo || Boolean(source.slug);

  const resolved: DuxtResolvedSource[] = [];
  const taken = new Map<string, string>();

  for (const { source, ref, locale, effective: entry } of expanded) {
    const effectiveRef = entry.ref ?? ref;

    // TWO TRUTHS ABOUT ONE SOURCE is not a state this resolver can be in: a
    // source that both lists refs and names a version would have to be served
    // at two prefixes at once, and the reader would meet the same document
    // twice in the switcher.
    if (effectiveRef && source.version) {
      throw new Error(
        `duxt: the source "${source.path ?? source.repo ?? ''}" names the ` +
          `version "${source.version}" and lists refs. A version comes from ` +
          'a ref or from this key, never from both.'
      );
    }

    const name = effectiveRef ? refName(effectiveRef) : source.version;
    const label =
      (ref && typeof ref === 'object' ? ref.label : undefined) ?? source.label;
    const code = locale ? localeCode(locale) : defaultLocale;
    const isDefaultLocale = !code || code === defaultLocale;
    const version = name ? slugify(label ?? name) : undefined;
    const isDefault =
      !name ||
      (ref && typeof ref === 'object' && Boolean(ref.default)) ||
      name === defaultRef;

    const segments: string[] = [];
    if (segmented(source)) segments.push(repoSlug(source));
    if (withVersion && version && !isDefault) segments.push(version);

    // THE LOCALE IS NOT PART OF THE PREFIX. @nuxtjs/i18n already puts it in
    // front of the path, so a collection carrying it too would spell it twice
    // in one URL. Original and translation therefore live under IDENTICAL
    // content paths in different collections — which leaves every path
    // comparison in the theme untouched and makes the fallback a second query
    // for the same path.
    const prefix = segments.length ? `/${segments.join('/')}` : '';
    const collection =
      ['docs', ...(isDefaultLocale ? [] : [code!]), ...segments]
        .map(identifier)
        .join('_') || 'docs';

    // Claimed per locale: two languages serving one prefix is not a collision,
    // it is the point.
    if (source.content !== false) {
      const claim = `${code ?? ''}|${prefix}`;
      const previous = taken.get(claim);
      if (previous) {
        // The one ambiguity the build-time decision leaves: a docs folder named
        // like a repository or a version. Rejected rather than resolved silently.
        throw new Error(
          `duxt: two sources resolve to the same URL prefix "${prefix || '/'}" ` +
            `(${previous} and ${source.repo ?? 'this repository'}${ref ? `@${ref}` : ''}). ` +
            'Give one of them a `slug` or a `label`.'
        );
      }
      taken.set(
        claim,
        `${source.repo ?? 'this repository'}${name ? `@${name}` : ''}`
      );
    }

    resolved.push({
      collection,
      prefix,
      repo: segmented(source) ? repoSlug(source) : undefined,
      version,
      name: source.name,
      isDefault,
      repository: entry.repo ?? source.origin?.repo,
      repositoryUrl: entry.repo
        ? repoUrl(entry.repo)
        : source.origin?.repo
          ? repoUrl(source.origin.repo)
          : undefined,
      ref: name ?? source.origin?.ref,
      refKind: effectiveRef
        ? refIsTag(effectiveRef)
          ? 'tag'
          : 'branch'
        : undefined,
      path: entry.path,
      locale: code,
      isDefaultLocale,
      status:
        (ref && typeof ref === 'object' ? ref.status : undefined) ??
        source.status ??
        (effectiveRef
          ? refIsTag(effectiveRef)
            ? source.statusDefaults?.tag
            : source.statusDefaults?.branch
          : undefined) ??
        'current',
      // A local source is a full checkout already; a remote one has to be
      // unshallowed, which is why it has to be asked for.
      history: entry.repo ? (source.history ?? false) : true,
      flavor: source.flavor
    });
  }

  assertCollectionIdentities(
    resolved.filter((_, index) => expanded[index]!.source.content !== false)
  );
  return resolved;
}

/**
 * The locales a page may be served from, best first.
 *
 * A translated Markdown file cannot be merged the way a locale FILE is: a page
 * is translated whole or not at all, so this is a chain of choices rather than
 * a deep merge. It follows the rule the layer already applies twice — the
 * `files` arrays in `nuxt.config.ts` and `resolveDuxtText` both let the
 * language carry the content and the region carry only its deviations:
 *
 *  1. the locale itself — `de-DE` reads `de-DE`;
 *  2. its base language — `de-DE` reads a `de` tree, which is what lets one
 *     `pt/` folder serve both `pt-PT` and `pt-BR`;
 *  3. a sibling of the same language — `pt-BR` reads `pt-PT` before it gives
 *     up on Portuguese and falls back to English;
 *  4. `fallbackLocale`, the value vue-i18n already carries for missing keys,
 *     so the interface and the pages agree on where they fall back to;
 *  5. the default locale, which is the untranslated original.
 *
 * `undefined` closes every chain: it is the collection of a site that declares
 * no locales at all, and the one a translation ultimately falls back to.
 */
export function localeChain(
  locale: string | undefined,
  available: (string | undefined)[],
  fallbackLocale?: string | string[]
): (string | undefined)[] {
  const has = (code: string | undefined) => available.includes(code);
  const chain: (string | undefined)[] = [];

  const add = (code: string | undefined) => {
    if (!chain.includes(code) && has(code)) chain.push(code);
  };

  if (locale) {
    add(locale);

    const base = locale.split('-')[0]!;
    add(base);

    // A sibling region of the same language, in the order the site declares
    // them: `pt-BR` takes `pt-PT` over English, every time.
    for (const code of available) {
      if (code && code !== locale && code.split('-')[0] === base) add(code);
    }
  }

  for (const code of [fallbackLocale ?? []].flat()) add(code);

  // The original. Always last, and always reachable — a page that exists in no
  // translation still has to render.
  if (!chain.includes(undefined)) chain.push(undefined);

  return chain;
}

/**
 * The resolved list, as data the app can read.
 *
 * Kept out of `sources.ts` deliberately: that file imports `@nuxt/content` to
 * declare collections, and importing a module's entry point from client code is
 * rejected by the bundler. This file is plain logic, so `app.config.ts` can read
 * it and both halves still resolve the list exactly once.
 *
 * THE DOCUMENTATION HALF ONLY. `duxtSources` walks this list index-for-index
 * against `expandSources`, so a generated section appended here would put the
 * two out of step; `duxtManifest` in `sections-resolve.ts` is the whole
 * manifest, and what everything serving a site reads.
 */
export function duxtSourceManifest(
  sources: DuxtSource[],
  options: DuxtSourcesOptions = {}
): DuxtResolvedSource[] {
  return resolveSources(sources, options);
}

/**
 * Order two version-ish tag names the way a release list is ordered.
 *
 * Semver order, NOT tag date: a patch cut for an old line after the newest
 * minor would otherwise become "latest" and move the whole site back a version.
 * A `v` prefix is optional, a pre-release sorts below the release it precedes,
 * and anything that is not a version at all sorts last so it can never win.
 */
export function compareVersionTags(a: string, b: string): number {
  const parse = (value: string) => {
    const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/.exec(value.trim());
    if (!match) return undefined;

    return {
      numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
      pre: match[4]
    };
  };

  const left = parse(a);
  const right = parse(b);

  if (!left || !right) return left ? -1 : right ? 1 : a.localeCompare(b);

  for (let index = 0; index < 3; index++) {
    const difference = right.numbers[index]! - left.numbers[index]!;
    if (difference) return difference;
  }

  // 1.0.0 outranks 1.0.0-rc.1; two pre-releases fall back to their own order.
  if (left.pre && !right.pre) return 1;
  if (right.pre && !left.pre) return -1;
  if (left.pre && right.pre) return right.pre.localeCompare(left.pre);

  return 0;
}

/** The newest tag in a list, by `compareVersionTags`. */
export function newestTag(tags: string[]): string | undefined {
  return [...tags].sort(compareVersionTags)[0];
}

/**
 * The URL segments a source's own folders must not use.
 *
 * With a prefix active, `/workflows` may be a repository, a version or a docs
 * folder — and the resolver settles which at build time, so the folder is the
 * one that loses. This names the collision rather than resolving it silently:
 * for each source, the segments that any OTHER source's prefix claims one level
 * below its own.
 */
export function reservedSegments(
  resolved: DuxtResolvedSource[]
): Map<string, Set<string>> {
  const reserved = new Map<string, Set<string>>();

  for (const source of resolved) {
    const claimed = new Set<string>();

    for (const other of resolved) {
      if (other === source || !other.prefix) continue;
      if (other.prefix === source.prefix) continue;

      const inside = source.prefix
        ? other.prefix.startsWith(`${source.prefix}/`) &&
          other.prefix.slice(source.prefix.length + 1)
        : other.prefix.slice(1);

      if (!inside) continue;

      const segment = inside.split('/')[0];
      if (segment) claimed.add(segment);
    }

    reserved.set(source.collection, claimed);
  }

  return reserved;
}

/**
 * Is the version being read older or newer than the one served by default?
 *
 * The banner needs this and cannot get it from `isDefault`, which only says
 * "not the current one" — and that covers both a release from two years ago and
 * a branch documenting next month's. Telling the second reader to upgrade is
 * exactly backwards.
 *
 * Only answered when BOTH names are versions. A branch is not comparable to a
 * tag: `main` sorts nowhere, and guessing would have said `v0.7.0` was newer
 * than `main` — which is how the banner came to offer a downgrade as an
 * upgrade. Where it cannot be answered, the config's own `status` is what
 * decides, because only the maintainer knows what a branch called `next` is.
 */
export function versionRelation(
  version: string | undefined,
  preferred: string | undefined
): 'older' | 'newer' | 'same' | 'unknown' {
  if (!version || !preferred) return 'unknown';
  if (version === preferred) return 'same';

  const isVersion = (value: string) =>
    /^v?\d+\.\d+\.\d+(?:-.+)?$/.test(value.trim());
  if (!isVersion(version) || !isVersion(preferred)) return 'unknown';

  const order = compareVersionTags(version, preferred);

  // `compareVersionTags` sorts newest FIRST, so a negative result means this
  // version leads the list — it is the newer of the two.
  return order === 0 ? 'same' : order < 0 ? 'newer' : 'older';
}

/**
 * The collections that serve one route, best first.
 *
 * Two decisions in one, because neither is complete without the other: WHICH
 * PREFIX claims the path, and WHICH LANGUAGE of that prefix the reader gets.
 * The locale is deliberately not part of a prefix — `@nuxtjs/i18n` already puts
 * it in front of the path — so original and translation are two collections
 * behind one identical prefix, and a lookup handed only the path cannot tell
 * them apart. Whichever sorted first won, which is the bug this exists to close.
 *
 * `path` is the DOCUMENTATION path, locale segment already stripped, and
 * `locale` is what was stripped off it. The rest is `localeChain`, so the theme
 * and every view that debugs it fall back through the same order.
 *
 * Never empty while `sources` is not: a route whose manifest has not arrived
 * still has to query something, and an empty chain 404s a page that exists.
 */
export function sourcesForRoute(
  path: string,
  locale: string | undefined,
  sources: DuxtResolvedSource[],
  fallbackLocale?: string | string[]
): DuxtResolvedSource[] {
  if (!sources.length) return [];

  // Read the prefix off the DEFAULT-language entries: every language of one
  // source shares the prefix, so the pool only has to be free of duplicates.
  const withDefaultLocale = sources.filter((source) => source.isDefaultLocale);
  const pool = withDefaultLocale.length ? withDefaultLocale : sources;

  const prefix =
    (
      [...pool]
        .sort((a, b) => b.prefix.length - a.prefix.length)
        .find(
          (source) => !source.prefix || isInsidePrefix(path, source.prefix)
        ) ??
      pool.find((source) => !source.prefix) ??
      // The landing page matches no prefix on a site whose every source has
      // one. It still needs a real collection for the navigation the header
      // draws, and a literal `docs` names one such a site does not have.
      pool[0]
    )?.prefix ?? '';

  const candidates = sources.filter((source) => source.prefix === prefix);

  // Deduplicated, because two links of the chain routinely land on ONE
  // collection: `fallbackLocale` is usually the default locale, and the chain
  // ends at the untranslated original regardless — so `en` and `undefined` both
  // resolve to the same entry, and the panel printed "falls back to docs → docs".
  const ordered = [
    ...new Set(
      localeChain(
        locale,
        candidates.map((source) => source.locale),
        fallbackLocale
      )
        .map((code) =>
          candidates.find((source) =>
            code === undefined ? source.isDefaultLocale : source.locale === code
          )
        )
        .filter(Boolean) as DuxtResolvedSource[]
    )
  ];

  if (ordered.length) return ordered;
  if (candidates.length) return candidates.slice(0, 1);

  return sources.slice(0, 1);
}

/**
 * Is `path` inside `prefix`? Segment-aware — `/workflows-old` is not inside
 * `/workflows`, though it starts with it.
 *
 * The same rule as `isInside` in `app/utils/version-paths.ts`, and duplicated
 * rather than imported: that file imports from THIS one, and a cycle between
 * them is what `app.config.ts` reading this module cannot survive.
 */
function isInsidePrefix(path: string, prefix: string): boolean {
  if (!prefix) return true;

  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Validate names before any collection map can overwrite a declaration. */
export function assertCollectionIdentities(
  entries: DuxtResolvedSource[]
): void {
  const taken = new Map<string, string>();
  const claim = (name: string, declaration: string) => {
    const previous = taken.get(name);
    if (previous !== undefined) {
      throw new Error(
        `duxt: collection "${name}" is claimed by both ${previous} and ${declaration}. ` +
          'Give one declaration a distinct `slug` or `label`.'
      );
    }
    taken.set(name, declaration);
  };

  for (const entry of entries) {
    const kind = entry.generated
      ? `generated section "${entry.generated.label}"`
      : 'documentation';
    claim(
      entry.collection,
      `${kind} "${entry.path}" at "${entry.prefix || '/'}"` +
        (entry.locale ? ` (locale "${entry.locale}")` : '')
    );
  }

  // Shared partials are one declaration per language, even across sources.
  const locales = new Set(
    entries
      .filter((entry) => !entry.generated)
      .map((entry) => (entry.isDefaultLocale ? undefined : entry.locale))
  );
  for (const locale of locales) {
    claim(partialsCollection(locale), `partials for "${locale ?? 'default'}"`);
  }
}
