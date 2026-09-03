---
title: Layer components
description: The chrome you can replace by dropping a file of the same name.
icon: lucide:layout-panel-left
---

Every component below lives in the layer's `app/components/`. Nuxt resolves a
consumer's own file of the same name first, so replacing one is creating it —
no configuration, no slot to thread a value through.

::callout{type="tip" title="Configure before you replace"}
Most of what these render comes from `app.config.ts`. Replacing a component to
change a label is more than the job needs.
::

## DuxtHeader

The navbar: title, version badge, navigation with dropdowns, search, version
switcher, icon links, theme toggle, and the mobile sheet holding all of it.

Reads `title`, `version`, `navigation`, `links` from the config.

## DuxtSections

The second navbar row — one entry per `sections` item. Hidden below `lg`,
where the mobile sheet lists the same entries.

## DuxtNavigation

The docs tree in the sidebar. Groups collapse; the group holding the current
page opens on every navigation.

| Prop    | Type                      | What it does                    |
| :------ | :------------------------ | :------------------------------ |
| `items` | `ContentNavigationItem[]` | The branch to render            |

## DuxtNavigationLink

One entry in that tree. Recurses back into `DuxtNavigation` for a nested group.

## DuxtToc

The right column: the page's own headings, with the current one marked, and
the fixed `aside` links below them.

| Prop    | Type                                            | What it does |
| :------ | :---------------------------------------------- | :----------- |
| `links` | `{ id, text, depth, children? }[]`              | Page headings |

## DuxtBreadcrumb

The trail from section to page. Switched off with `breadcrumb: false`.

| Prop   | Type     | What it does                  |
| :----- | :------- | :---------------------------- |
| `path` | `string` | The page to build a trail for |

## DuxtPageNav

Previous and next, bounded to the current section.

| Prop   | Type     | What it does        |
| :----- | :------- | :------------------ |
| `path` | `string` | The current page    |

## DuxtSearch

The ⌘K dialog. Fetches the index on first open.

## DuxtVersionSwitcher

Shown when `versions` holds more than one entry. Keeps the current page and
swaps its version prefix.

## DuxtCodeBlock

The card around a code fence: filename bar, language icon, copy button.

| Prop       | Type     | What it does                                      |
| :--------- | :------- | :------------------------------------------------ |
| `code`     | `string` | Raw source, for the copy button and as a fallback |
| `language` | `string` | Picks the icon when there is no filename           |
| `filename` | `string` | Shown in the header, picks the icon                |

## DuxtFooter

Columns, the note, and the legal row a consumer fills. The layer ships the row
empty on purpose: an imprint belongs to whoever runs the site.
