/**
 * The one extension point duxt opens: what the site holds, as search records.
 *
 * THE DECISION BEHIND THIS FILE, because the file is the smaller half of it.
 * The layer is extended by five things already — a CSS token, a shadowed
 * component, a slot, `app.config`'s `duxt` key and the `sectionTypes` registry
 * — and none of them reaches the build. The question was whether to open a
 * generic hook registry, a `duxt.plugins` API, or neither.
 *
 * NEITHER, and then one hook. A distributable duxt extension is a **Nuxt
 * layer**: `extends: ['@kirchdev/duxt', 'duxt-typesense']` already carries
 * components, `app.config` defaults, `content.config.ts` collections, server
 * routes, MCP tools and a module of its own, in one package with a version.
 * A plugin system would reimplement layer resolution inside a layer, and a
 * registry a plugin writes into at import time walks straight into the
 * two-loader wall that shaped `sectionTypes` — `content.config.ts` and the duxt
 * module are loaded by different loaders, so a mutable registry each wrote into
 * would be two registries (`sections-resolve.ts`). A Nuxt BUILD hook does not:
 * only the module half sees it, and that half has one loader.
 *
 * So there is exactly one hook, it is build-time, and it exists because three
 * things want the same data and none of them can get it today: an external
 * search index — Pagefind, Typesense, Meilisearch — needs every page of every
 * source, version and language as flat text, and the only way to that today is
 * a fork. Every other seam named as a candidate (the navigation tree, the
 * redirect map, `llms.txt`, the MCP tool list, the build checks) gets no hook
 * until a consumer exists that cannot be written without one. A hook is public
 * surface: renaming it is a breaking change, and an unused one can never be
 * removed.
 *
 * WHAT THE PAYLOAD DELIBERATELY IS NOT. No excerpt — a snippet is a decision
 * about a result list, and the provider owns the result list. No collection
 * name — that is duxt's own index bookkeeping, and a document keyed on it would
 * break the day a source gains a language. No display label — `label`, `name`
 * and the version caption are prose for a reader, translated per locale, and a
 * record is not read by a reader. What is left is the address and the words,
 * which is what every index actually stores.
 *
 * Split from `modules/search-records.ts` for the reason `validate-report.ts` is
 * split from `modules/validate.ts`: the module half imports `@nuxt/schema` and
 * Content's sqlite cache, and this half is data in, records out — so a test can
 * run it without a build.
 */
import { createHash } from 'node:crypto';
import type { CachedPage } from './content-cache';
import type { DuxtResolvedSource } from './sources-resolve';
import { duxtPageSearchable } from './app/utils/page-controls';

/**
 * One entry of an external search index, as duxt hands it over.
 *
 * PROVIDER-INDEPENDENT by construction: every field is a string duxt can state
 * about the site itself, and nothing here is shaped by what a particular
 * service wants stored. A provider layer maps these onto its own document —
 * Pagefind's custom records, a Typesense collection, a Meilisearch index — and
 * duxt never learns which.
 */
export interface DuxtSearchRecord {
  /**
   * The record's identity, and the primary key a provider stores it under.
   *
   * A HASH rather than the URL, and that is the one field here whose shape was
   * forced from outside. Meilisearch accepts a document id of `A-Za-z0-9_-`
   * only, so a URL — which carries `/`, `#` and, on a site whose headings are
   * not Latin, whatever the heading was written in — cannot be one. A hex
   * digest is valid everywhere, the same on every machine, and the same on
   * every build the record survives unchanged, which is what lets a provider
   * upsert rather than rebuild.
   *
   * Derived from `url`, which already carries the locale, the source, the
   * version and the anchor — so two records collide exactly when they address
   * the same place, which the source resolver has already made impossible.
   */
  id: string;
  /** Where a reader lands: the public path, locale segment and anchor included. */
  url: string;
  /** The heading this record covers, or the page's own title for the first. */
  title: string;
  /** The words under that heading, markup removed and whitespace collapsed. */
  content: string;
  /**
   * Which documentation source this came out of, as its URL segments minus the
   * version — `/` for the documentation served at the root, `/harbour` for a
   * second repository, `/harbour/api` for a generated section inside it.
   *
   * An IDENTITY, not an address, which is why the version is not in it: a facet
   * built on this survives a release, and `version` beside it is what narrows
   * to one.
   */
  source: string;
  /** The version label, where the source has versions at all. */
  version?: string;
  /**
   * The language the CONTENT is in — not the interface language a reader
   * happens to be browsing in.
   *
   * A site whose sources are untranslated has one language of content and gets
   * one set of records, even when it serves seven interface locales: the same
   * paragraph indexed seven times is one answer repeated, not seven answers.
   */
  locale: string;
}

/** What the site's routing does to a path, and which languages it serves. */
export interface DuxtSearchRecordOptions {
  /**
   * The locale codes the site actually ROUTES, after `duxt.locales` has
   * narrowed them — in the order the site declares them.
   *
   * NOT the same code space as a source's own locale, which is the trap this
   * whole file had to be corrected for: `@nuxtjs/i18n` routes `de-DE` while a
   * source is commonly written `locales: ['de']`, because one `de/` folder
   * serves every German region. Matching the two by equality indexed nothing
   * at all on a site with four translations, and said so nowhere. See
   * `routedLocale`.
   */
  locales: readonly string[];
  /** The language a source with no locale of its own is written in. */
  defaultLocale: string;
  /** `@nuxtjs/i18n`'s own strategy, which decides who gets a locale segment. */
  strategy?:
    | 'no_prefix'
    | 'prefix_except_default'
    | 'prefix'
    | 'prefix_and_default';
}

/** One heading's worth of a page, before it is given its coordinates. */
interface Section {
  /** The heading's anchor; absent for the page's own opening section. */
  anchor?: string;
  title: string;
  content: string;
}

const HEADING = /^h[1-6]$/;

/**
 * The words a minimal node shows, with its markup dropped.
 *
 * Content stores a parsed body as `[tag, props, ...children]` with text as
 * plain strings — the shape `generated-toc.ts` and `openapi.ts` already walk.
 *
 * CHILDREN ARE JOINED WITH NOTHING, exactly as Content's own search sections
 * do it, so `a **bold** word` reads as one sentence rather than as three. The
 * separator between BLOCKS is a space, added by the caller, which is the level
 * at which two paragraphs are two things.
 */
function text(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!Array.isArray(node)) return '';

  return node.slice(2).map(text).join('');
}

/** Runs of whitespace, including the newlines a Markdown body is full of. */
const normalise = (value: string) => value.replace(/\s+/g, ' ').trim();

/**
 * A page, split at its headings.
 *
 * Mirrors `generateSearchSections` in `@nuxt/content` deliberately: a site with
 * duxt's own reader-facing search AND an external index must not have the two
 * disagree about what a page says. The page's own record leads and carries its
 * description, exactly as Content's does.
 *
 * ONE DIVERGENCE, and it is the only one. duxt's reader-facing index is built
 * with `ignoredTags: ['table']`, because a table flattened into one string runs
 * its cells together and reads as gibberish in an EXCERPT. A record carries no
 * excerpt — the provider writes its own — so dropping the table would throw
 * away words a reader may well be searching for, and buy nothing.
 *
 * A HEADING WITH NO ANCHOR IS NOT A SECTION. MDC gives every heading an `id`,
 * so this is the pathological case rather than the normal one; addressing such
 * a section would mean a second record at the page's own URL, and therefore at
 * the page's own id. Its words fold into the section above it instead, where
 * they are still findable.
 */
export function duxtSearchSections(page: Record<string, unknown>): Section[] {
  const title = typeof page.title === 'string' ? page.title : '';
  const description =
    typeof page.description === 'string' ? page.description : '';

  const sections: Section[] = [{ title, content: normalise(description) }];

  const body = (page.body as { value?: unknown } | undefined)?.value;
  if (!Array.isArray(body)) return sections;

  for (const node of body) {
    if (!Array.isArray(node)) continue;

    const [tag, props] = node as [unknown, unknown];
    const anchor =
      props && typeof props === 'object' && !Array.isArray(props)
        ? (props as { id?: unknown }).id
        : undefined;

    if (
      typeof tag === 'string' &&
      HEADING.test(tag) &&
      typeof anchor === 'string' &&
      anchor
    ) {
      sections.push({ anchor, title: normalise(text(node)), content: '' });
      continue;
    }

    const current = sections.at(-1)!;
    const words = normalise(text(node));
    if (!words) continue;
    current.content = current.content ? `${current.content} ${words}` : words;
  }

  return sections;
}

/** The language half of a locale code: `de` for `de`, and `de` for `de-DE`. */
const language = (code: string) => code.split('-')[0]!;

/**
 * Which routed locale serves a source written in this language, if any.
 *
 * THE TWO CODE SPACES. A source says which language a folder holds — `de`,
 * because one `de/` tree serves every German region, which is exactly the rule
 * `localeChain` in `sources-resolve.ts` reads it by. `@nuxtjs/i18n` says which
 * URL a reader is on — `de-DE`. Comparing them for equality is the bug this
 * function exists to prevent, and it is a SILENT one: four translations
 * disappeared from the payload and the build said nothing, because "no records
 * for that collection" looks exactly like "no pages in that collection".
 *
 * Exact code first, then the first routed locale of the same language, in the
 * order the site declares them. Nothing where the site routes that language at
 * all — indexing it would offer a reader a URL that 404s.
 *
 * A CONSEQUENCE WORTH STATING: where a site routes two regions of one language
 * — `pt-PT` and `pt-BR` over a single `pt/` tree — the records address the
 * first, because the two URLs carry identical words and indexing both would
 * double the index to say the same thing twice. A provider that wants to send a
 * reader to their own region's spelling swaps the segment; duxt cannot, because
 * it does not know who is searching.
 */
function routedLocale(
  locale: string,
  options: DuxtSearchRecordOptions
): string | undefined {
  if (options.locales.includes(locale)) return locale;

  const base = language(locale);
  return options.locales.find((code) => language(code) === base);
}

/**
 * Does this language get a segment in front of the path?
 *
 * The same question `llms-pages.ts` answers at request time, asked here against
 * the build's own i18n options. `prefix_and_default` is the one that surprises:
 * the default language is served at BOTH spellings, and the prefixed one is the
 * canonical of the pair — so that is the one a search result should open.
 */
function localeSegment(
  routed: string,
  options: DuxtSearchRecordOptions
): string {
  const strategy = options.strategy ?? 'prefix_except_default';
  if (strategy === 'no_prefix') return '';
  if (strategy === 'prefix_except_default' && routed === options.defaultLocale)
    return '';
  return `/${routed}`;
}

/**
 * The source's own identity, as URL segments minus the version.
 *
 * Built from the two segments a source can claim rather than sliced out of
 * `prefix`: a generated section's prefix is `<base><version?>/<slug>`, so the
 * version sits in the MIDDLE of it and no suffix rule would survive a source
 * that gained versions.
 */
function identity(entry: DuxtResolvedSource): string {
  const segments = [entry.repo, entry.generated?.slug].filter(Boolean);
  return segments.length ? `/${segments.join('/')}` : '/';
}

/** Short enough to read in a log, long enough that a collision is not a risk. */
const identifier = (url: string) =>
  createHash('sha256').update(url).digest('hex').slice(0, 32);

/**
 * Every page of every source, version and language, as flat records.
 *
 * DETERMINISTIC ORDER, because the cache is read out of SQLite and SQLite
 * promises none: sources in manifest order, pages by path inside a source, and
 * sections in the order they are written. A provider diffing one build against
 * the last must see a payload that moved only where the site did.
 *
 * FROZEN, because "read-only" is a rule and a rule nobody can break is better
 * than a rule everybody is asked to keep. A consumer that sorts the array in
 * place, or rewrites a title on the way into its own index, would be changing
 * what every OTHER listener is handed — the second provider layer would inherit
 * the first one's edits and nothing would say so.
 */
export function duxtSearchRecords(
  sources: readonly DuxtResolvedSource[],
  pages: readonly CachedPage[],
  options: DuxtSearchRecordOptions
): readonly DuxtSearchRecord[] {
  const records: DuxtSearchRecord[] = [];

  const byCollection = new Map<string, CachedPage[]>();
  for (const page of pages) {
    const list = byCollection.get(page.collection);
    if (list) list.push(page);
    else byCollection.set(page.collection, [page]);
  }

  for (const entry of sources) {
    const locale = entry.locale ?? options.defaultLocale;
    const routed = routedLocale(locale, options);
    if (!routed) continue;

    const source = identity(entry);
    const segment = localeSegment(routed, options);
    const collected = byCollection.get(entry.collection);
    if (!collected) continue;

    for (const page of [...collected].sort((a, b) =>
      a.path.localeCompare(b.path)
    )) {
      // The one predicate four other discovery surfaces already share: a page
      // that wrote `search: false` is un-findable, not unpublished, and an
      // external index is exactly the surface it meant.
      if (!duxtPageSearchable(page.content)) continue;

      for (const section of duxtSearchSections(page.content)) {
        // Nothing to match on and nothing to show — an empty row in somebody
        // else's index, charged for and never returned.
        if (!section.title && !section.content) continue;

        const url = `${segment}${page.path}${
          section.anchor ? `#${section.anchor}` : ''
        }`;

        records.push(
          Object.freeze({
            id: identifier(url),
            url,
            title: section.title,
            content: section.content,
            source,
            ...(entry.version ? { version: entry.version } : {}),
            locale
          })
        );
      }
    }
  }

  return Object.freeze(records);
}

declare module '@nuxt/schema' {
  interface NuxtHooks {
    /**
     * Every page of the site, as flat search records — duxt's one build-time
     * extension point.
     *
     * Fires once per build, after Content has parsed every source, version,
     * locale and generated section, and before Nitro prerenders or bundles
     * anything — so a listener may still write into `public/`.
     *
     * READ-ONLY: the payload is frozen. Build or upload your own index from it;
     * do not rewrite a record, reorder the array, or otherwise change what the
     * next listener is handed.
     */
    'duxt:search:records': (
      records: readonly DuxtSearchRecord[]
    ) => void | Promise<void>;
  }
}
