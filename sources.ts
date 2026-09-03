import { join } from 'node:path';
import { defineCollection, z } from '@nuxt/content';
import type { DuxtSource, DuxtSourcesOptions } from './sources-resolve';
import {
  refName,
  repositoryRoot,
  repoUrl,
  resolveSources
} from './sources-resolve';

export type {
  DuxtResolvedSource,
  DuxtSource,
  DuxtSourcesOptions
} from './sources-resolve';
export { duxtSourceManifest } from './sources-resolve';

/**
 * Frontmatter the theme reads beyond Content's own fields.
 *
 * Without a schema Content neither stores these nor types them, so `icon:` in a
 * page's frontmatter was silently dropped before the sidebar ever saw it.
 */
const pageSchema = z.object({
  /** Shown beside the entry in the sidebar, the section row and page cards. */
  icon: z.string().optional(),
  /** `landing` renders the page without the docs chrome. */
  layout: z.string().optional(),
  /** false hides the page from the navigation. */
  navigation: z.boolean().optional()
});

/**
 * Turn a compact source list into Content collections.
 *
 * Three versions across fourteen repositories is 42 collections written by
 * hand; this is the whole reason the shorthand exists. Naming and prefixes come
 * from `resolveSources`, which the app reads too — see `duxtSourceManifest`.
 */
export function duxtSources(
  sources: DuxtSource[],
  options: DuxtSourcesOptions = {}
) {
  const resolved = resolveSources(sources, options);
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
            // A tag lives outside refs/heads, so it has to be passed as a tag —
            // asking git for a branch by that name fails the build outright.
            repository: ref
              ? typeof ref === 'object' && 'tag' in ref
                ? { url: repoUrl(source.repo), tag: ref.tag }
                : { url: repoUrl(source.repo), branch: refName(ref) }
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
