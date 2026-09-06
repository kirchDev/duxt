---
title: Decide the URL prefixes at build time
description: Whether a repository or version segment appears is settled by the source list before the first request, never per request.
status: accepted
date: 2026-09-06
---

## Context

A site built from several sources has to serve a repository segment and a version
segment in its URLs, and a site built from one folder must not — nobody wants
`/my-project/main/guides/deploying` for a project with a single unversioned docs
folder.

Making each segment optional per request does not work. With both optional, the
first segment of `/guides/…` could be a folder, a repository or a version, and
only looking up all three would say which. That ambiguity is not a routing
inconvenience; it makes a URL's meaning depend on what happens to exist.

## Decision

Each prefix is switched on **for the whole site, at build time, from the source
list**: a repository segment once more than one repository is published or a flag
forces it, a version segment once a source publishes more than one ref or a flag
forces it. One ref per repository is served with no version segment at all.

## Consequences

The shape of every URL is fixed before the first request, so the router never
guesses and a link written in a page can be resolved by a check in the build
rather than by trying it.

A single unversioned folder serves paths that betray nothing about repositories or
versions existing at all, which is what makes the simplest case free.

Turning a site from one source into two changes every URL it serves. That is a
migration, and the redirect machinery is what makes it survivable.

One collision is left and cannot be designed away: a docs folder named like a
repository or a version segment, where the prefix wins and the folder is
unreachable. The build rejects it with a message rather than resolving it silently
one way.

Because a page's own prefix is known only to the build, links inside pages are
written as bare documentation paths and resolved against the page's source when
they are rendered. A page that hard-codes its own prefix is correct on exactly one
site.
