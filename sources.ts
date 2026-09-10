import { join } from 'node:path';
import { defineCollection, z } from '@nuxt/content';
import { defineSitemapSchema } from '@nuxtjs/sitemap/content';
import type { DuxtSource, DuxtSourcesOptions } from './sources-resolve';
import {
  expandSources,
  refIsTag,
  refName,
  repoUrl,
  resolveSources
} from './sources-resolve';
import { resolveLatestRefs } from './sources-git';
// Re-exported under the name it has always had here: it moved out so a Nuxt
// module could reach it without this file's imports coming with it.
import { repositoryRoot } from './repository-root';
export { repositoryRoot };
export type {
  DuxtResolvedSource,
  DuxtSource,
  DuxtSourcesOptions
} from './sources-resolve';
export { duxtSourceManifest } from './sources-resolve';
// Named beside the resolver, not here: the app reads it to pick a partial's
// language, and this file imports `@nuxt/content` — which the bundler refuses
// to follow out of client code.
import { PARTIALS_COLLECTION, partialsCollection } from './sources-resolve';
export { PARTIALS_COLLECTION, partialsCollection };

/**
 * Frontmatter the theme reads beyond Content's own fields.
 *
 * Without a schema Content neither stores these nor types them, so `icon:` in a
 * page's frontmatter was silently dropped before the sidebar ever saw it.
 */
export const pageSchema = z.object({
  /** Shown beside the entry in the sidebar, the section row and page cards. */
  icon: z.string().optional(),
  /** `landing` renders the page without the docs chrome. */
  layout: z.string().optional(),
  /** The latest release of a generated changelog overview. */
  release: z.string().optional(),
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
  /**
   * The diff this page was cut from — a changelog release links the commits it
   * carries, taken off the heading release-please wrapped the version in.
   *
   * Beside `date` because it answers the other half of the same question, and
   * it is drawn in the same place: the provenance block under the contents,
   * where "Edit this page" already sends a reader at the repository.
   */
  compare: z.string().optional(),
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

  // The SAME expansion the manifest is built from, so entry `n` here and entry
  // `n` there are the same source, ref and language. See `expandSources`.
  const expanded = expandSources(sources, options);

  resolved.forEach((entry, index) => {
    const { source, ref, effective } = expanded[index]!;
    if (source.content === false) return;

    // A locale entry may carry a ref of its own — a translation repository
    // that tags on its own schedule.
    const usedRef = effective.ref ?? ref;

    /**
     * The translations living INSIDE this source's own folder.
     *
     * The default locale reads `docs/` with `**\/*.md`, and that glob happily
     * swallows `docs/de-DE/` — the original collection would carry every
     * translated page a second time, under a path beginning with the locale,
     * and the sidebar would show both. So each folder a sibling language
     * occupies is excluded from the language that contains it.
     */
    const nested = expanded
      .filter(
        (other) =>
          other.source === source &&
          other.effective.repo === effective.repo &&
          other.effective.path !== effective.path &&
          other.effective.path.startsWith(`${effective.path}/`)
      )
      .map(
        (other) => `${other.effective.path.slice(effective.path.length + 1)}/**`
      );

    collections[entry.collection] = defineCollection({
      type: 'page',
      schema: pageSchema,
      source: effective.repo
        ? {
            exclude: [
              ...excluded(),
              ...nested.map((glob) => `${effective.path}/${glob}`)
            ],
            // A tag lives outside refs/heads, so it has to be passed as a tag —
            // asking git for a branch by that name fails the build outright.
            repository: usedRef
              ? refIsTag(usedRef)
                ? { url: repoUrl(effective.repo), tag: refName(usedRef) }
                : { url: repoUrl(effective.repo), branch: refName(usedRef) }
              : repoUrl(effective.repo),
            include: `${effective.path}/**/*.md`,
            prefix: entry.prefix
          }
        : {
            exclude: [...excluded(), ...nested],
            include: '**/*.md',
            cwd: join(repositoryRoot(), effective.path),
            prefix: entry.prefix
          }
    });
  });

  // One partials collection per LANGUAGE, named the way the page collections
  // are — see `partialsCollection`.
  for (const [locale, entries] of partialFolders(resolved, expanded)) {
    collections[partialsCollection(locale)] = definePartials(entries);
  }

  return collections;
}

/** One folder list per language: where that language's `_partials/` live. */
function partialFolders(
  resolved: DuxtResolvedSource[],
  expanded: ReturnType<typeof expandSources>
): Map<string | undefined, { repo?: string; path: string }[]> {
  const byLocale = new Map<
    string | undefined,
    { repo?: string; path: string }[]
  >();
  const seen = new Set<string>();

  resolved.forEach((entry, index) => {
    const { source, effective } = expanded[index]!;
    if (source.content === false) return;
    const key = entry.isDefaultLocale ? undefined : entry.locale;

    // One entry per REPOSITORY AND FOLDER, not per version: a partial is a
    // block of prose, and reading three versions of it into one collection
    // would give three blocks under one name.
    const claim = `${key ?? ''}|${effective.repo ?? ''}:${effective.path}`;
    if (seen.has(claim)) return;
    seen.add(claim);

    const list = byLocale.get(key) ?? [];
    list.push({ repo: effective.repo, path: effective.path });
    byLocale.set(key, list);
  });

  return byLocale;
}

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
function definePartials(folders: { repo?: string; path: string }[]) {
  const entries = folders.map((folder) =>
    folder.repo
      ? {
          repository: repoUrl(folder.repo),
          include: `${folder.path}/_partials/**/*.md`
        }
      : {
          include: '_partials/**/*.md',
          cwd: join(repositoryRoot(), folder.path)
        }
  ) as NonNullable<Parameters<typeof defineCollection>[0]['source']>[];

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
