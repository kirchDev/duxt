---
title: Credits
description: What duxt is built on, and what it was built after.
icon: lucide:heart
---

duxt is a thin layer over other people's work. Almost nothing it does is its own
invention — the sourcing, the parsing, the components and the styling all come
from projects that solved those problems first, and the honest description of
this repository is the glue between them plus a handful of opinions.

## Built on

| Project                                             | What it does here                                                   |
| :-------------------------------------------------- | :------------------------------------------------------------------ |
| [Vue](https://vuejs.org)                             | The component model everything here is written in                    |
| [Nuxt](https://nuxt.com)                             | The framework, and the layer mechanism the whole idea rests on       |
| [Nuxt Content](https://content.nuxt.com)             | Sourcing, parsing, querying — including the git-native repositories  |
| [shadcn-vue](https://www.shadcn-vue.com)             | The component base, copied into the layer rather than imported       |
| [reka-ui](https://reka-ui.com)                       | The primitives underneath them: focus, roving tabindex, ARIA         |
| [Tailwind CSS](https://tailwindcss.com)              | The styling system and the token layer                               |
| [Shiki](https://shiki.style)                         | Syntax highlighting, at build time                                   |
| [The icon sets](#icons)                              | Four collections, one per kind of mark                               |
| [MDC](https://content.nuxt.com/docs/files/markdown)  | Components callable from Markdown                                    |

The version of each is in `package.json`, which is where a number belongs — a
second copy in prose is one that goes stale silently.


## Icons

Four collections, because monochrome and self-coloured are different jobs — the
rule that decides which draws what is written down under
[Conventions](/conventions/icons).

| Set                                                          | Draws                                     | Licence |
| :------------------------------------------------------------ | :---------------------------------------- | :------ |
| [Lucide](https://lucide.dev)                                  | the interface                              | ISC     |
| [vscode-icons](https://github.com/vscode-icons/vscode-icons)  | files, fence languages, the tools          | MIT     |
| [Simple Icons](https://simpleicons.org)                       | the marks vscode-icons does not carry      | CC0-1.0 |
| [flag-icons](https://github.com/lipis/flag-icons)             | the flag beside each locale                | MIT     |

The licence is named here rather than left to `package.json` because the build
inlines these SVGs into what ships: the package carries the works, so it carries
the notices.

A licence on a file is not a licence on a mark. The package managers, GitHub,
Discord, Claude and OpenAI are trademarks of their owners; they are drawn here to
name the thing they identify, and for nothing else.
## Built after

Ideas duxt took from projects it is not built on. What it *is* built on is the
table above — nothing is named twice.

- [**shadcn/ui**](https://ui.shadcn.com) — the original idea: components you own
  as files rather than import as a dependency. Every component in this layer is
  here because of it.
- [**shadcn-docs-nuxt**](https://shadcn-docs-nuxt.vercel.app) — the closest
  neighbour, and the proof that a documentation template on Nuxt Content and
  shadcn-vue is worth having.
- [**Docus**](https://docus.dev) — the original "extend a layer, get a docs
  site" ergonomics in the Nuxt ecosystem.
- [**Nuxt UI**](https://ui.nuxt.com) — for the machine-readable end: `llms.txt`
  and a documentation endpoint an agent can call, treated as build output rather
  than as an add-on.
- [**VitePress**](https://vitepress.dev) and
  [**Starlight**](https://starlight.astro.build) — for what a documentation
  theme owes a reader by default: a version switcher that survives navigation, a
  table of contents that tracks, search that is there without configuration.

::callout{type="tip" title="Where duxt differs"}
Every project above documents one repository at one version. duxt's own reason to
exist starts where that stops: several repositories, several versions of each,
and one `sources` list generating the collections for all of them — see
[Sources](/concepts/sources).
::

## Not credited here

Two things are deliberately absent. The layer's own dependencies are listed in
`package.json` and do not need a second, hand-kept copy; and the people who wrote
a given page are named on that page, from the git history behind it, rather than
in a list here that would go out of date on the next commit.
