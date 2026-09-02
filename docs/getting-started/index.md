---
title: Introduction
description: A Nuxt layer that turns a repository's docs folder into a documentation site.
icon: lucide:rocket
---

duxt is a Nuxt layer. You extend it, put Markdown in `docs/`, and you have a
documentation site — navigation, table of contents, theme and search included.

Where it differs from a template is what happens next: the same layer reads
`docs/` from **other repositories**, and from **tags** of them, so one site can
serve many projects at several versions without a collection declared by hand
for each.

::callout{type="warning" title="Early days"}
Nothing here is decided. The layer works, the theme is being built, and whether
this carries a public project is still an open question.
::
