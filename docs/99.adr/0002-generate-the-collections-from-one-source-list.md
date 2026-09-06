---
title: Generate the collections from one source list
description: Compute Content collections from a compact sources list at config load time instead of having consumers declare them.
status: accepted
date: 2026-09-06
---

## Context

Nuxt Content sources a collection from a git repository at a branch or a tag,
authenticates against a private one and caches the download by hash. That was
verified by reading Content itself before any of this was built, and it means the
hard half of multi-repo, versioned documentation already existed and did not need
rebuilding.

What did not exist was the ergonomics. A site serving several versions of several
projects declares one collection per repository × ref, by hand: three versions
across fourteen repositories is forty-two declarations, and cutting a release
edits all fourteen. Content offers no hook for injecting collections either — but
it loads each layer's content config through c12, which means that file is
executed code rather than a data file, and may compute its collections when it is
loaded.

## Decision

Consumers declare a compact **list of sources** — a folder, optionally a
repository, optionally refs — in the site's own app config, and the layer's
content config computes one collection per source × ref from it at load time. The
same list is resolved a second time by the build into a manifest naming which
collection serves which URL prefix, and that manifest is what the theme reads.

## Consequences

The list is the length of the number of projects rather than the product of
projects and versions, and the single unversioned folder needs no configuration at
all.

The shorthand expresses less than a hand-written collection can, and always will.
That is survivable only because Content merges the content config from every layer
with the later one winning: a consumer who needs something the shorthand cannot
say writes their own file and takes over completely.

Several features stop needing configuration of their own, because a source
already names a repository, a ref and a folder — links back to the source, the
last-updated date and the contributor list all fall out of it.

Collection names become data. A site with two repositories has no collection
called `docs`, so nothing in the layer may name one, and the theme reads the name
out of the manifest instead. Code that hard-codes a collection name works on a
single-source site and breaks on every other one.

The collection paths are resolved against the layer rather than the consumer,
because Content records the layer that declared a collection as its root. The
layer therefore computes absolute paths, which is only possible because the config
is executed code — the same property the whole shorthand rests on.
