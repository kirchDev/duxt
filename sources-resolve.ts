import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * A documentation source: a folder, in this repository or another, at the
 * current checkout or at named refs.
 */
export interface DuxtSource {
  /** Folder holding the Markdown, relative to the repository root. */
  path?: string;
  /** `owner/name` or a full git URL. Omitted means this repository. */
  repo?: string;
  /** Branches or tags to publish as versions. Omitted means the checkout. */
  refs?: string[];
  /** Shown in the version switcher and used in the URL; defaults to the ref. */
  label?: string;
  /** Segment used in the URL for this repository; defaults to the repo name. */
  slug?: string;
}

export interface DuxtSourcesOptions {
  /** Force a repository segment even with a single repository. */
  showRepo?: boolean;
  /** Force a version segment even with a single version. */
  showVersion?: boolean;
  /** The ref served without a version prefix. Defaults to the first. */
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
}

/** Walk up to the repository root, so `docs/` resolves there and not in a subfolder. */
export function repositoryRoot(): string {
  let dir = process.cwd();

  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;

    const parent = dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

export const slugify = (value: string) =>
  value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');

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
    expanded.map((entry) => entry.ref).filter(Boolean) as string[]
  );

  const withRepo = options.showRepo ?? repos.size > 1;
  const withVersion = options.showVersion ?? refs.size > 1;
  const defaultRef = options.defaultRef ?? [...refs][0];

  const resolved: DuxtResolvedSource[] = [];
  const taken = new Map<string, string>();

  for (const { source, ref } of expanded) {
    const version = ref ? slugify(source.label ?? ref) : undefined;
    const isDefault = !ref || ref === defaultRef;

    const segments: string[] = [];
    if (withRepo) segments.push(repoSlug(source));
    if (withVersion && version && !isDefault) segments.push(version);

    const prefix = segments.length ? `/${segments.join('/')}` : '';
    const collection = ['docs', ...segments].map(slugify).join('_') || 'docs';

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
      `${source.repo ?? 'this repository'}${ref ? `@${ref}` : ''}`
    );

    resolved.push({
      collection,
      prefix,
      repo: withRepo ? repoSlug(source) : undefined,
      version,
      isDefault
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
