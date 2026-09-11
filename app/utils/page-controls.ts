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
  toc?: boolean | DuxtTocControl;
  /** `false` hides the trail above the title. Overrides `duxt.breadcrumb`. */
  breadcrumb?: boolean;
  /** `false` hides the previous/next pair under the article. */
  prevNext?: boolean;
  /** `false` hides the "was this helpful?" row. */
  feedback?: boolean;
  /** `false` hides the edit link, the last-updated line and the contributors. */
  pageInfo?: boolean;
  /** `false` hides the copy-page and hand-to-a-model control. */
  copyPage?: boolean;
  /** `true` removes the reading-width cap. Nothing else. */
  fullWidth?: boolean;
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

/** What the SITE decided, for the two controls that have a site-wide switch. */
export interface DuxtPageControlDefaults {
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
    toc: flag(toc, true),
    tocMaxDepth:
      depth(object?.maxDepth) ?? depth(site.tocMaxDepth) ?? DUXT_TOC_MAX_DEPTH,
    breadcrumb: flag(fields.breadcrumb, site.breadcrumb !== false),
    prevNext: flag(fields.prevNext, true),
    feedback: flag(fields.feedback, true),
    pageInfo: flag(fields.pageInfo, true),
    copyPage: flag(fields.copyPage, true),
    // The one control that is OFF until asked for: every other field removes
    // something the shell draws, this one removes a constraint.
    fullWidth: flag(fields.fullWidth, false),
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
 */
export const duxtPageSearchable = (page: unknown): boolean =>
  (page as DuxtPageControlFields | undefined | null)?.search !== false;

/**
 * Content's outline, cut to the depth this page asked for.
 *
 * Content nests headings by RELATIVE depth and as deep as the document goes,
 * while `DuxtToc` draws exactly two levels. So this does what `generatedToc`
 * already does for a generated page: read the tree back out in document order,
 * drop what is deeper than the maximum, and collapse everything that is left
 * below the first level into it. The written page and the generated one then
 * cannot draw the same outline two different ways.
 *
 * Dropping a heading drops its children with it — they are deeper by
 * construction, so keeping them would reparent a sub-section under a heading
 * the reader was not shown.
 */
export function duxtTocLinks(
  links: DuxtTocLink[] | undefined,
  maxDepth: number = DUXT_TOC_MAX_DEPTH
): DuxtTocLink[] {
  const limit = depth(maxDepth) ?? DUXT_TOC_MAX_DEPTH;
  const flat: DuxtTocLink[] = [];

  const walk = (nodes: DuxtTocLink[]) => {
    for (const node of nodes) {
      if (node.depth > limit) continue;

      const { children, ...link } = node;
      flat.push(link);
      if (children?.length) walk(children);
    }
  };

  walk(links ?? []);

  const nested: DuxtTocLink[] = [];

  for (const link of flat) {
    const parent = nested.at(-1);

    // A page whose first heading is an `h3` still needs a row to hang under.
    if (link.depth > 2 && parent) (parent.children ??= []).push(link);
    else nested.push({ ...link, depth: 2 });
  }

  return nested;
}
