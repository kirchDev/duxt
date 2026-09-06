---
title: Rebuild on a schedule rather than refresh at runtime
description: A site reading another repository picks up its changes when it builds, and no runtime refresh is offered.
status: accepted
date: 2026-09-06
---

## Context

A site that reads documentation out of other repositories has an obvious wish:
pick up a push without a deploy. Content, however, downloads a remote repository
during the build and compiles it into the database the build ships. Refreshing
that in a running server would mean rebuilding the database in place — for which
Content offers no supported path, and the only route available is the same
client-side database the search reads.

## Decision

Content is read at build time and never refreshed at runtime. A site whose sources
have moved on is rebuilt: on a schedule, or triggered from the source repository.

## Consequences

A deployment is immutable and a build is reproducible — the pages served are
exactly the pages that were compiled, and the same commit produces the same site.
Static output stays possible, which is the right default for documentation.

Documentation lags its source by the rebuild interval, and a source repository
that wants its docs live has to trigger the site's build. That is the cost, and it
is paid in operations rather than in the layer.

Nothing in the theme may assume it can re-read a source. A feature wanting fresher
content than the build has is asking for a different architecture, not for a
setting.
