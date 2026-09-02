---
title: Collections
description: What Content builds, and what the layer declares for you.
icon: lucide:database
---

A collection is Content's unit of sourcing: a glob, a place to read it from, and
a schema. The layer declares one for your `docs/` folder, so the common case
needs no configuration.

## What the layer declares

```ts [content.config.ts]
docs: defineCollection({
  type: 'page',
  source: {
    include: '**/*.md',
    cwd: join(repositoryRoot(), 'docs'),
    prefix: '',
  },
})
```

## Why the path is absolute

Content resolves a collection against the rootDir of the **layer** that declared
it, not the project extending it. A relative path in the layer points into the
layer. The absolute path is computed at load time, which works because the
config is executed rather than read.

::callout{type="danger" title="Do not make this relative"}
It will appear to work in the layer's own site and break in every consumer.
::
