import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defineCollection, z } from '@nuxt/content';
import { defineSitemapSchema } from '@nuxtjs/sitemap/content';
import type { DuxtSource, DuxtSourcesOptions } from './sources-resolve';
import { refName, repoUrl, resolveSources } from './sources-resolve';
import { resolveLatestRefs } from './sources-git';
export type {
  DuxtResolvedSource,
  DuxtSource,
  DuxtSourcesOptions
} from './sources-resolve';
export { duxtSourceManifest } from './sources-resolve';

/**
 * Walk up to the repository root, so `docs/` resolves there and not in a
 * subfolder. Node-only, and kept here rather than beside the resolver: that
 * file is read by app.config.ts and therefore bundled for the browser.
 */
function repositoryRoot(): string {
  let dir = process.cwd();

  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;

    const parent = dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

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
  navigation: z.boolean().optional(),
  /**
   * URLs this page used to be served at. The layer turns them into redirects,
   * because it is the only thing that knows which prefixes exist — the
   * alternative is the same rule written into every consumer's web server.
   */
  redirectFrom: z.array(z.string()).optional(),
  /**
   * The Markdown as it was written.
   *
   * Content only stores it when the schema asks for it — the key is what the
   * `collectionKeys.includes('rawbody')` check looks for. Two things need it:
   * the button that hands a page to a model, and `llms-full.txt`.
   */
  rawbody: z.string().optional(),
  /**
   * When this page is dated, for a feed. A changelog entry has one; a
   * reference page does not, and falls back to its last commit.
   */
  date: z.string().optional(),
  /** Filled in by `modules/git-meta.ts`; not written by hand. */
  lastUpdated: z.string().optional(),
  /** Filled in by `modules/git-meta.ts`; not written by hand. */
  contributors: z
    .array(
      z.object({
        name: z.string(),
        commits: z.number(),
        username: z.string().optional()
      })
    )
    .optional(),
  /**
   * What puts these pages in the sitemap at all.
   *
   * @nuxtjs/sitemap does not walk Content's collections uninvited — a
   * collection has to declare the field, and without it the sitemap lists the
   * site's routes and not one documentation page. Which versions are listed is
   * a separate decision, taken in `modules/config.ts` from the manifest.
   */
  //
  // `z` is handed in on purpose: @nuxtjs/sitemap bundles a zod of its own, and
  // Content reads a schema by inspecting zod's internals. A field built by the
  // foreign copy is not recognised, silently dropped from the collection, and
  // the sitemap module's own guard — "is `sitemap` among this collection's
  // fields?" — then answers no and nulls the field it just asked for. The
  // symptom is a sitemap with one entry on a site with sixty pages.
  sitemap: defineSitemapSchema({ z })
});

/**
 * A draft is a file, not a flag.
 *
 * `draft: true` in frontmatter is the obvious spelling and the one that cannot
 * be honoured: a collection's contents are declared before Content has read a
 * single file, and for a remote source before it has even been downloaded, so
 * nothing at declaration time knows what the frontmatter says. A file NAME is
 * known — and Content already strips `.draft` out of the URL, so
 * `deploying.draft.md` serves `/deploying` in the dev server and is simply
 * absent from the build.
 */
const DRAFTS = '**/*.draft.md';

/**
 * Reusable blocks, shared across every source.
 *
 * Content ships no include directive, and across several repositories that is a
 * gap with no workaround at all: an install note or a support matrix that has
 * to read the same in three projects is copied into three projects and drifts.
 * So `_partials/` in ANY source's docs folder feeds one collection, and
 * `:partial{name="install"}` in any page of any source renders it.
 *
 * Excluded from the page collections themselves, or every partial would also
 * be a page — in the sidebar, in the search, in llms.txt.
 */
const PARTIALS = '**/_partials/**';

/** The dev server shows drafts; a build does not. */
const includeDrafts = () => process.env.NODE_ENV !== 'production';

const excluded = () => (includeDrafts() ? [PARTIALS] : [PARTIALS, DRAFTS]);

/**
 * Turn a compact source list into Content collections.
 *
 * Three versions across fourteen repositories is 42 collections written by
 * hand; this is the whole reason the shorthand exists. Naming and prefixes come
 * from `resolveSources`, which the app reads too — see `duxtSourceManifest`.
 */
export function duxtSources(
  input: DuxtSource[],
  options: DuxtSourcesOptions = {}
) {
  // `latest` is a shorthand for a tag git has to be asked about, and both the
  // collections here and the manifest the module resolves must land on the
  // same one — so it is settled before either reads the list.
  const sources = resolveLatestRefs(input);
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
            exclude: excluded(),
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
            exclude: excluded(),
            include: '**/*.md',
            cwd: join(repositoryRoot(), source.path ?? 'docs'),
            prefix: entry.prefix
          }
    });
  });

  collections[PARTIALS_COLLECTION] = definePartials(sources);

  return collections;
}

/** The name every `:partial{name}` resolves against. */
export const PARTIALS_COLLECTION = 'duxt_partials';

/**
 * One collection over every source's `_partials/` folder.
 *
 * A page collection rather than a data one: partials are Markdown with MDC in
 * them, and `type: 'page'` is what gets them a parsed `body` a
 * `<ContentRenderer>` can draw. They are routable in principle, at
 * `/_partials/…`, and nothing routes there — the catch-all page queries the
 * source collection for its own prefix, so the URL 404s like any other.
 *
 * Given no prefix, so a partial is addressed by NAME and not by which
 * repository happens to hold it — which is the whole point of sharing them.
 * Two sources defining the same name is a collision the build reports rather
 * than resolves; see `modules/validate.ts`.
 */
function definePartials(sources: DuxtSource[]) {
  const seen = new Set<string>();

  const entries = sources
    .map((source) => {
      const folder = source.path ?? 'docs';

      // One entry per REPOSITORY, not per version: a partial is a block of
      // prose, and reading three versions of it into one collection would give
      // three blocks under one name.
      const key = `${source.repo ?? ''}:${folder}`;
      if (seen.has(key)) return undefined;
      seen.add(key);

      return source.repo
        ? {
            repository: repoUrl(source.repo),
            include: `${folder}/_partials/**/*.md`
          }
        : {
            include: '_partials/**/*.md',
            cwd: join(repositoryRoot(), folder)
          };
    })
    .filter(Boolean) as NonNullable<
    Parameters<typeof defineCollection>[0]['source']
  >[];

  // The SAME schema as the pages, not a smaller one. Content types a query by
  // the fields every collection has in common, so a partials collection with
  // its own thin schema narrows that union to the standard fields and every
  // `select('rawbody')` in the layer stops compiling. The cost is that partials
  // carry a `sitemap` field too, which is why `/_partials/**` is excluded in
  // `nuxt.config.ts`.
  return defineCollection({
    type: 'page',
    source: entries,
    schema: pageSchema
  });
}
