---
title: MDC components
description: The blocks a Markdown page can call, with their props.
icon: lucide:blocks
---

Anything in `app/components/content/` is callable from Markdown. These ship
with the layer.

## Callout

::callout{type="tip" title="A callout"}
Body text, rendered as Markdown.
::

```md
::callout{type="warning" title="Careful"}
Body text.
::
```

| Prop    | Type                                       | Default  | What it does                     |
| :------ | :----------------------------------------- | :------- | :------------------------------- |
| `type`  | `info` \| `tip` \| `warning` \| `danger`   | `info`   | Icon and accent colour           |
| `title` | `string`                                   | —        | Bold line above the body         |
| `icon`  | `string`                                   | by type  | Overrides the icon               |

The body is the default slot: any Markdown, including nested components.

## PackageManagers

::package-managers{command="add -D @kirchdev/duxt"}
::

```md
::package-managers{command="add -D @kirchdev/duxt"}
::
```

| Prop       | Type       | Default            | What it does                                    |
| :--------- | :--------- | :----------------- | :---------------------------------------------- |
| `command`  | `string`   | required           | Written once, rendered per manager               |
| `managers` | `string[]` | `packageManagers`  | Overrides the site-wide list for this block only |

`npm`'s `install`, `npx`, `yarn dlx` and `bunx` are substituted for you. The
reader's choice is remembered in a cookie, so the server renders the right tab.

## FileTree

::file-tree{title="example/"}
---
tree:
  - name: docs/
    children:
      - name: index.md
  - name: nuxt.config.ts
---
::

```md
::file-tree{title="example/"}
---
tree:
  - name: docs/
    children:
      - name: index.md
  - name: nuxt.config.ts
---
::
```

| Prop    | Type                                     | Default | What it does                    |
| :------ | :--------------------------------------- | :------ | :------------------------------ |
| `tree`  | `{ name, children? }[]`                  | `[]`    | The structure                   |
| `title` | `string`                                 | —       | Header above the tree           |

A name ending in `/`, or one with children, is a directory. File icons follow
the extension.

## Steps

::steps
1. Write an ordered list.
2. Wrap it.
::

```md
::steps
1. Write an ordered list.
2. Wrap it.
::
```

No props — it numbers whatever list it wraps.

## PageCards

Renders one card per child of the current section, from the navigation. Used on
a section's index page.

| Prop   | Type     | Default        | What it does                    |
| :----- | :------- | :------------- | :------------------------------ |
| `path` | `string` | current route  | Which section's children to show |

## Prose overrides

`ProseH2`, `ProseH3`, `ProseH4` add anchor links; `ProsePre` adds the filename
bar and copy button. Replace any of them by putting a file of the same name in
your own `components/content/`.
