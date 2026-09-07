---
title: Devtools
description: Ten panels that show what your sources became. Dev only.
icon: lucide:wrench
---

`sources` is a compact list. What the site serves is a set of collections, URL
prefixes, redirects, message catalogues and a download cache the build computed
from it — and until this tab existed, the only way to see any of that was to
read the code that produces it.

## Opening it

Run the dev server and open Nuxt Devtools (`Shift` + `Alt` + `D`, or the button
in the corner). The tab is called **duxt**; the panels sit behind the tab row at
the top of it. The same pages answer directly under `/_duxt/devtools` if you
would rather have them in their own window.

::callout{type="danger" title="Never registered in a build"}
The panels expose the resolved config, the file system paths behind it and a
button that deletes a cache directory. None of that is anybody's business in
production, which is why `modules/devtools.ts` returns before registering
anything outside a dev server — the route does not exist in a build, rather
than existing and refusing.
::

## The panels

::page-cards
::

## About the previews on these pages

Every panel below is embedded as it renders — not as a screenshot. The pages run
the panels' own rendering functions over a fixture site and save the result, so
a panel that gains a column gains it in this documentation in the same commit.

That fixture site is one imagined project: `acme/sdk` published at two versions
(`v2` from `main`, `v1.9` from a tag) in English and German, plus `acme/cli` at
one. It has deliberate gaps — a guide the old version predates, two pages the
translation has not caught up with, a page with no frontmatter — because a panel
with nothing to report teaches nobody what it looks like when something is
wrong.

The previews are inert: their tabs move between panels, and everything else —
the editor links, the drop button, the search form — does nothing.
