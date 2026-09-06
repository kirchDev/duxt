---
title: Introduction
description: What duxt is, and what arrives with a single line of config.
icon: lucide:rocket
---

duxt is a Nuxt layer. You extend it, put Markdown in `docs/`, and you have a
documentation site — navigation, table of contents, search, theme, `llms.txt`
and an MCP server included.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  extends: ['@kirchdev/duxt']
});
```

That is the whole of the single-folder case. No collection, no layout, no
`content.config.ts`.

## What it is not

duxt does not source content. [Nuxt Content v3](https://content.nuxt.com)
already downloads a git repository at a branch or a tag, authenticates against a
private one and hash-caches the result — and duxt uses that rather than
reimplementing it.

What duxt adds is the part that otherwise gets retyped in every documentation
repository: one collection per version and repository, the URL scheme that
carries them, the switcher that knows which page exists where, and a theme on
top. All of it is generated from one list — see
[Sources](/concepts/sources).

## Where to go next

::page-cards
::
