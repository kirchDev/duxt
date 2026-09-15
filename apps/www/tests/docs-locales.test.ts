import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// The repository's own documentation, at the workspace root.
const docs = join(import.meta.dirname, '..', '..', '..', 'docs');
const locales = ['de', 'es', 'fr', 'pt'];

function markdownFiles(root: string, directory = root): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return markdownFiles(root, path);
    return entry.isFile() && entry.name.endsWith('.md')
      ? [relative(root, path)]
      : [];
  });
}

describe('the project-owned documentation locales', () => {
  const source = markdownFiles(docs)
    .filter((path) => !locales.some((locale) => path.startsWith(`${locale}/`)))
    .sort();

  it.each(locales)('%s carries the same canonical page paths', (locale) => {
    expect(markdownFiles(join(docs, locale)).sort()).toEqual(source);
  });
});
