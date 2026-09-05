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

## DuxtVersionBanner

The visible half of the version problem. `canonical` and `noindex` tell a
crawler which version to serve; they tell the reader nothing. Someone who
arrived on `v0.7.0` from a search result sees documentation that looks exactly
like today's.

It distinguishes **four** cases, because "not the default" is not one thing:

| Case         | What the reader is told                                | Rule  | Upgrade link |
| :----------- | :------------------------------------------------------ | :---- | :----------- |
| `current`    | Nothing — no banner                                      | —     | —            |
| `upcoming`   | The documentation and features may still change          | sky   | No           |
| `old`        | Consider upgrading your project to the current version   | amber | Yes          |
| `deprecated` | This version is no longer updated; upgrade               | red   | Yes          |
| `eol`        | This version receives no further changes                 | red   | Yes          |

It is drawn as a `Callout`, in the same quiet style and the same palette. The
first version of it invented a second notice style — a full coloured border over
a tinted surface, beside a callout three paragraphs below it — and two notice
styles on one page is one too many. A reader learns what a bordered panel means
once.

::callout{type="warning" title="Upcoming is not old"}
A version can be off the default because it has not happened yet, and telling
that reader to upgrade is exactly backwards. `isDefault` cannot tell the two
apart — semver can, where both names are versions, and where they are not (a
branch beside a tag) `status: 'upcoming'` is the maintainer's to state. Guessing
is what once made `v0.7.0` offer itself as an upgrade over `main`.
::

## DuxtCopyPage

The top action, beside the page title: **Copy page**, with a menu holding *View
as Markdown*, *Open in ChatGPT* and *Open in Claude*.

All four hand over the **Markdown**, not the rendered page — a model given HTML
has to undo a layout to find a heading, and one given the source reads what the
author wrote. The two model links open with a prompt pointing at
`…/this-page.md`, which the layer serves.

It sits with the title rather than under the article because it is what a reader
does with a page *before* reading it, and a control for that at the bottom is a
control nobody finds.

## DuxtPageInfo

Provenance, under the table of contents in the right-hand column: **Edit this
page**, when it last changed, and who wrote it.

Everything is derived. The `sources` entry carries the repository, the ref and
the folder; the page carries its own file name and, where git could be asked,
its history. A consumer gets an edit link by declaring nothing — see `origin` in
the sources reference for a source read off disk.

::callout{type="warning" title="A remote source has no history"}
Content downloads a remote repository as an archive, not as a clone, so a page
from another repository gets no date and no contributors — rather than a guessed
one.
::

## DuxtPageFeedback

"Was this page helpful?", at the foot of the article.

**Nothing is stored and nothing is sent.** The answer lives in the component's
own state for the length of the visit and nowhere else: the layer has no
business knowing where your analytics live, and a documentation theme that
phones home by default is not one to publish. A consumer that wants the answer
kept listens for it, or replaces the whole block through the slot:

```vue
<DuxtPageFeedback @feedback="(helpful) => track(helpful)" />
```

| Slot      | Props                | What it replaces      |
| :-------- | :------------------- | :-------------------- |
| (default) | `answered`, `answer` | The whole block       |

## DuxtSkipLink

The first focusable element on the page, `sr-only` until focused. Without it
every page change means tabbing through the header, the section row and the
whole sidebar before the first word of the text.

## DuxtProgress

A two-pixel rule under the header showing how far down the page the reader is.
`aria-hidden` — it says nothing a screen reader cannot already ask the document.

## DuxtShortcuts

The keyboard-shortcut sheet, opened with `?`. Its list is the same array the
handlers match against, so it cannot advertise a key nothing binds.

| Keys   | What it does              |
| :----- | :------------------------ |
| `⌘ K`  | Search the documentation  |
| `?`    | Show the shortcut sheet   |
| `[`    | Previous page in section  |
| `]`    | Next page in section      |

No shortcut fires while the reader is typing.

## OgImage/Duxt.satori

The Open Graph image template, rendered by satori. Replace it with your own
`app/components/OgImage/Duxt.satori.vue`; pages go on asking for `'Duxt'`.

The `.satori` in the file name is not decoration — nuxt-og-image reads the
renderer out of it and ignores a template that does not name one.
