import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defineCollection, defineContentConfig } from '@nuxt/content';

// Content merges content.config.ts from every layer — but it resolves each
// collection against the rootDir of the LAYER that declared it
// (`collection.__rootDir = curr.cwd` in the module), not against the consumer.
// A layer therefore cannot reach the consumer's docs/ with a relative path; it
// has to compute an absolute one. It can, because c12 executes this file.
//
// The path resolves against the REPOSITORY root rather than the directory the
// site runs in, because those differ whenever the site sits in a subfolder —
// as it does in this repo, where www/ is the site and docs/ is one level up.
// Provisional: the `sources` shorthand will make this explicit rather than
// inferred.
function repositoryRoot(): string {
  let dir = process.cwd();

  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;

    const parent = dirname(dir);
    if (parent === dir) return process.cwd(); // no repository — fall back to the site
    dir = parent;
  }
}

export default defineContentConfig({
  collections: {
    // The degenerate case the brief calls the most common one: the consumer's
    // own docs/, current branch, no versions, no configuration.
    docs: defineCollection({
      type: 'page',
      source: {
        include: '**/*.md',
        cwd: join(repositoryRoot(), 'docs'),
        prefix: ''
      }
    })
  }
});
