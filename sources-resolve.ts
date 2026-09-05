/**
 * A documentation source: a folder, in this repository or another, at the
 * current checkout or at named refs.
 */
export interface DuxtSource {
  /** Folder holding the Markdown, relative to the repository root. */
  path?: string;
  /** `owner/name` or a full git URL. Omitted means this repository. */
  repo?: string;
  /**
   * Refs to publish as versions. Omitted means the current checkout.
   *
   * A bare string is a branch. A tag has to say so — git keeps the two in
   * separate namespaces, and asking for a tag under refs/heads fails the
   * build with "Could not find refs/heads/…".
   */
  refs?: DuxtRef[];
  /** Shown in the version switcher and used in the URL; defaults to the ref. */
  label?: string;
  /** Segment used in the URL for this repository; defaults to the repo name. */
  slug?: string;
  /**
   * Lifecycle of every version this entry publishes, unless a ref says
   * otherwise. See `DuxtSourceStatus`.
   */
  status?: DuxtSourceStatus;
  /**
   * The repository these pages live in, for a source read off disk.
   *
   * Only ever used to link back — "Edit this page", the contributor list.
   * Writing `repo` instead would be the obvious move and the wrong one: `repo`
   * is what makes Content DOWNLOAD a source, so naming this repository there
   * would have the build clone the checkout it is already standing in.
   */
  origin?: { repo: string; ref?: string };
}

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

/** A branch by name, or a tag stated as one. */
export type DuxtRef =
  | string
  | ({ branch: string } & DuxtRefOptions)
  | ({ tag: string } & DuxtRefOptions);

interface DuxtRefOptions {
  /** Shown in the switcher and used in the URL; defaults to the ref name. */
  label?: string;
  /** This one version's lifecycle, overriding the source's. */
  status?: DuxtSourceStatus;
}

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
  /** Force a repository segment even with a single repository. */
  showRepo?: boolean;
  /** Force a version segment even with a single version. */
  showVersion?: boolean;
  /** The ref served without a version prefix, by name. Defaults to the first. */
  defaultRef?: string;
}

/** One resolved source: which collection serves which URL prefix. */
export interface DuxtResolvedSource {
  /** Collection name Content will register. */
  collection: string;
  /** URL prefix it serves; '' for the root. */
  prefix: string;
  /** Repository segment, when the list has more than one repository. */
  repo?: string;
  /** Version label, when the list has more than one version. */
  version?: string;
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
  /** Where this version sits in its life; `current` unless stated. */
  status: DuxtSourceStatus;
}

export const slugify = (value: string) =>
  value.replace(/[^a-z0-9.]+/gi, '-').replace(/^[-.]+|[-.]+$/g, '');

/**
 * Collection names are not URL segments.
 *
 * Content requires a valid JavaScript identifier and silently DROPS a
 * collection whose name is not one — a warning in the build log, a version
 * missing from the site, and nothing connecting the two. So the name is
 * derived separately from the prefix: dashes and dots become underscores.
 */
const identifier = (value: string) =>
  value.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');

export const repoSlug = (source: DuxtSource) =>
  source.slug ??
  slugify(
    source.repo
      ?.split('/')
      .pop()
      ?.replace(/\.git$/, '') ?? 'docs'
  );

export const repoUrl = (repo: string) =>
  repo.includes('://') ? repo : `https://github.com/${repo}`;

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
export function resolveSources(
  sources: DuxtSource[],
  options: DuxtSourcesOptions = {}
): DuxtResolvedSource[] {
  const expanded = sources.flatMap((source) =>
    (source.refs?.length ? source.refs : [undefined]).map((ref) => ({
      source,
      ref
    }))
  );

  const repos = new Set(sources.map((source) => source.repo ?? ''));
  const refs = new Set(
    expanded
      .map((entry) => entry.ref)
      .filter(Boolean)
      .map((ref) => refName(ref!))
  );

  const withRepo = options.showRepo ?? repos.size > 1;
  const withVersion = options.showVersion ?? refs.size > 1;
  const defaultRef = options.defaultRef ?? [...refs][0];

  const resolved: DuxtResolvedSource[] = [];
  const taken = new Map<string, string>();

  for (const { source, ref } of expanded) {
    const name = ref ? refName(ref) : undefined;
    const label =
      (ref && typeof ref === 'object' ? ref.label : undefined) ?? source.label;
    const version = name ? slugify(label ?? name) : undefined;
    const isDefault = !name || name === defaultRef;

    const segments: string[] = [];
    if (withRepo) segments.push(repoSlug(source));
    if (withVersion && version && !isDefault) segments.push(version);

    const prefix = segments.length ? `/${segments.join('/')}` : '';
    const collection =
      ['docs', ...segments].map(identifier).join('_') || 'docs';

    const previous = taken.get(prefix);
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
      prefix,
      `${source.repo ?? 'this repository'}${name ? `@${name}` : ''}`
    );

    resolved.push({
      collection,
      prefix,
      repo: withRepo ? repoSlug(source) : undefined,
      version,
      isDefault,
      repository: source.repo ?? source.origin?.repo,
      repositoryUrl: source.repo
        ? repoUrl(source.repo)
        : source.origin?.repo
          ? repoUrl(source.origin.repo)
          : undefined,
      ref: name ?? source.origin?.ref,
      refKind: ref ? (refIsTag(ref) ? 'tag' : 'branch') : undefined,
      path: source.path ?? 'docs',
      status:
        (ref && typeof ref === 'object' ? ref.status : undefined) ??
        source.status ??
        'current'
    });
  }

  return resolved;
}

/**
 * The resolved list, as data the app can read.
 *
 * Kept out of `sources.ts` deliberately: that file imports `@nuxt/content` to
 * declare collections, and importing a module's entry point from client code is
 * rejected by the bundler. This file is plain logic, so `app.config.ts` can read
 * it and both halves still resolve the list exactly once.
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
