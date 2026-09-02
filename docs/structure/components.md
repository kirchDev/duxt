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

Icons follow the extension, so a `.ts` file looks like a `.ts` file:

::file-tree
---
tree:
  - name: app/
    children:
      - name: components/
        children:
          - name: DuxtHeader.vue
      - name: pages/
        children:
          - name: index.vue
  - name: docs/
    children:
      - name: index.md
  - name: nuxt.config.ts
  - name: package.json
---
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

::callout{type="warning" title="Keep oxfmt away from docs/"}
A Markdown formatter rewrites a component block's YAML props into a list and
indents its closing `::`, which turns the component back into literal text.
This repo excludes `docs/` in `.oxfmtrc.json` and in `lint-staged.config.ts`.
::
