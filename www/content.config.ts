import { defineCollection, defineContentConfig } from '@nuxt/content';

// Spike, step 2 of AI_SETUP.md: two sources of the SAME repo — one at a branch,
// one at a tag — declared with Content's own `repository` support and no
// abstraction of ours. kirchDev/workflows is the source because it has a docs/
// tree and a real tag; duxt has neither yet.
const repository = 'https://github.com/kirchDev/workflows';

export default defineContentConfig({
  collections: {
    // A branch. Content re-downloads when the remote hash moves.
    docsMain: defineCollection({
      type: 'page',
      source: {
        repository,
        include: 'docs/**/*.md',
        prefix: '/main'
      }
    }),

    // A tag. Same repo, frozen ref — this is what a version would read from.
    docsV07: defineCollection({
      type: 'page',
      source: {
        repository: { url: repository, tag: 'v0.7.0' },
        include: 'docs/**/*.md',
        prefix: '/v0.7.0'
      }
    })
  }
});
