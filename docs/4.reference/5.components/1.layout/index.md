---
title: Layout
description: The three components that frame a page — the navbar, the footer and the site notices.
icon: lucide:layout-panel-top
---

What surrounds the documentation on every page. The navbar and the footer take no
prop at all: they read
[`useDuxtConfig()`](/reference/composables/config-and-content/use-duxt-config),
so what they draw is what the config says.

The row of sections under the navbar is
[`DuxtSections`](/reference/components/navigation/duxt-sections), filed with the
navigation — it names the parts of the documentation tree, which is navigating,
not framing.

::page-cards
::
