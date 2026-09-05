---
title: What the build checks
description: The silent failures this layer had, turned into messages.
icon: lucide:shield-check
---

Every bug this layer actually had was quiet: a collection Content dropped
because its name was not a JavaScript identifier, a page that 404ed because a
link had gone stale, a navigation that came back empty. None of the three said
anything — the build was green and the site was wrong.

Four checks run in every build.

## Errors

An error is something whose cost is a page nobody can reach, and which no amount
of reading the site would explain.

::field-group
::field{name="empty collection"}
A source whose `path` or `refs` produce no files. The symptom without this is an
empty sidebar and a 404 on every page of one version.
::
::field{name="shadowed folder"}
A docs folder named like a repository or a version segment. With a prefix
active, `/workflows` could be any of the three — the prefix wins, so the folder
is simply unreachable. Rejected rather than resolved silently.
::
::

## Warnings

A warning is something that still renders, and which a remote source can grow
between releases without that being this build's fault.

::field-group
::field{name="broken link"}
An internal link, or an anchor, that no page serves. Resolved exactly as the
page resolves it at render time — against its own source's prefix.
::
::field{name="thin frontmatter"}
A page with no `title` or no `description`. Neither breaks anything; both
quietly degrade the table of contents, the OG image and `llms.txt`.
::
::

## Where the check reads from

Content's own parse cache, not the `content:file:afterParse` hook.

The hook is the obvious seam and the wrong one: Content skips the parse for
every file whose checksum is unchanged, so on the second build it fires for
nothing and a validator built on it reports an empty site. The cache holds the
parsed document either way — remote sources included, which is the other half of
why: Content downloads a repository into `.data/content/` and nothing else on
disk describes what came back.

## Accessibility

`pnpm check:a11y` runs axe-core over one page of each **kind** — the landing
page, a section root, a deep page, an older version and the 404 — after the site
has been built. It is the last step of `pnpm check`.

The pages are parsed with jsdom, which has no layout engine, so the rules that
need geometry or computed colour (`color-contrast`, `target-size`) cannot run
and are reported as skipped rather than passed. What does run is the structural
half — landmarks and their labels, button and form names, image alternatives,
heading order, ARIA validity, the document's language — and that is the half a
redesign breaks.

A browser-driven check would cover the rest and costs a Playwright download in
every CI run. The contrast question is answered once, by measurement, in
`duxt.css`.

## The devtools tab

In development, the **duxt** tab shows the resolved sources: which collection
serves which prefix, at which ref, in which state, and which segments each one
may not use as a folder name.

`sources` is a compact list you write; what the site serves is what the resolver
computed from it. Until this tab, the only way to see that was to read the code
that produces it.
