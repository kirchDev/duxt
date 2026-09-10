/**
 * The contents column for a page whose headings a COMPONENT draws.
 *
 * Content builds `body.toc` from the Markdown headings it parsed, which is the
 * whole outline of an ordinary page and none of the outline of a generated one:
 * a release page's headings are the group names `ChangelogGroup` renders from a
 * prop. Content sees a component call and nothing else, so `body.toc.links`
 * comes back empty and the page had no contents column at all.
 *
 * So the outline is read back off the AST the page ships anyway — the same
 * nodes `ContentRenderer` is about to draw, before it draws them. That keeps it
 * SSR-safe and pure: no registry a child fills during render (which renders
 * empty on the server and mismatches on hydration), and no second query.
 *
 * Anchors come from `changelog.ts`, which is also what the two components use,
 * so a link here and the id it points at cannot drift apart.
 */
import { changelogAnchor, changelogLabel } from './changelog';

export interface DuxtGeneratedTocLink {
  id: string;
  text: string;
  depth: number;
  children?: DuxtGeneratedTocLink[];
}

const HEADING = /^h([23])$/;

/**
 * A prop, whichever spelling it arrived in.
 *
 * Content writes a non-string prop under a `:`-prefixed key holding JSON — the
 * same encoding MDC uses in a document — so `count` is `":count"` and
 * `releases` is a JSON string. Read both, because which one a prop takes
 * depends on the value the parser gave it and not on the component.
 */
function prop(props: Record<string, unknown>, name: string): unknown {
  if (name in props) return props[name];

  const raw = props[`:${name}`];
  if (typeof raw !== 'string') return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** The words a node shows, with its markup dropped. */
function text(node: unknown): string {
  if (typeof node === 'string') return node;
  if (!Array.isArray(node)) return '';

  return node.slice(2).map(text).join('');
}

/**
 * Every entry the page's own AST names, in document order and flat.
 *
 * Depth follows what the page RENDERS rather than what the node is: a group is
 * an `<h2>` on the release page, and a heading written under that group was
 * promoted to `##` by the parser — so inside a group it is one level further
 * in, or the column would claim both are siblings.
 */
function walk(nodes: unknown[], inside: boolean): DuxtGeneratedTocLink[] {
  const links: DuxtGeneratedTocLink[] = [];

  for (const node of nodes) {
    if (!Array.isArray(node)) continue;

    const [tag, ...rest] = node as unknown[];
    if (typeof tag !== 'string') continue;

    const props = (
      rest[0] && typeof rest[0] === 'object' ? rest[0] : {}
    ) as Record<string, unknown>;
    const children = rest.slice(1);

    if (tag === 'changelog-group') {
      const name = String(prop(props, 'name') ?? '');
      const id = changelogAnchor(name);

      // The same words the heading itself draws — the anchor is still built
      // from the file's own name, so the two cannot point apart.
      if (id) links.push({ id, text: changelogLabel(name), depth: 2 });
      links.push(...walk(children, true));
      continue;
    }

    // The release OVERVIEW contributes nothing. Its versions are already the
    // whole visible page — a column repeating the six lines the reader is
    // looking at is a second copy of the list, not a way around it. What is
    // left there is the aside's own links and the page's provenance, which is
    // why the column is drawn on a page with no outline at all.
    if (tag === 'changelog-releases') continue;

    const heading = HEADING.exec(tag);
    if (heading) {
      const id = props.id;
      if (typeof id === 'string' && id) {
        links.push({
          id,
          text: text(node).trim(),
          depth: inside ? 3 : Number(heading[1])
        });
      }
      continue;
    }

    links.push(...walk(children, inside));
  }

  return links;
}

/** The flat list nested the way `DuxtToc` draws it: one level of children. */
export function generatedToc(body: unknown): DuxtGeneratedTocLink[] {
  const value = (body as { value?: unknown })?.value;
  if (!Array.isArray(value)) return [];

  const links: DuxtGeneratedTocLink[] = [];

  for (const link of walk(value, false)) {
    const parent = links.at(-1);

    if (link.depth > 2 && parent) (parent.children ??= []).push(link);
    else links.push({ ...link, depth: 2 });
  }

  return links;
}

/**
 * Does this page open on a heading of its own?
 *
 * The one question that decides whether a generated page gets the DOCS HEADER —
 * breadcrumb, title, description, the copy control beside it. A type whose
 * parser writes an `<h1>` has said it draws its own (an endpoint wants its
 * title beside a method chip, which no shell could know); one that writes none
 * has a title and a trail like every other page and should look like one.
 *
 * Read off the artefact rather than declared as a flag on the type: the two
 * cannot then disagree, and the failure a flag would have — an `<h1>` from the
 * parser under an `<h1>` from the shell — is not expressible.
 */
export function generatedTitle(body: unknown): boolean {
  const value = (body as { value?: unknown })?.value;
  if (!Array.isArray(value)) return false;

  return value.some((node) => Array.isArray(node) && node[0] === 'h1');
}

/**
 * The prose a generated page OPENS with, flattened to its words.
 *
 * The shell draws a page's description under its title, and for a generated
 * page that was suppressed outright: Content derives a description from the
 * body where the frontmatter names none, and the body then printed the same
 * sentence again three lines below.
 *
 * Derived and written are indistinguishable once they are in `description`, so
 * this answers the question that actually matters — does the body already open
 * with it? A type that writes a real description (an API document's `summary`,
 * which appears nowhere in its prose) gets the line every written page has; one
 * whose description was lifted out of its own first paragraph does not.
 *
 * Walks INTO the first node, because a generated body opens on a component
 * call: the prose is that component's children, not a sibling of it.
 */
export function generatedLead(body: unknown): string {
  const value = (body as { value?: unknown })?.value;
  if (!Array.isArray(value)) return '';

  return collapse(lead(value));
}

/**
 * Does the body already open with this description?
 *
 * `startsWith` rather than equality, because a page's description is often the
 * FIRST LINE of prose the page then prints in full — the same sentence at two
 * lengths, and printing both puts one above the rule and one under it.
 *
 * Both sides are collapsed first. Frontmatter folds a wrapped line into a
 * space; the AST keeps the newline the author typed, so the two spellings of
 * one sentence differ by exactly the whitespace nobody can see.
 */
export function generatedLeadsWith(
  description: string,
  body: unknown
): boolean {
  const opening = generatedLead(body);

  return Boolean(opening) && opening.startsWith(collapse(description));
}

/** One sentence, however it was wrapped. */
const collapse = (value: string) => value.replace(/\s+/g, ' ').trim();

/** The first paragraph's words, however deep the components go. */
function lead(nodes: unknown[]): string {
  for (const node of nodes) {
    if (!Array.isArray(node)) continue;

    const [tag, ...rest] = node as unknown[];
    if (typeof tag !== 'string') continue;

    if (tag === 'p') return text(node).trim();

    const found = lead(rest.slice(1));
    if (found) return found;
  }

  return '';
}
