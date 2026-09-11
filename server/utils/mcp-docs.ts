import { queryCollection } from '@nuxt/content/nitro';
import type { H3Event } from 'h3';
import { splitLocalePath } from '../../app/utils/locale-path';
import { isInside } from '../../app/utils/version-paths';
import {
  localeChain,
  sourcesForRoute,
  type DuxtResolvedSource
} from '../../sources-resolve';
import { stripFrontmatter } from './duxt-server-text';

/**
 * What the four MCP tools know about this site's documentation.
 *
 * Lifted out of the tools because all three of them opened with the SAME
 * private `duxtCollections()` — a copy each, all three assuming one flat pile
 * of pages. A versioned, translated site is not that: `/app` and `/app/v1` are
 * different editions of one page, and asking every collection for a path
 * answers with whichever sorted first. The tools now share one model of the
 * manifest, and what an agent scopes by is a URL PREFIX — the thing it can
 * also paste into a browser, rather than a collection name that exists nowhere
 * else.
 */

/**
 * A site that declares no sources at all still has one collection.
 *
 * Content's own default is `docs`, and the three tools each open-coded that
 * fallback. Synthesised as a real entry instead, so the scope, the locale
 * chain and the page loader have one code path rather than two.
 */
const BARE: DuxtResolvedSource = {
  collection: 'docs',
  prefix: '',
  path: 'docs',
  isDefault: true,
  isDefaultLocale: true,
  status: 'current',
  history: false
};

/** The resolved manifest, or the single collection a bare site publishes. */
export function duxtSources(): DuxtResolvedSource[] {
  const { duxt } = useAppConfig() as { duxt?: Partial<DuxtConfig> };
  const sources = duxt?.resolvedSources ?? [];

  return sources.length ? sources : [BARE];
}

/** How this site turns a locale into a URL segment. */
export interface DuxtLocaleSetup {
  /** The codes the site serves, in declaration order. */
  codes: string[];
  /** The code served without a segment under `prefix_except_default`. */
  defaultLocale?: string;
  /** `@nuxtjs/i18n`'s routing strategy. */
  strategy: string;
  /** What a missing translation falls back to before the original. */
  fallbackLocale?: string | string[];
}

/**
 * Read that off the request.
 *
 * The same three reads `llms-pages` and the `.md` middleware each do inline —
 * runtime config for the locales and the strategy, the request context for the
 * fallback, which Nuxt i18n only merges in its own request hook.
 */
export function duxtLocaleSetup(event: H3Event): DuxtLocaleSetup {
  const i18n = (
    useRuntimeConfig(event).public as unknown as {
      i18n?: {
        locales?: (string | { code: string })[];
        defaultLocale?: string;
        strategy?: string;
      };
    }
  ).i18n;
  const codes = (i18n?.locales ?? []).map((locale) =>
    typeof locale === 'string' ? locale : locale.code
  );

  return {
    codes,
    defaultLocale: i18n?.defaultLocale ?? codes[0],
    strategy: i18n?.strategy ?? 'prefix_except_default',
    fallbackLocale: event.context.nuxtI18n?.vueI18nOptions?.fallbackLocale as
      | string
      | string[]
      | undefined
  };
}

/**
 * A documentation path as the site serves it, locale segment included.
 *
 * `prefix_except_default` is the interesting one: the default language keeps
 * the bare path, every other language gets a segment in front of it. Same rule
 * `llms-pages` applies when it enumerates the site for `llms.txt`.
 */
export function duxtPublicPath(
  path: string,
  locale: string | undefined,
  setup: DuxtLocaleSetup
): string {
  const prefixed =
    locale &&
    setup.strategy !== 'no_prefix' &&
    (setup.strategy !== 'prefix_except_default' ||
      locale !== setup.defaultLocale);

  if (!prefixed) return path || '/';

  return `/${locale}${path === '/' ? '' : path}`;
}

/** One language a version is published in, and the prefix that scopes it. */
export interface DuxtVersionLocale {
  /** The locale code, as the site declares it. */
  code: string;
  /** The public prefix for this version in this language. */
  prefix: string;
}

/** One edition of the documentation, as an agent chooses between them. */
export interface DuxtDocVersion {
  /** The public prefix that scopes it — what `list_pages` takes. */
  prefix: string;
  /** Shown in the switcher: the version label, or the source's segment. */
  label: string;
  /** Where this version sits in its life. */
  status: DuxtResolvedSource['status'];
  /** True for the edition served without a version prefix. */
  isDefault: boolean;
  /** The repository the pages were read from. */
  repository?: string;
  /** The ref they were read at, and which namespace it lives in. */
  ref?: string;
  refKind?: 'branch' | 'tag';
  /** The folder inside that repository. */
  path: string;
  /** Every language it is genuinely published in. */
  locales: DuxtVersionLocale[];
}

/**
 * Is this version a translation into `code`, or only reachable from it?
 *
 * The chain's head is the collection that answers a request in `code`. Where
 * that head is the code itself or its language, the version is translated;
 * where the chain fell through to a sibling region or the original, it is not
 * — `en-US` reading `en-GB` through the fallback is not a US translation, and
 * listing it as one tells an agent a page exists that nobody wrote.
 */
function translatedInto(
  code: string,
  available: (string | undefined)[],
  fallbackLocale: string | string[] | undefined
): boolean {
  const head = localeChain(code, available, fallbackLocale)[0];

  return head === code || head === code.split('-')[0];
}

/**
 * Every documentation version this site publishes.
 *
 * Grouped by PREFIX, because that is what identifies an edition: the languages
 * of one version share it, and two versions never do. Generated sections are
 * left out — a changelog or an API reference is a part of a version, not a
 * version of its own, and it is reached by scoping to the version that owns it.
 */
export function duxtDocVersions(
  sources: DuxtResolvedSource[],
  setup: DuxtLocaleSetup
): DuxtDocVersion[] {
  const editions = new Map<string, DuxtResolvedSource[]>();

  for (const source of sources) {
    if (source.generated) continue;

    const group = editions.get(source.prefix);
    if (group) group.push(source);
    else editions.set(source.prefix, [source]);
  }

  return [...editions.entries()]
    .map(([prefix, group]) => {
      const lead = group.find((source) => source.isDefaultLocale) ?? group[0]!;
      const available = group.map((source) => source.locale);

      return {
        prefix: duxtPublicPath(prefix, undefined, setup),
        label: lead.version ?? lead.repo ?? 'default',
        status: lead.status,
        isDefault: lead.isDefault,
        repository: lead.repository,
        ref: lead.ref,
        refKind: lead.refKind,
        path: lead.path,
        locales: setup.codes
          .filter((code) =>
            translatedInto(code, available, setup.fallbackLocale)
          )
          .map((code) => ({
            code,
            prefix: duxtPublicPath(prefix, code, setup)
          }))
      };
    })
    .sort(
      (a, b) =>
        Number(b.isDefault) - Number(a.isDefault) ||
        a.prefix.localeCompare(b.prefix)
    );
}

/** The collections one prefix inside a scope resolves to, in fallback order. */
interface DuxtScopeGroup {
  prefix: string;
  sources: DuxtResolvedSource[];
}

/** A version-and-language scope, resolved from a public URL prefix. */
export interface DuxtScope {
  /** The prefix as the site serves it, `/` for the whole site. */
  prefix: string;
  /** The locale segment stripped off it, where there was one. */
  locale?: string;
  /** The collections it covers, one entry per source prefix. */
  groups: DuxtScopeGroup[];
}

/** `/app/` and `app` both mean `/app`; `/` and nothing both mean the root. */
function normalise(prefix: string): string {
  const trimmed = prefix.trim();
  if (!trimmed || trimmed === '/') return '';

  const rooted = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  return rooted.replace(/\/+$/, '');
}

/**
 * The version prefix a source belongs to: the longest one enclosing it.
 *
 * This is what keeps a nested edition out of its parent's scope. The default
 * version sits at `/app` and the retired one at `/app/v1`, so `/app/v1` is
 * literally inside `/app` — and a scope that took everything inside itself
 * would answer "the current documentation" with two versions of every page.
 * Asking which version prefix is NEAREST puts each source under exactly one.
 */
function editionOf(source: DuxtResolvedSource, editions: string[]): string {
  const enclosing = editions.filter((prefix) =>
    isInside(source.prefix, prefix)
  );

  // A generated section declared above every documentation prefix belongs to
  // no edition; it answers for itself rather than joining someone else's.
  return enclosing.length
    ? enclosing.reduce((longest, prefix) =>
        prefix.length > longest.length ? prefix : longest
      )
    : source.prefix;
}

/**
 * Which collections a public prefix scopes to.
 *
 * `undefined` for a prefix nothing serves — an empty list would read as "this
 * version has no pages", and an agent that mistyped a prefix has to be told to
 * ask `list_versions` instead. Omitting the prefix is NOT the same as scoping
 * to `/`: no scope means every version, while `/` is the edition served at the
 * site root.
 */
export function duxtScope(
  prefix: string | undefined,
  sources: DuxtResolvedSource[],
  setup: DuxtLocaleSetup
): DuxtScope | undefined {
  const asked = prefix === undefined ? undefined : normalise(prefix);
  const { locale, path } =
    asked === undefined
      ? { locale: undefined, path: '' }
      : splitLocalePath(asked, setup.codes);
  const wanted = path === '/' ? '' : path;

  const editions = [
    ...new Set(
      sources
        .filter((source) => !source.generated)
        .map((source) => source.prefix)
    )
  ];

  // A version prefix takes the sources of that edition — its own pages and the
  // sections generated beside them. Anything else an agent might paste in (a
  // generated section addressed directly) falls back to what sits inside it.
  const edition = sources.filter(
    (source) => editionOf(source, editions) === wanted
  );
  const selected =
    asked === undefined
      ? sources
      : edition.length
        ? edition
        : sources.filter((source) => isInside(source.prefix, wanted));

  if (!selected.length) return undefined;

  const prefixes = [...new Set(selected.map((source) => source.prefix))].sort();

  return {
    prefix: duxtPublicPath(wanted, locale, setup),
    locale,
    groups: prefixes.map((group) => ({
      prefix: group,
      sources: sourcesForRoute(
        group || '/',
        locale ?? setup.defaultLocale,
        sources,
        setup.fallbackLocale
      )
    }))
  };
}

/** One page of a scope, at the URL the scope serves it from. */
export interface DuxtScopedPage {
  /** The public URL path, locale segment included. */
  path: string;
  /** The path the collection stores it under. */
  documentPath: string;
  title?: string;
  description?: string;
  rawbody?: string;
  /**
   * `false` when the page opted out of search.
   *
   * Carried on every scoped page and applied by `search_docs` alone, because
   * the decided rule is that `search: false` makes a page un-findable rather
   * than unpublished. `list_pages` still enumerates it — that listing is the
   * tree, which is the thing `navigation: false` governs — and `read_page`
   * still answers for it at its unchanged URL.
   */
  search?: boolean;
  /** The source that answered — which language the text is actually in. */
  source: DuxtResolvedSource;
}

/**
 * Every page in a scope, translations resolved.
 *
 * One pass per collection rather than one query per page: the chain is short
 * and the first collection holding a path wins, which is the same fallback the
 * rendered page takes. `rawbody` is only asked for when the caller needs it —
 * a table of contents that loads every body is the cost `llms.txt` already had
 * to have taken out of it.
 */
export async function duxtScopedPages(
  event: H3Event,
  scope: DuxtScope,
  setup: DuxtLocaleSetup,
  withBody = false
): Promise<DuxtScopedPage[]> {
  const fields = withBody
    ? (['path', 'title', 'description', 'rawbody', 'search'] as const)
    : (['path', 'title', 'description', 'search'] as const);
  const found = new Map<string, DuxtScopedPage>();

  for (const group of scope.groups) {
    for (const source of group.sources) {
      const pages = (await queryCollection(
        event,
        source.collection as Parameters<typeof queryCollection>[1]
      )
        .select(...fields)
        .all()) as unknown as {
        path?: string;
        title?: string;
        description?: string;
        rawbody?: string;
        search?: boolean;
      }[];

      for (const page of pages) {
        const documentPath = page.path;
        if (!documentPath || found.has(documentPath)) continue;

        found.set(documentPath, {
          ...page,
          documentPath,
          path: duxtPublicPath(documentPath, scope.locale, setup),
          source
        });
      }
    }
  }

  return [...found.values()].sort((a, b) => a.path.localeCompare(b.path));
}

/** How many results a listing returns when the caller does not say. */
export const DUXT_PAGE_SIZE = 20;
/** The ceiling, so one call cannot return the whole site. */
export const DUXT_PAGE_MAX = 100;

/** A bounded slice of a listing, and where to resume it. */
export interface DuxtCursorPage<T> {
  items: T[];
  nextCursor?: string;
}

/**
 * Page a listing by its LAST PATH rather than by an offset.
 *
 * An offset silently skips or repeats a page whenever the documentation
 * changes between two calls, and an agent has no way to notice. A path is
 * stable under the same sort, needs no server-side state, and is readable in a
 * transcript — so it stays the path itself rather than an encoded blob, which
 * also keeps it portable to a runtime without `Buffer`.
 */
export function duxtCursorPage<T extends { path: string }>(
  items: T[],
  limit: number,
  cursor?: string
): DuxtCursorPage<T> {
  const size = Math.min(
    DUXT_PAGE_MAX,
    Math.max(1, Math.trunc(limit || DUXT_PAGE_SIZE))
  );
  const after = cursor
    ? items.filter((item) => item.path.localeCompare(cursor) > 0)
    : items;
  const page = after.slice(0, size);

  return {
    items: page,
    nextCursor: after.length > page.length ? page.at(-1)?.path : undefined
  };
}

/** A cursor this module could have issued — anything else is a mistake. */
export const duxtValidCursor = (cursor: string) => cursor.startsWith('/');

/**
 * A bounded window of the authored Markdown around the first match.
 *
 * Plain text, never the rendered body: a model asked to judge whether a page
 * is the right one wants the sentence the term sits in, and an AST of MDC
 * nodes is neither shorter nor clearer than the page itself. Whitespace is
 * collapsed so a code fence or a table does not spend the whole window on
 * indentation.
 */
export function duxtExcerpt(
  body: string | undefined,
  query: string,
  radius = 90
): string | undefined {
  const text = stripFrontmatter(body ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return undefined;

  const at = text.toLowerCase().indexOf(query.toLowerCase());
  // A match in the title or the description only: the opening lines are the
  // best answer to "what is this page", which is the question being asked.
  const start = at < 0 ? 0 : Math.max(0, at - radius);
  const end =
    at < 0
      ? Math.min(text.length, radius * 2)
      : Math.min(text.length, at + query.length + radius);

  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${
    end < text.length ? '…' : ''
  }`;
}

/**
 * A YAML block duxt writes, over the Markdown the author wrote.
 *
 * Every value is quoted rather than quoted-when-necessary: a version label, a
 * description or a repository name may carry a colon, and an unquoted value
 * with one ends the mapping there — the exact silent failure
 * `tests/frontmatter-yaml.test.ts` exists to catch in this repository's own
 * pages. Undefined keys are dropped; a key present with no value says
 * something the manifest never said.
 */
export function duxtFrontmatter(
  fields: Record<string, string | boolean | undefined>
): string {
  const lines = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) =>
      typeof value === 'boolean'
        ? `${key}: ${value}`
        : `${key}: "${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
    );

  return `---\n${lines.join('\n')}\n---`;
}

/** The body an agent reads: the author's text, without the author's YAML. */
export const duxtAuthoredMarkdown = (body: string | undefined) =>
  stripFrontmatter(body ?? '').trim();

/** One line of a listing, the shape every tool prints a page in. */
export const duxtPageLine = (page: {
  path: string;
  title?: string;
  description?: string;
}) =>
  `- ${page.path} — ${page.title ?? page.path}${
    page.description ? `: ${page.description}` : ''
  }`;

/**
 * What a listing says when a scope does not exist.
 *
 * An error rather than an empty page, and it names the tool that answers the
 * question — an agent handed `[]` reads "this version is empty" and stops.
 */
export const duxtUnknownScope = (prefix: string) => ({
  content: [
    {
      type: 'text' as const,
      text:
        `No documentation is served at ${prefix}. ` +
        'Call `list_versions` for the prefixes this site publishes.'
    }
  ],
  isError: true
});

/** What a listing says when handed a cursor it cannot have issued. */
export const duxtBadCursor = (cursor: string) => ({
  content: [
    {
      type: 'text' as const,
      text:
        `"${cursor}" is not a cursor from this server. ` +
        'Pass the `nextCursor` of the previous call, or omit it to start over.'
    }
  ],
  isError: true
});
