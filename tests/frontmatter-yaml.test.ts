import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Frontmatter that YAML cannot read, in the repository's own pages.
 *
 * The failure this catches is silent and cost an afternoon: an unquoted value
 * carrying a colon — `description: The navbar: title, search` — ends the
 * mapping there. The keys BEFORE it survive, the keys after it are dropped, and
 * Content renders the page with a title and no icon rather than reporting
 * anything. Six pages had it, and the symptom looked like a broken icon bundle.
 *
 * A parse of the block is the check; the rule is not "no colons" but "a value
 * with one has to be quoted".
 */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

function unreadableKeys(source: string): string[] {
  const block = FRONTMATTER.exec(source)?.[1];
  if (!block) return [];

  return block
    .split(/\r?\n/)
    .map((line) => /^(\w+):\s+(.*)$/.exec(line))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .filter(([, , value]) => {
      const first = value!.trim()[0] ?? '';
      // Quoted, a block scalar or a flow collection: the parser is told where
      // the value ends, so a colon inside it is text.
      if (`'"[{|>`.includes(first)) return false;
      return value!.includes(': ');
    })
    .map(([, key]) => key!);
}

describe('documentation frontmatter', () => {
  const files = globSync('docs/**/*.md');

  it('finds the pages to check', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files)('%s parses as YAML', (file) => {
    expect(unreadableKeys(readFileSync(file, 'utf8'))).toEqual([]);
  });
});
