---
title: Build duxt as a layer carrying a module
description: Distribute the theme as a Nuxt layer whose root is the package, rather than as a starter template.
status: accepted
date: 2026-09-06
---

## Context

A documentation theme can be distributed two ways. A **starter template** is
scaffolded into the consumer's repository, where every file is theirs to edit and
no improvement ever reaches them again except as a diff somebody applies by hand.
A **layer** stays a dependency: the consumer extends it, overrides the files they
disagree with, and takes the rest of the improvements with a version bump.

Some of what the theme has to do is not something a layer can express as files.
Generating collections, resolving a source list into URL prefixes, turning
frontmatter into route rules and validating the result are build-time work, and
build-time work in Nuxt is a module.

## Decision

We distribute duxt as a **Nuxt layer that carries its own modules**, consumed with
one `extends` entry. The repository root *is* the layer: the Nuxt config, the
content config and `app/` sit at the root, and the package manifest points at
them, so `extends: ['@kirchdev/duxt']` resolves without a build step. The
consuming site lives beside it in the same repository and is the development
target.

## Consequences

A consumer inherits theme, pages, components, config defaults and collections,
and overrides any of them by creating a file of the same name. Upgrading is a
version bump.

Nothing layer-relative resolves the way it reads. A path written in the layer is
read from the consumer's directory unless it was resolved against the layer's own
location, and the `@` alias belongs to whoever extends the layer, not to the
layer — so the layer's own imports need an alias of their own. This has cost
real bugs, and it is the price of the arrangement rather than an oversight.

Overridable names become a public surface. A component, page or config key a
consumer can shadow is a name they depend on, so renaming one is a breaking
release, and the documented surface is what pins it.

The development site and a starter template are separate artifacts. The site
beside the layer wants edge cases, ugly frontmatter, several sources and a tag to
read from; a stranger cloning a starter wants the opposite. Conflating them would
make one of the two bad.

## Alternatives considered

**A starter template.** Total freedom for the consumer, no upgrade path for
anybody — the reason the layer won.

**A module without a layer.** A module can register components and routes, but the
theme's substance is files a consumer must be able to shadow, and shipping those
through a module means injecting them rather than letting Nuxt's own layer
resolution do it.
