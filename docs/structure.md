---
title: Where your docs live
description: The two ways a project can carry a documentation site.
---

# Where your docs live

Your Markdown stays in `docs/` at the root of your repository. Where the _site_
lives is a separate question, and there are two answers.

## The site lives elsewhere

Your repository holds nothing but Markdown — no Nuxt, no `package.json`, no npm
dependencies. A separate site reads `docs/` straight from git, at a branch or at
a tag. This is the only sane option for a Go, PHP or Rust repository, and it is
what lets one site serve many projects.

## The site lives beside your docs

A folder in the same repository holds the site, and `docs/` stays at the root
where a reader on GitHub expects it. Sensible when the repository is JavaScript
anyway and the docs deploy together with the code. That is the arrangement this
repository itself uses: `docs/` here, `www/` beside it.

In both cases the layer resolves `docs/` against the **repository** root, not
against the directory the site happens to run in.

## Components in Markdown

Content ships MDC, so a Markdown page can call a Vue component with block
syntax — no MDX, no extra module:

::callout{type="tip" title="This is a callout"}
It is a Vue component, called from Markdown, rendering Markdown inside itself.
::

The block above is written as `::callout{type="tip" title="…"}`, the body, then
a closing `::`. Any component in `components/content/` is available this way,
including your own.
