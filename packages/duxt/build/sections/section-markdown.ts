/**
 * The small pieces of Markdown every generated section writes a page out of.
 *
 * The OpenAPI and Bruno generators each carried their own copy of all three,
 * and the copies had started to differ: Bruno's first line undid inline
 * Markdown with a pass of its own that was one refactor away from disagreeing
 * with the reference's. One copy, so a page title reads the same whichever
 * source produced it.
 */

/** Zero-padded so ten pages still sort the way they read. */
export function pageOrder(index: number, total: number): string {
  return String(index + 1).padStart(String(total).length, '0');
}

/**
 * A URL segment: lowercase, no dots.
 *
 * The dots matter: Content reads a name made of digits and dots as a version
 * and stops refining it, which would leave the `NN.` ordering prefix in the
 * URL. `fallback` is what a name made only of punctuation becomes — empty by
 * default, so a caller can try the next candidate with `||`.
 */
export function urlSegment(value: string, fallback = ''): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback
  );
}

/**
 * The first paragraph of a description, as one line of PLAIN text.
 *
 * Plain matters because of where this goes: a page's `description`
 * frontmatter, which becomes the meta description, the og tag and the card in
 * a search result, and the summary on a group card. A CommonMark description
 * carrying `*emphasis*` or a `[link](url)` renders as prose everywhere it is
 * rendered as prose — and as its own punctuation everywhere it is not.
 *
 * Deliberately small. It undoes the four inline constructs a one-line summary
 * actually meets — emphasis, code spans, links and images — and leaves
 * everything else alone rather than growing into a second Markdown parser
 * whose disagreements with the first would be invisible.
 */
export function firstLine(value?: string): string | undefined {
  const line = plain(value?.split(/\n\s*\n/)[0] ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  return line || undefined;
}

/** Inline Markdown, as the text it renders to. */
function plain(value: string): string {
  return (
    value
      // An image before a link: `![alt](src)` is a link with a `!` in front, and
      // taking the link first would leave the `!` behind.
      .replaceAll(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replaceAll(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replaceAll(/`([^`]*)`/g, '$1')
      .replaceAll(/(\*\*|__)(.+?)\1/g, '$2')
      .replaceAll(/(\*|_)(.+?)\1/g, '$2')
  );
}
