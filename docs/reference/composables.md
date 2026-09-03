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
