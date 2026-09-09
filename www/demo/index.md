---
title: Overview
description: An invented freight API, published from four OpenAPI documents that sit beside this page.
icon: lucide:book-open-text
---

Harbour is an API this site made up. It moves consignments through berths, it
has four versions, and — one endpoint aside — nothing answers on any of them.

It exists to be **rendered**: every construct OpenAPI 3.1 has that is awkward to
draw is somewhere in these documents, so the reference pages duxt builds are
exercised by a real build rather than described in a test.

## Where to start

- [The reference](/demo/api) — the overview, then a page per tag and a page per
  operation.
- [Book a consignment](/demo/api/consignments/createconsignment) — two request
  bodies, a callback and a `Location` header.
- [Book a demo consignment](/demo/api/demo/echoconsignment) — **the one
  operation that is real.** A route in `www/server/` answers it, so the try-it
  client sends a request from your browser and gets a `201` back.

::page-cards
::
