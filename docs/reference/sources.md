---
title: duxtSources()
description: Turn a compact source list into Content collections.
icon: lucide:git-branch
---

Declaring one collection per version and repository by hand does not scale —
three versions across fourteen repositories is 42 declarations. `duxtSources`
generates them from a list.

```ts [content.config.ts]
import { defineContentConfig } from '@nuxt/content'
import { duxtSources } from '@kirchdev/duxt/sources'

export default defineContentConfig({
  collections: duxtSources([
    { path: 'docs' },
    { path: 'docs', refs: ['v1.x', 'v2.x', 'main'] },
    { repo: 'kirchDev/app', path: 'docs' },
  ]),
})
```

## A source

| Key     | Type       | Default          | What it does                                      |
| :------ | :--------- | :--------------- | :------------------------------------------------ |
| `path`  | `string`   | `docs`           | Folder holding the Markdown                        |
| `repo`  | `string`   | this repository  | `owner/name` or a full git URL                     |
| `refs`  | `string[]` | the checkout     | Branches or tags published as versions             |
| `label` | `string`   | the ref          | Shown in the switcher and used in the URL          |
| `slug`  | `string`   | the repo name    | Segment used in the URL for this repository        |

## Options

| Key           | Type      | Default            | What it does                            |
| :------------ | :-------- | :----------------- | :-------------------------------------- |
| `showRepo`    | `boolean` | more than one repo | Forces a repository segment             |
| `showVersion` | `boolean` | more than one ref  | Forces a version segment                |
| `defaultRef`  | `string`  | the first ref      | The ref served without a version prefix |

## The URL scheme

```
domain.tld/<repo?>/<version?>/<folder?>/…/<file>
```

Both prefixes are switched on by the **shape of the list**, not per request: a
repository segment appears once there is more than one repository, a version
segment once there is more than one version. A single unversioned source
therefore serves `/guide/deploying`, and nothing in the URL says that
repositories or versions exist at all.

Deciding at build time is what keeps the scheme routable. Were both prefixes
optional per request, `/guide/…` could be a folder, a repository or a version.

::callout{type="warning" title="Name collisions are rejected, not resolved"}
With a prefix active, a docs folder named like a repository or a version would
be ambiguous. `duxtSources` throws at build rather than picking one silently —
give the source a `slug` or a `label`.
::

## A missing page

A page absent from the version being read is a **404**, not a redirect. The
error page names the versions that do have it and links them. Sending the
reader to another version's copy would leave them reading something they did
not ask for, believing they did.
