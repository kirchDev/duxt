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

## Field and FieldGroup

::field-group
::field{name="showRepo" type="boolean" default="false"}
Force a repository segment even with a single repository.
::
::field{name="defaultRef" type="string" required}
The ref served without a version prefix.
::
::

```md
::field-group
::field{name="showRepo" type="boolean" default="false"}
Force a repository segment even with a single repository.
::
::
```

| Prop       | Type      | Default  | What it does                        |
| :--------- | :-------- | :------- | :---------------------------------- |
| `name`     | `string`  | required | The parameter's name                |
| `type`     | `string`  | —        | Drawn beside it, in mono            |
| `default`  | `string`  | —        | Right-aligned, as `= value`         |
| `required` | `boolean` | `false`  | Draws a badge instead of a default  |

A definition list would be the semantic choice and is the wrong one: the name,
the type, the default and whether it is required are four different things, and
`<dt>` gives them one slot between them.

## TabGroup

::tab-group
:::tab{label="pnpm"}
Uses the workspace protocol.
:::
:::tab{label="npm"}
Uses file links.
:::
::

```md
::tab-group
:::tab{label="pnpm"}
Uses the workspace protocol.
:::
::
```

Built on Reka UI's primitives, so keyboard navigation, roving focus and the ARIA
roles come for free. A `:::tab` takes one prop, `label`.

::callout{type="warning" title="Not `::tabs`"}
The UI kit already owns the name `Tabs` — shadcn's primitive. Two components of
one name is not an override that resolves in your favour: Nuxt keeps one, and it
keeps the UI kit's. A content component may not take a name the kit owns.
::

## CodeGroup

::code-group

```bash [pnpm]
pnpm add @kirchdev/duxt
```

```bash [npm]
npm install @kirchdev/duxt
```

::

The tab label is each fence's own filename — that is what the reader is choosing
between, and it is already written.

## Accordion

::accordion
:::accordion-item{label="Why is my collection empty?"}
Check the source's `path` and `refs`. The build says so too.
:::
:::accordion-item{label="Why is a version missing?"}
A collection name that is not a JavaScript identifier is dropped by Content.
:::
::

`type="multiple"`: a FAQ where opening one answer closes the one you were
half-way through is a worse FAQ.

## Mermaid

A ```mermaid fence renders as a diagram. Loaded on demand and only in the
browser — mermaid is roughly half a megabyte, and a site where three pages in
sixty carry a diagram must not make the other fifty-seven pay for it. The SSR
output is the source text, which is the honest fallback without JavaScript.

The diagram follows the site's own colour mode.

## Partial

:partial{name="install"}

```md
:partial{name="install"}
```

The block above is rendered from `docs/_partials/install.md`. It renders a block
from any source's `_partials/` folder. See the sources
reference. A missing partial renders nothing rather than an error — a page whose
install note failed to resolve is still a readable page, and the build says so
instead.

## Since

```md
## resolveSources() :since{version="v0.2.0"}
```

The version a thing **arrived** in — a fact about the API, not about the page it
is documented on, so it stays correct in every version of the docs carrying the
sentence.

For any other badge, `:badge[Experimental]` calls the theme's own `Badge`
directly: MDC resolves any globally registered component by name, so arbitrary
badge text needs no component of its own.

## Images

```md
![The sidebar](/shots/sidebar.png){dark="/shots/sidebar-dark.png"}
```

A screenshot of a dark editor on a white page is the most common ugly thing in
documentation, and CSS cannot fix it — the pixels are wrong, not the frame. The
dark file is named explicitly rather than guessed by convention: deriving
`-dark.png` would 404 on every image without a dark twin, and a broken image is
worse than a mismatched one.

Clicking opens the image at full size. `{zoom="false"}` turns that off.

## Links

An absolute link inside a page is resolved against **its own source**.
`/getting-started` written in one repository is correct on a site with one
source and a 404 on a site with two, and the author of the Markdown — who may be
another repository entirely — cannot know which. Worse across versions: a link
written in `v0.7.0` must stay inside `v0.7.0`.

Write them as if your source were the only one. The build checks them, and says
which file holds a link that leads nowhere.

## Code annotations

| In the fence                  | What it does                       |
| :---------------------------- | :--------------------------------- |
| ` ```ts {2,4-6} `             | Highlights those lines             |
| ` ```ts /useDuxtConfig/ `     | Highlights that word               |
| ` ```ts line-numbers `        | Draws a gutter of line numbers      |
| `// [!code highlight]`        | Highlights the line it sits on      |
| `// [!code ++]` / `--`        | Marks the line added or removed     |
| `// [!code focus]`            | Dims everything else                |
| `// [!code warning]` / `error`| Marks the line                      |

Line numbers are opt-in per fence: most snippets in documentation are four lines
long, and a gutter next to them is noise. They are drawn with a CSS counter, so
a reader copying the block gets the code and not the numbering.
