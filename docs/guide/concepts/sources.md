---
title: Sources
description: One repository, several repositories, several versions.
icon: lucide:git-branch
---

Content can already read a collection from a git repository, at a branch or at a
tag, with auth for private ones and hash-based caching. duxt does not reimplement
that — it removes the boilerplate of declaring one collection per version and
repository.

## Today

The mechanism, used directly:

```ts [content.config.ts]
defineCollection({
  type: 'page',
  source: {
    repository: { url: 'https://github.com/kirchDev/workflows', tag: 'v0.7.0' },
    include: 'docs/**/*.md',
    prefix: '/v0.7.0',
  },
})
```

## The shorthand

Not built yet. The shape being aimed at:

```ts
sources: [
  { path: 'docs' },
  { path: 'docs', refs: ['v1.x', 'v2.x', 'main'] },
  { repo: 'kirchDev/app', path: 'docs' },
]
```

Three versions across fourteen repositories is 42 collections by hand. That
number is the whole argument for the shorthand.
