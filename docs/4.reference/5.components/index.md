---
title: Components
description: The layer's own components, one page each — what each is for, and what it takes.
icon: lucide:component
---

Every component here is **shadowable**: a file of the same name in your project
replaces the layer's, with no configuration. A name documented here is part of
the public surface, so it will not be renamed without a major release.

The pages are grouped the way the theme is: the chrome around a page, the
navigation through it, and the components that belong to the page itself.

::page-cards
::

::callout{type="tip" title="Replace as little as possible"}
Before shadowing a component, check whether a config key, a slot or a CSS token
already does what you need — see
[Override the theme](/guides/override-the-theme). A replaced file stops
receiving the layer's fixes.
::
