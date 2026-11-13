import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { expect, it } from 'vitest';

// Floating refs allowed by decision. None at present: release-me, the last one,
// is pinned since v0.5.0 carried what duxt needed. An entry here names the exact
// `<workflow>: <reference>` line it excuses.
const FLOATING = new Set<string>();

it('requires immutable Actions and reusable workflows with a readable version', () => {
  const root = fileURLToPath(
    new URL('../../../.github/workflows', import.meta.url)
  );
  const uses = readdirSync(root)
    .filter((name) => /\.ya?ml$/.test(name))
    .flatMap((name) =>
      [
        ...readFileSync(join(root, name), 'utf8').matchAll(
          /^\s*(?:-\s*)?uses:\s*(.+)$/gm
        )
      ].map((match) => `${name}: ${match[1]}`)
    );
  expect(uses.length).toBeGreaterThan(10);
  for (const reference of uses.filter((use) => !FLOATING.has(use)))
    expect(reference).toMatch(/@[a-f0-9]{40}\s+#\s+v\d+(?:\.\d+)*$/);
});
