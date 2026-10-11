import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { expect, it } from 'vitest';

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
  for (const reference of uses)
    expect(reference).toMatch(/@[a-f0-9]{40}\s+#\s+v\d+(?:\.\d+)*$/);
});
