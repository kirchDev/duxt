import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defineCollection, z } from '@nuxt/content';

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

/** Walk up to the repository root, so `docs/` resolves there and not in a subfolder. */
function repositoryRoot(): string {
  let dir = process.cwd();

  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;

    const parent = dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

const slugify = (value: string) =>
  value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');

const repoSlug = (source: DuxtSource) =>
  source.slug ??
  slugify(
    source.repo
      ?.split('/')
      .pop()
      ?.replace(/\.git$/, '') ?? 'docs'
  );

const repoUrl = (repo: string) =>
  repo.includes('://') ? repo : `https://github.com/${repo}`;

/**
 * Turn a compact source list into Content collections.
 *
 * Three versions across fourteen repositories is 42 collections written by
 * hand; this is the whole reason the shorthand exists. The URL each collection
 * serves follows the scheme
 *
 *     domain.tld/<repo?>/<version?>/<folder?>/…/<file>
 *
 * where each prefix is switched on by the SHAPE OF THE LIST, not per request:
 * a repository segment once there is more than one repository, a version
 * segment once there is more than one version. A single unversioned source
 * therefore serves `/guide/deploying`, and nothing in the URL betrays that
 * repositories or versions exist at all.
 *
 * Deciding at build time is also what keeps the scheme routable. If both
 * prefixes were optional per request, `/guide/…` could be a folder, a
 * repository or a version. Because the shape is fixed before the first
 * request, only one ambiguity is left — a docs folder named like a repository
 * or a version — and that is rejected here rather than resolved silently.
 */
/**
 * Frontmatter the theme reads beyond Content's own fields.
 *
 * Without a schema Content neither stores these nor types them, so `icon:` in
 * a page's frontmatter was silently dropped before the sidebar ever saw it.
 */
const pageSchema = z.object({
  /** Shown beside the entry in the sidebar, the section row and page cards. */
  icon: z.string().optional(),
  /** `landing` renders the page without the docs chrome. */
  layout: z.string().optional(),
  /** false hides the page from the navigation. */
  navigation: z.boolean().optional()
});

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

/**
 * Resolve the list once: names, prefixes and labels.
 *
 * Both halves of the layer read this — `duxtSources` to declare the
 * collections, `duxtSourceManifest` to tell the app which collection serves
 * the route it is on. Computing it twice is how the two would drift.
 */
function resolve(
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
 * Turn a compact source list into Content collections.
 *
 * Three versions across fourteen repositories is 42 collections written by
 * hand; this is the whole reason the shorthand exists. The URL each collection
 * serves follows the scheme
 *
 *     domain.tld/<repo?>/<version?>/<folder?>/…/<file>
 *
 * where each prefix is switched on by the SHAPE OF THE LIST, not per request:
 * a repository segment once there is more than one repository, a version
 * segment once there is more than one version. A single unversioned source
 * therefore serves `/guide/deploying`, and nothing in the URL betrays that
 * repositories or versions exist at all.
 *
 * Deciding at build time is also what keeps the scheme routable. If both
 * prefixes were optional per request, `/guide/…` could be a folder, a
 * repository or a version. Because the shape is fixed before the first
 * request, only one ambiguity is left — a docs folder named like a repository
 * or a version — and that is rejected here rather than resolved silently.
 */
export function duxtSources(
  sources: DuxtSource[],
  options: DuxtSourcesOptions = {}
) {
  const resolved = resolve(sources, options);
  const collections: Record<string, ReturnType<typeof defineCollection>> = {};

  const expanded = sources.flatMap((source) =>
    (source.refs?.length ? source.refs : [undefined]).map((ref) => ({
      source,
      ref
    }))
  );

  resolved.forEach((entry, index) => {
    const { source, ref } = expanded[index]!;

    collections[entry.collection] = defineCollection({
      type: 'page',
      schema: pageSchema,
      source: source.repo
        ? {
            repository: ref
              ? { url: repoUrl(source.repo), branch: ref }
              : repoUrl(source.repo),
            include: `${source.path ?? 'docs'}/**/*.md`,
            prefix: entry.prefix
          }
        : {
            include: '**/*.md',
            cwd: join(repositoryRoot(), source.path ?? 'docs'),
            prefix: entry.prefix
          }
    });
  });

  return collections;
}

/**
 * The same list, as data the app can read.
 *
 * Content loads `content.config.ts` in its own pass and the app never sees the
 * result, so the manifest is passed through `app.config.ts`. Both come from
 * one call site — see the Sources reference.
 */
export function duxtSourceManifest(
  sources: DuxtSource[],
  options: DuxtSourcesOptions = {}
): DuxtResolvedSource[] {
  return resolve(sources, options);
}
