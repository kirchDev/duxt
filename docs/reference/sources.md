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
| `status`| `string`   | `current`        | Lifecycle of every version this entry publishes    |
| `origin`| `object`   | —                | `{ repo, ref }` for links back to a local source   |

`status` is one of `upcoming`, `current`, `maintained`, `deprecated` or `eol`. It is not the
same question as "is this the default": a site can publish v2 as the default
while v1 is merely older and v0 is dead, and the reader has to be told which of
the three they are in. A `deprecated` or `eol` version draws a banner, carries a
badge in the switcher, and an `eol` one is dropped from the sitemap.

`upcoming` is the one that is not about age. A version can be off the default
because it has not happened **yet**, and its reader needs the opposite of an
upgrade notice — they need telling that what they are reading may still change.
Where both version names are semver, the layer works this out on its own; a
branch cannot be placed against a tag, so `status: 'upcoming'` is how you say
that `main` or `next` documents what is coming.

`origin` is for the source you do **not** download. Writing `repo` is what makes
Content clone a repository, so naming your own there would have the build clone
the checkout it is already standing in. `origin` names it for the "Edit this
page" link and nothing else:

```ts
{ path: 'docs', origin: { repo: 'kirchDev/duxt', ref: 'main' } }
```

### Refs

A bare string is a **branch**. A tag has to say so, because git keeps the two in
separate namespaces:

```ts
refs: ['main', { tag: 'v1.2.0' }]
```

A ref object also takes `label` and `status` of its own, which win over the
source's.

`'latest'` is **reserved**: it resolves at build time to the newest semver tag
of that repository, so a release no longer edits the consumer's source list. The
URL keeps saying `latest`, so a bookmark survives the next release. Newest means
semver order, not tag date — a patch cut for an old line after a newer minor
must not become the current docs. A branch genuinely called `latest` needs
`{ branch: 'latest' }`.

```ts
{ repo: 'kirchDev/app', refs: ['main', 'latest'] }
```

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

## Drafts

A page named `deploying.draft.md` is served in the dev server and absent from
the build. Content already strips `.draft` out of the URL, so the page is at
`/deploying` while you write it.

The marker is the file **name**, not `draft: true` in the frontmatter, and that
is not a preference. A collection's contents are declared before Content has
read a single file — for a remote source, before it has been downloaded — so
nothing at declaration time knows what the frontmatter says. A file name is
known.

## Partials

`_partials/` in any source's docs folder feeds one shared collection, and any
page of any source can render a block from it:

```md
:partial{name="install"}
```

Content ships no include directive, and across several repositories that is a
gap with no workaround: an install note that must read the same in three
projects is copied into three projects and drifts. Partials are excluded from
the page collections themselves, so they never appear in the sidebar, the search
or `llms.txt`.

## Moved pages

`redirectFrom` in a page's frontmatter becomes a permanent redirect:

```md
---
title: Deploying
redirectFrom:
  - /guide/deployment
---
```

Written the way the page's own links are — relative to its source, without the
prefix the site happens to serve it under. The layer generates one rule per
locale plus the unprefixed form, because it is the only thing that knows which
prefixes exist. The alternative is the same rule written into every consumer's
web server, by whoever deploys it rather than by whoever moved the page.

## A missing page

A page absent from the version being read is a **404**, not a redirect. The
error page names the versions that do have it and links them. Sending the
reader to another version's copy would leave them reading something they did
not ask for, believing they did.
