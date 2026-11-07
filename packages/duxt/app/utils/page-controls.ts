/**
 * What a PAGE gets to say about the docs shell drawn around it.
 *
 * A page could already say what it is — `title`, `description`, `icon`, `date`
 * — and one thing about where it goes. It could say nothing about the shell:
 * the table of contents, the prev/next pair, the feedback row and the
 * provenance block all rendered unconditionally, and the only escape was
 * `layout: landing`, which drops the whole docs shell and leaves the author
 * rebuilding it by hand. An API reference that wants the full width and a legal
 * page that wants no "was this helpful?" both ended up there.
 *
 * So: a small, flat set of frontmatter fields, each of which turns off one
 * thing the shell draws. Three rules hold the surface down, and all three were
 * decided rather than discovered:
 *
 * - **Flat fields, not one nested object.** `toc: false` is what an author
 *   writes in every comparable generator, and gathering them under a single
 *   key buys a namespace nothing else needs.
 * - **A page cannot hide the left navigation.** `layout: landing` stays the
 *   one no-shell escape; `fullWidth` keeps the header and the sidebar, because
 *   a page that removed the sidebar is a page the reader cannot leave.
 * - **The controls compose and never imply one another.** `fullWidth` removes
 *   the reading measure and nothing else; `copyPage` is independent of
 *   `pageInfo`. A field that silently means three things cannot be combined
 *   with the two it swallowed.
 *
 * Every name here is public API the moment it ships — Content drops an
 * undeclared field silently, so `pageSchema` in `sources.ts` is the gate, and
 * `docs/4.reference/3.frontmatter.md` is where an author reads them. Renaming
 * one is a breaking change.
 */

/** The deepest heading the contents column draws when nobody says otherwise. */
export const DUXT_TOC_MAX_DEPTH = 3;

/**
 * The range a page may ask for, as HTML heading levels rather than as a count.
 *
 * `h1` is never in the list — the title is the page's one `h1` — and there is
 * no `h7`. Stated as levels because that is what an author counts in their own
 * document; Content's own `toc.depth` is a count from `h2` and is set once, in
 * the layer's `nuxt.config.ts`, deep enough that every level below is available
 * to be filtered back down to here.
 */
const TOC_DEPTHS = [2, 3, 4, 5, 6];

/** One heading in the contents column, in the shape `DuxtToc` draws. */
export interface DuxtTocLink {
  id: string;
  text: string;
  depth: number;
  children?: DuxtTocLink[];
}

/** The `toc` field's object form: the column, drawn this deep. */
export interface DuxtTocControl {
  /** The deepest heading level listed. `2`–`6`; the list always starts at h2. */
  maxDepth?: number;
}

/** The frontmatter an author writes. Every field is optional, by definition. */
export interface DuxtPageControlFields {
  /** `false` drops the contents column; an object sets how deep it goes. */
  toc?: boolean | DuxtTocControl | null;
  /** `false` hides the trail above the title. Overrides `duxt.breadcrumb`. */
  breadcrumb?: boolean | null;
  /** `false` hides the previous/next pair under the article. */
  prevNext?: boolean | null;
  /** `false` hides the "was this helpful?" row. */
  feedback?: boolean | null;
  /** `false` hides the edit link, the last-updated line and the contributors. */
  pageInfo?: boolean | null;
  /** `false` hides the copy-page and hand-to-a-model control. */
  copyPage?: boolean | null;
  /** `true` removes the reading-width cap. Nothing else. */
  fullWidth?: boolean | null;
  /** `false` removes the page from every duxt-owned discovery surface. */
  search?: boolean;
}

/** The same questions, answered — one object the page component reads. */
export interface DuxtPageControls {
  toc: boolean;
  /** The deepest heading level the column lists. Meaningful only when `toc`. */
  tocMaxDepth: number;
  breadcrumb: boolean;
  prevNext: boolean;
  feedback: boolean;
  pageInfo: boolean;
  copyPage: boolean;
  fullWidth: boolean;
  search: boolean;
}

/** Site defaults apply only while the page leaves a control unanswered. */
export interface DuxtPageControlDefaults {
  toc?: boolean;
  prevNext?: boolean;
  feedback?: boolean;
  pageInfo?: boolean;
  copyPage?: boolean;
  fullWidth?: boolean;
  /** `duxt.breadcrumb` — the switch that existed before the per-page one. */
  breadcrumb?: boolean;
  /** `duxt.toc.depth` — the site's own maximum heading level. */
  tocMaxDepth?: number;
}

/**
 * A control is only ever turned off by a real `false`.
 *
 * Frontmatter is YAML a human typed, and Content stores what the schema
 * declared without asserting the value is the type it declared — so `toc: "no"`
 * arrives as the string. Anything that is not a boolean is not an answer, and
 * an unanswered control keeps whatever the site said.
 */
const flag = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

/** A level inside the decided range, or nothing — a typo is not a depth. */
const depth = (value: unknown): number | undefined =>
  typeof value === 'number' && TOC_DEPTHS.includes(value) ? value : undefined;

/**
 * The eight answers, from the page's frontmatter over the site's config.
 *
 * The page wins wherever it speaks. That is what lets a site which hid the
 * breadcrumb everywhere put it back on the one page whose trail is the point —
 * a page that could only ever turn things OFF would have no way to say it.
 */
export function duxtPageControls(
  page: unknown,
  site: DuxtPageControlDefaults = {}
): DuxtPageControls {
  const fields = (page ?? {}) as DuxtPageControlFields;
  const toc = fields.toc;
  // The object form is the DEPTH, never the switch: `toc: { maxDepth: 4 }` is a
  // page asking for more of the column, not a page turning it on.
  const object = toc && typeof toc === 'object' ? toc : undefined;

  return {
    toc: flag(toc, site.toc !== false),
    tocMaxDepth:
      depth(object?.maxDepth) ?? depth(site.tocMaxDepth) ?? DUXT_TOC_MAX_DEPTH,
    breadcrumb: flag(fields.breadcrumb, site.breadcrumb !== false),
    prevNext: flag(fields.prevNext, site.prevNext !== false),
    feedback: flag(fields.feedback, site.feedback !== false),
    pageInfo: flag(fields.pageInfo, site.pageInfo !== false),
    copyPage: flag(fields.copyPage, site.copyPage !== false),
    // The one control that is OFF until asked for: every other field removes
    // something the shell draws, this one removes a constraint.
    fullWidth: flag(fields.fullWidth, site.fullWidth === true),
    search: flag(fields.search, true)
  };
}

/**
 * Is this page offered to a reader who is looking for it rather than at it?
 *
 * ONE predicate, four surfaces: the client search index, its fuzzy fallback,
 * the MCP `search_docs` tool and the two llms indexes each have to answer this,
 * and a rule written four times is a rule three of them eventually disagree
 * with. It is deliberately NOT a rule about the URL — an excluded page is still
 * served, still canonical, still in the sitemap and still readable by
 * `read_page`. It is un-findable, not unpublished.
 *
 * IT CAN ONLY EVER BE AS GOOD AS THE COLUMN BEHIND IT. A page arrives here from
 * the database, and Content casts a boolean column with `Boolean(value)` on the
 * way out — so a nullable column hands this predicate `false` for a page that
 * never mentioned `search`, and no comparison written here can tell that apart
 * from a refusal (#88). The `search` field in `pageSchema` therefore carries a
 * default, and that is what makes this line mean what it reads as.
 */
export const duxtPageSearchable = (page: unknown): boolean =>
  (page as DuxtPageControlFields | undefined | null)?.search !== false;

/** Keep the real heading hierarchy, filtered to the page's maximum depth. */
export function duxtTocLinks(
  links: DuxtTocLink[] | undefined,
  maxDepth: number = DUXT_TOC_MAX_DEPTH
): DuxtTocLink[] {
  const limit = depth(maxDepth) ?? DUXT_TOC_MAX_DEPTH;
  const result: DuxtTocLink[] = [];
  const parents: { depth: number; link: DuxtTocLink }[] = [];

  const walk = (nodes: DuxtTocLink[]) => {
    for (const node of nodes) {
      if (node.depth > limit) continue;
      while (parents.length && parents.at(-1)!.depth >= node.depth)
        parents.pop();
      const { children, ...fields } = node;
      const parent = parents.at(-1)?.link;
      const link = { ...fields, depth: parent ? node.depth : 2 };
      if (parent) (parent.children ??= []).push(link);
      else result.push(link);
      parents.push({ depth: node.depth, link });
      if (children?.length) walk(children);
    }
  };

  walk(links ?? []);
  return result;
}
