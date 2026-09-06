---
title: Ship the layer without owner-specific links
description: Every default that would name a specific project — repository, issue tracker, community, imprint — ships empty.
status: accepted
date: 2026-09-06
---

## Context

A documentation theme draws several rows of links: icon links in the navbar, a
community block beside the table of contents, legal links in the footer, buttons
on the landing page. Filling them with the theme's own project makes a
demonstration site look finished — and hands every consumer a "star this
repository" button that stars somebody else's work, a community that is not
theirs, and an imprint that is legally wrong for them.

The footer's legal row settled the principle first, because a German site must
show an imprint and it is unmistakably not the template's to provide.

## Decision

Any default that would name a specific project or organisation ships **empty**.
The theme's own links live in the consuming site's config, where they are an
example rather than a default. Generic chrome that names nobody — a column
heading, a "read the docs" action — stays in the layer.

## Consequences

A stranger extending the layer gets an empty row rather than a wrong one, and an
empty row is visibly missing while a wrong link looks correct.

The demonstration site carries more configuration than a minimal consumer needs,
and that is the site's job: it is the worked example of every row a consumer has
to fill.

The layer's own message keys stay behind when its links leave, and those keys are
internal. A consumer reaching into them would depend on a name that may be renamed
without a major release, and a missing key prints as the key — so the break would
reach a reader before it reached a build. Consumers write their own strings; the
[configuration page](/getting-started/configuration) says how.
