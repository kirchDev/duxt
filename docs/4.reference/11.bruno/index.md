---
title: Bruno collections
description: A Bruno collection, published as request-centred reference pages with a downloadable archive.
icon: lucide:send
---

Point a source at a directory of `.bru` files and duxt builds a reference out of
it — an overview, a page per folder, a page per request — and an archive of the
collection built from the exact version and language on screen.

It is deliberately **thinner than [the OpenAPI reference](/reference/openapi)**,
because a Bruno collection is thinner. It is a client artefact: requests,
folders, headers, bodies, scripts and environments, with no response schemas, no
reusable components and no statement of what a field means. These pages say what
the collection says and invent nothing — which is why duxt does not convert
Bruno to OpenAPI on the way past, where the conversion would make the thinness
invisible rather than honest.

::page-cards
::
