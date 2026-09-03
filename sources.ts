import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defineCollection } from '@nuxt/content';

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
export function duxtSources(
  sources: DuxtSource[],
  options: DuxtSourcesOptions = {}
) {
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

  const collections: Record<string, ReturnType<typeof defineCollection>> = {};
  const taken = new Map<string, string>();

  for (const { source, ref } of expanded) {
    const segments: string[] = [];
    if (withRepo) segments.push(repoSlug(source));
    if (withVersion && ref && ref !== defaultRef)
      segments.push(slugify(source.label ?? ref));

    const prefix = segments.length ? `/${segments.join('/')}` : '';
    const name = ['docs', ...segments].map(slugify).join('_') || 'docs';

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

    collections[name] = defineCollection({
      type: 'page',
      source: source.repo
        ? {
            repository: ref
              ? { url: repoUrl(source.repo), branch: ref }
              : repoUrl(source.repo),
            include: `${source.path ?? 'docs'}/**/*.md`,
            prefix
          }
        : {
            include: '**/*.md',
            cwd: join(repositoryRoot(), source.path ?? 'docs'),
            prefix
          }
    });
  }

  return collections;
}
