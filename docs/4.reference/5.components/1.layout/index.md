---
title: Layout
description: The two components that frame a page — the navbar and the footer.
icon: lucide:layout-panel-top
---

What surrounds the documentation on every page. Neither takes a prop: they read
[`useDuxtConfig()`](/reference/composables/config-and-content/use-duxt-config),
so what they draw is what the config says.

The row of sections under the navbar is
[`DuxtSections`](/reference/components/navigation/duxt-sections), filed with the
navigation — it names the parts of the documentation tree, which is navigating,
not framing.

::page-cards
::
