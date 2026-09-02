---
title: duxt
description: A Nuxt documentation layer on Content v3 — the idea, and what is built so far.
---

# duxt

A Nuxt layer that turns a repository's `docs/` folder into a documentation
site. Extend it and the folder is served; point it at other repositories, or at
tags of the same one, and those become versions.

> Nothing here is decided yet. The layer exists as a skeleton, the theme does
> not, and whether this carries a public project is still an open question.

## The shape of it

The repo root **is** the layer. `www/` beside it is the site that consumes the
layer, the way a downstream project would — which is also how this page is
being served to you right now: through the layer's own `docs` collection,
reading the folder you are reading.
