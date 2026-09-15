/**
 * A frontmatter block, written and taken off again.
 *
 * Both halves live here because both sides of the layer need one of them and
 * neither may drift from the other: the generated sections WRITE every page's
 * block, and the copy button, `llms-full.txt`, the `.md` twin and the MCP tools
 * READ the prose back out from under it. Before this the writer existed three
 * times — one copy already disagreed about empty values — and the reader twice,
 * once with a comment claiming it was the other.
 *
 * Pure and dependency-free, so the app bundle can import it as well as Nitro
 * and the build.
 */

/**
 * A frontmatter block YAML can read back.
 *
 * Every value is written as a JSON string, which is also a YAML double-quoted
 * scalar — so a title carrying a colon cannot end the mapping early, the exact
 * failure `tests/frontmatter-yaml.test.ts` exists over. `GET /pets/{petId}: not
 * found` is the shape that breaks an unquoted one.
 *
 * An absent or empty value writes no key at all: `title: ""` is not a title,
 * and Content would read it as one rather than falling back to the heading.
 */
export function frontmatterBlock(
  fields: Record<string, string | undefined>
): string {
  return [
    '---',
    ...Object.entries(fields)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`),
    '---'
  ].join('\n');
}

/**
 * The Markdown body without its frontmatter block.
 *
 * Content's `rawbody` is the file as it sits on disk, frontmatter included. A
 * reader wants the prose; a model handed `---\ntitle: …\n---` reads a page
 * whose first heading is a YAML fence.
 */
export function stripFrontmatter(body: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(body);

  return match ? body.slice(match[0].length) : body;
}
