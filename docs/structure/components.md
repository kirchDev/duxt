---
title: Components in Markdown
description: MDC lets a Markdown page call a Vue component. No MDX, no module.
icon: lucide:blocks
---

Content ships MDC, so a page calls a component with block syntax:

```md
::callout{type="tip" title="A callout"}
Markdown inside a Vue component.
::
```

::callout{type="tip" title="A callout"}
Markdown inside a Vue component.
::

## What ships with the layer

### Callout

Four intents — `info`, `tip`, `warning`, `danger`.

::callout{type="danger" title="Danger"}
For the things that lose data.
::

### Package managers

One command, every manager:

::package-managers{command="dlx nuxi@latest init my-docs"}
::

### File tree

::file-tree

- app/
  - components/
  - pages/
- nuxt.config.ts
  ::

### Steps

::steps

1. Write the list.
2. Wrap it in `::steps`.
3. It numbers itself.
   ::

## Your own components

Anything in `components/content/` is available the same way, including
components your project adds on top of the layer.
