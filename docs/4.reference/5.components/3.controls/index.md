---
title: Controls
description: What a reader operates — search, the switchers, the shortcut sheet, and two indicators.
icon: lucide:sliders-horizontal
---

Each of these is a control the reader works, or a state they read, rather than a
part of the page's structure. None takes a prop: they read
[`useDuxtConfig()`](/reference/composables/config-and-content/use-duxt-config)
and render nothing when the config gives them nothing to offer.

That last part is the pattern worth knowing before replacing one. A switcher
with a single choice is not a switcher, so `DuxtVersion` draws a badge and
`DuxtLocale` draws nothing at all — a single-locale site never learns that duxt
speaks seven languages.

::page-cards
::
