---
title: Installation
description: Add the layer, extend it, write Markdown.
icon: lucide:download
---

## Add the dependency

::package-managers{command="add -D @kirchdev/duxt"}
::

## Extend the layer

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  extends: ['@kirchdev/duxt']
});
```

## Write your docs

Markdown goes in `docs/` at the root of your repository. A file becomes a page,
a folder becomes a section, and frontmatter carries the title, description and
icon:

```md [docs/getting-started/index.md]
---
title: Introduction
description: What this project is.
icon: lucide:rocket
---

Your first page.
```

::callout{type="tip" title="Nothing else is required"}
The navbar, the sidebar, the table of contents and the landing page all come
from the layer's `app.config.ts` — override the parts you disagree with.
::
