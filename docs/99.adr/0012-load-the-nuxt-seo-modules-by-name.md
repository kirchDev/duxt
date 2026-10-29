---
title: Load the Nuxt SEO modules by name
description: The layer drops the @nuxtjs/seo bundle and loads the seven modules it uses by name, because the bundle's v6 adds modules that duplicate the layer's own llms.txt, Markdown and MCP surface. Supersedes how ADR-0009 installs them, not which.
status: accepted
date: 2026-10-29
---

## Context

ADR-0009 took the SEO stack from `@nuxtjs/seo`: robots, sitemap, OG image,
schema.org, the SEO utilities, the link checker and site config, installed
through one bundle that "contains no logic of its own".

Version 6 of the bundle installs two more modules. `nuxt-ai-ready` serves
`llms.txt`, `llms-full.txt`, Markdown versions of every page and its own MCP
tools — the surface this layer exists to provide, across sources, versions and
languages. Loaded beside the layer's own, it claims the same routes, and its MCP
tools need a database the layer does not ship: the build fails asking for
`drizzle-orm`. `nuxt-skew-protection` arrives with it, unasked.

A site that extends the layer inherits every module the layer loads. A bundle
that grows with each major therefore grows every consumer, without the layer
having decided anything.

## Decision

The layer depends on the seven modules ADR-0009 chose and loads them by name, in
the order the bundle installs them — `@nuxtjs/robots`, `@nuxtjs/sitemap`,
`nuxt-link-checker`, `nuxt-og-image`, `nuxt-schema-org`, `nuxt-seo-utils`,
`nuxt-site-config` — still before `@nuxt/content`, for the sitemap's Content
integration.

Which modules and how they are configured stays as ADR-0009 decided. Only the
installation changes: by name instead of through the bundle.

## Consequences

The layer carries seven dependencies where it carried one, and their versions
have to move together; the bundle's own version checks used to say when they did
not. A new module of the Nuxt SEO family reaches the layer only when someone adds
it on purpose.

The shared devtools panel lists the bundle's modules the layer does not load as
missing. That is the panel's view of the bundle, not a fault of the site.

## Alternatives considered

**Keep the bundle and switch `nuxt-ai-ready` off.** One line, and it builds. It
was rejected because the next module the bundle adds would again reach every
consumer silently, and `nuxt-skew-protection` would still arrive.

**Replace the layer's own llms.txt, Markdown and MCP routes with
`nuxt-ai-ready`.** It would give up what the layer adds over it — sources,
versions and languages in every one of those surfaces — for less code.

**Stay on the bundle's v5.** It holds the sitemap on its old major as well, and
only postpones the same decision.
