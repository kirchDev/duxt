---
title: Build the theme on owned shadcn-vue components
description: The layer holds the source of its interface components rather than importing them from a component library or a ready-made documentation theme.
status: accepted
date: 2026-09-08
---

## Context

A documentation layer is mostly interface: a header, a sidebar, a table of
contents, code blocks, a search dialog. Something has to draw them, and the
choice of what decides how much a consumer can change without forking.

The layer's whole proposition is that it is extended rather than generated —
`extends: ['@kirchdev/duxt']`, and every file stays overridable. A theme whose
appearance is only reachable through the options its author thought to expose
would contradict that at the first thing a consumer wanted to look different.
Nuxt's layer resolution already gives a consumer file-level override for free, so
the question was what those files should be.

## Decision

The layer owns the source of its components. shadcn-vue is used as the source of
the primitives — its CLI writes a component's code into the repository, and from
that point the file belongs to the layer, not to a dependency. `components.json`
points the CLI at the layer's own alias, so adding a primitive is one command,
and Tailwind supplies the styling underneath.

The palette is CSS custom properties. Components read tokens and hold no colours,
which is what makes a one-line override reach every surface.

## Consequences

A consumer can change any part of the interface, at whatever depth the change
needs: redefine a token, shadow a component by name, or add a primitive of their
own. None of those requires a fork, and none waits on the layer to expose an
option for it.

The cost is maintenance. An upstream fix to a primitive does not arrive with a
dependency bump — it arrives when someone re-runs the CLI for that component. The
layer carries that for the primitives it ships; a consumer who overrides one
carries it from then on. That trade is what the override guidance is built
around, and it is the reason the guidance exists at all.

Vendored files that the CLI cannot reach are the sharp edge of the same trade: a
stylesheet with no registry item behind it can only be upgraded by downloading it
again, so local changes to it are lost silently rather than conflicting loudly.

## Alternatives considered

**A ready-made documentation theme.** Docus is the obvious fit — Nuxt Content's
own theme, and everything a documentation site needs on the first run. It was
rejected for the same reason it is attractive: the site it produces is its
author's, and reshaping it means either an option that exists or a fork. A layer
whose consumers were expected to look different from each other could not accept
that ceiling.

**A component library as a dependency.** Nuxt UI would have supplied the
primitives without the maintenance, and the layer would have tracked its releases
instead of copying its code. Rejected because a dependency's components can only
be changed as far as their props allow, and the layer would then have had to
invent a second override mechanism to cover the rest — with two of them, neither
would be the obvious one to reach for.

**Hand-written components with no upstream at all.** This removes the dependency
question entirely and was rejected on cost: accessible primitives are difficult
in exactly the places that are easy to get wrong, and a dialog or a combobox
written from scratch would be worse than one adapted from a source that already
solved it.
