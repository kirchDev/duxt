---
title: Composables
description: The functions the layer exposes to a consumer's own components.
icon: lucide:function-square
---

Auto-imported, like every composable in a Nuxt layer.

## useDuxtConfig()

The layer's defaults with the consumer's `app.config.ts` merged over them.

```ts
const duxt = useDuxtConfig()
duxt.title // 'duxt'
```

Read this rather than `useAppConfig().duxt`. Nuxt merges app.config with defu,
which **concatenates arrays** — a consumer setting `navigation` would get the
layer's entries appended to its own. This merge replaces arrays and merges
objects key by key.

## useDuxtSection(navigation)

The section the current route belongs to, and the branch of the tree it owns.

```ts
const { data: navigation } = await useAsyncData('nav', () =>
  queryCollectionNavigation('docs'))

const { section, items } = useDuxtSection(navigation)
```

| Returns   | Type                              | What it is                          |
| :-------- | :-------------------------------- | :---------------------------------- |
| `section` | `DuxtLink \| undefined`           | The matching `sections` entry       |
| `items`   | `ContentNavigationItem[]`         | That section's pages, or everything |

## useDuxtToast()

Toasts, without importing the toast library.

```ts
const toast = useDuxtToast()
toast.success('Copied to clipboard')
toast.error('Could not copy', 'The clipboard is unavailable here.')
```

`success`, `info`, `warning`, `error`, `loading` and `dismiss`. Each level has
its own icon and status colour. Replace this one composable to swap the
notification system for the whole layer.

## usePackageManager()

The reader's chosen package manager, as a cookie.

```ts
const manager = usePackageManager() // Ref<string | undefined>
```

A cookie rather than localStorage so the server renders the right tab — see
[Installation](/getting-started/installation). First-party, no identifier, no
consent banner needed.

## useActiveHeading(ids)

The heading currently in view, for marking a table of contents.

```ts
const active = useActiveHeading(computed(() => ['intro', 'usage']))
```

## highlightShell(code)

Highlights a shell command with the same themes as the Markdown fences. Runs on
the server through `useAsyncData`, so the highlighter stays out of the client
bundle.

## fileIcon(name) / folderIcon(open)

The icon for a filename, language id or folder. Used by the code block header
and the file tree, so the same file looks the same in both.

## useDuxtVersion()

What the reader needs to be told about the version they are in. Three questions
with one answer, because the banner, the head and the switcher are asking the
same thing of the same manifest.

```ts
const { current, preferred, isPreferred, status, shouldIndex, preferredPath } =
  useDuxtVersion();
```

| Returns         | What it is                                                  |
| :-------------- | :---------------------------------------------------------- |
| `current`       | The resolved source serving this route                       |
| `preferred`     | The default version of the **same** repository               |
| `isPreferred`   | Is this the version a first-time reader should be on         |
| `status`        | What the config says: `upcoming` … `eol`                     |
| `kind`          | What the banner draws: `current`, `upcoming`, `old`, `deprecated`, `eol` |
| `shouldIndex`   | False for an older or dead version — drives `noindex`        |
| `shouldWarn`    | Drives the banner                                            |
| `preferredPath` | The same page in the preferred version                       |

`kind` is the one to read. `status` is what the maintainer wrote; `kind` is that
plus the semver relation to the default version, and it is what separates a
release from two years ago from a branch documenting next month's.

## versionRelation(version, preferred)

`older`, `newer`, `same` or `unknown`. Only answered when **both** names are
versions: a branch is not comparable to a tag, and guessing said `v0.7.0` was
newer than `main` — which is how the banner came to offer a downgrade as an
upgrade.

## useDuxtSearch()

Search across every source, not just the one being read — the thing the
`sources` model makes possible and a single-repository theme cannot do at all.

```ts
const { search, init, labelled } = useDuxtSearch();
const { hits, approximate } = await search('deploying', 20);
```

Results are **ranked together with a source badge**, not grouped per repository.
Grouping asks the reader to know which project their answer is in — but if they
knew that, the search would be doing less work than the sidebar. Lists are
interleaved by rank, the source being read leading each round, and each hit
carries where it came from.

One version per repository contributes: the one the reader is in, else that
repository's default. Searching every version returns each page as many times as
there are versions.

## useDuxtBreadcrumb(path)

The trail from the section down to a page, as data. `DuxtBreadcrumb` draws it
and the page emits the same one as `BreadcrumbList` JSON-LD — computing it twice
is how the drawn trail and the structured one would come to disagree.

## useDuxtSiteUrl()

`{ origin, absolute }`. The site's own origin, read from `i18n.baseUrl`, and
paths made absolute against it. Where it is unset, `absolute()` hands the path
back unchanged.

## useDuxtPageFocus()

Returns a ref to put on the page's `<h1>`. After a client-side navigation Vue
Router leaves focus where it was, so the next Tab continues down the sidebar and
a screen reader is told nothing about the page that arrived. Not on the first
paint — taking focus there would scroll past the header before the reader has
seen it.

## onDuxtShortcut(match, run) / duxtShortcuts

One place that knows which keys the theme listens to. `duxtShortcuts` is the
list the `?` sheet draws; `onDuxtShortcut` binds one, with the guard every
shortcut needs — nothing fires while the reader is typing.

## sourceFilePath(stem, prefix, folder) / sourceEditUrl(url, ref, file)

From a page back to the file it was written in, and to the URL that opens it for
editing. Pure functions: this is string arithmetic over three moving pieces —
the URL prefix, the numbered folder names and the source's docs folder — and the
only way that stays right is a test rather than a click.

`stem` is used rather than `path` because the URL has the numbered prefixes
stripped: `1.guides/2.add-a-body` renders at `/guides/add-a-body` and cannot be
turned back into a file name.

GitHub and GitLab are spelled differently and every other host draws no button
at all — a wrong link is worse than none.

## nearestPages(wanted, candidates)

The pages a reader most likely meant, for the 404. Scored on the **segments**,
not on the whole string: `/duxt/guide/deploying` and `/workflows/guide/deploying`
are one segment apart and read as the same page in another place, which edit
distance over the raw text would rank far below a page that merely shares
letters.
