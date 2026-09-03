---
title: Deployment
description: Where a duxt site can run, and what it needs there.
icon: lucide:cloud-upload
---

A duxt site is a Nuxt application. Anything that runs Nuxt runs it.

## Static

`nuxt generate` produces a folder of HTML. This is the right default for
documentation: no server, no runtime cost, and every page is cached at the
edge.

::package-managers{command="run generate"}
::

::callout{type="warning" title="Remote sources are read at build time"}
A site reading another repository's `docs/` picks up changes when it builds,
not when they are pushed. Rebuild on a schedule, or trigger it from the source
repository.
::

## Server

`nuxt build` produces a Node server, which you need if pages must react to a
request — a private repository behind an auth check, for instance.

## What the build needs

- **Node 24.** The layer uses `node:sqlite` rather than a native driver.
- **Network access to your sources**, if any of them are remote repositories.
- **A token**, for private ones. Content reads it from the collection's `auth`.

## What the site serves besides pages

| Path        | What it is                                                        |
| :---------- | :---------------------------------------------------------------- |
| `/llms.txt` | The documentation as a Markdown index, per llmstxt.org             |
| `/mcp`      | An MCP server over the same content — `list_pages`, `search_docs`, `read_page` |

Both are generated from the collection the pages render from, so neither can
drift from what is published.
