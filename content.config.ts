import { join } from 'node:path';
import { defineCollection, defineContentConfig } from '@nuxt/content';

// Content merges content.config.ts from every layer — but it resolves each
// collection against the rootDir of the LAYER that declared it
// (`collection.__rootDir = curr.cwd` in the module), not against the consumer.
// A layer therefore cannot declare a collection over the consumer's docs/ by
// writing a relative path; it has to compute an absolute one.
//
// It can, because c12 executes this file: process.cwd() is the directory the
// consumer's nuxt process runs in. This is the seam the whole `sources`
// shorthand will sit on, so it is proven here first.
export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: 'page',
      source: {
        include: '**/*.md',
        cwd: join(process.cwd(), 'docs'),
        prefix: ''
      }
    })
  }
});
