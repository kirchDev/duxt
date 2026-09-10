---
title: Overview
description: Explore an invented freight API and a sample changelog, rendered as generated sections in one demo area.
icon: lucide:book-open-text
---

This area shows how duxt turns different source files into pages. The API
reference and demo changelog share this area's section row, while each uses
the layout suited to its content.

Harbour is an API this site made up. It moves consignments through berths, it
has four versions, and — one endpoint aside — nothing answers on any of them.

It exists to be **rendered**: every construct OpenAPI 3.1 has that is awkward to
draw is somewhere in these documents, so the reference pages duxt builds are
exercised by a real build rather than described in a test.

The demo changelog is a separate fixture, with feature, fix and breaking-change
entries and several heading levels. Compare its release pages and version
sidebar with the same file rendered as one continuous page. These sample
versions are not releases of the duxt package.

## Where to start

- [Demo Changelog](/demo/changelog) — a release overview, with a page per
  version and a version sidebar.
- [Changelog as one page](/demo/changelog-flat) — the same release history,
  showing the flat changelog layout.
- [The reference](/demo/api) — the overview, then a page per tag and a page per
  operation.
- [Book a consignment](/demo/api/consignments/createconsignment) — two request
  bodies, a callback and a `Location` header.
- [Book a demo consignment](/demo/api/demo/echoconsignment) — **the one
  operation that is real.** A route in `www/server/` answers it, so the try-it
  client sends a request from your browser and gets a `201` back.

::page-cards
::
