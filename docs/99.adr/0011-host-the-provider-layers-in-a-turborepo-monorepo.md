---
title: Host the provider layers in a Turborepo monorepo
description: The layer moves to packages/duxt and the site to apps/www, every published package versions and tags on its own as <name>@vX.Y.Z, and the own-repository decision recorded in #74 and #75 is superseded.
status: accepted
date: 2026-09-15
---

## Context

#74 and #75 each decided that the official search providers ship as
independently published companion layers **in repositories of their own** —
`@kirchdev/duxt-typesense`, `@kirchdev/duxt-meilisearch`. Neither repository
exists, and in this estate a new open-source repository is not one command
away: it is provisioned through OpenTofu and then carries the full meta layer of
its own — workflow stubs, release-please, Dependabot, CodeQL, a licence, a
README and an agent config. That is the standing price of two thin adapters over
exactly one build-time hook.

The contract both consume, `duxt:search:records`, lives in this repository.
Split across three, every change to it becomes a release dance — bump the layer,
publish, widen each provider's range, publish — with no single gate that runs
the hook against a consumer. The development site could not exercise a provider
without depending on a published version of it.

The repository was also shaped for exactly one package: its root **was** the
layer, so thirty build-time modules sat flat beside the meta configuration, held
apart from it only by a `files` allowlist.

## Decision

**One repository, a pnpm workspace driven by Turborepo.**

- `packages/duxt` is `@kirchdev/duxt`. Its build-time modules move out of the
  flat root into topic folders under `build/` — `sources/`, `sections/`,
  `bruno/`, `openapi/`, `search/`, `content/`, `og-image/`, `git/`, `config/`,
  `cli/` — and the `files` allowlist shrinks to directories. The `exports` map
  keeps every subpath name it had.
- `apps/www` is the site that develops the layer, with the checks that read its
  build.
- The root is not a package. It keeps the workspace and meta configuration and
  `docs/`, which `apps/www` publishes.
- Provider packages land beside the layer as `packages/duxt-typesense` and
  `packages/duxt-meilisearch`, with #74 and #75.

**Every published package is its own release unit.** release-please runs in
manifest mode with one entry per package, each with its own version and
changelog, and a release publishes only the packages it bumped. A shared version
was rejected because it republishes unchanged packages under a new number.

**Every package tags `<name>@vX.Y.Z`, the layer included** —
`include-component-in-tag` with `tag-separator: "@"`, so `duxt@v0.5.0` stands
beside `duxt-typesense@v0.1.0`. The version itself stays a bare number in
`package.json` and on npm. The plain tags `v0.1.0`…`v0.4.0` stay as they are, and
`last-release-sha` points at `v0.4.0`'s release commit once, so release-please
finds the layer's previous release despite the new tag pattern.

**The layer's changelog stays at the repository root**, as `changelog-path:
"/CHANGELOG.md"`. The site publishes the changelog of each version it serves,
read at that version's own checkout, and every existing tag keeps the file
there. Moving it into the package would have left every earlier edition without
its release pages. A provider's changelog lives in its own directory; it has no
history to preserve.

**duxt's own tag-based versioning learns component tags**, and has to land
before the first release after the move. `latest`, release discovery and the
switcher's order read `<name>@vX.Y.Z` as they read `vX.Y.Z`; the label and the
URL segment show the version alone; and a source can name a `tagComponent` to
restrict itself to one package's tags, plain tags still counting as its earlier
history. Without it, `apps/www`'s `latest` would have stayed on `v0.4.0` after
`duxt@v0.5.0` with no build failing.

**Publishing is decided by the registry.** A package is published when its
version has a `<component>@v<version>` tag and npm does not have that version.
The central `_publish-npm.yml` publishes the repository root, and the central
`_release-please.yml` forwards only the root package's outputs, so the publish
jobs are the repository's own until the central bodies take a working directory.

**Providers peer-depend on `@kirchdev/duxt` with a wide range, `>=0.4.0 <1`**,
the lower bound being whatever the provider first needs — never `^0.x`, under
which every provider would have to release on every layer minor. The monorepo's
gate is what proves compatibility, and the lower bound rises only when the hook
contract changes incompatibly.

**Turborepo's cache is local only** — no remote cache, no account, no token. A
task is cached only where its declared inputs determine its result: the unit
tests are, while the typecheck, the build and every check that reads a build
resolve `latest` against a remote and are not.

## Consequences

The "own repository" decision recorded in #74 and #75 is superseded; those
issues build their provider packages here instead.

Every layer-relative path moved, and none of them resolves the way it reads, so
the move is only as good as its verification: the full gate, a Workers build
with the route classification check, and the packed tarball installed into a
scratch consumer.

A change to the hook contract and to its consumers now lands in one pull request
behind one gate, and the development site can take a provider as a workspace
dependency.

A monorepo that tags with release-please can point duxt at its own tags, which
makes the prefixed-tag support a consumer feature rather than this repository's
convenience.

Paths in the earlier records describe the layout of their time. They are not
rewritten, because these records are append-only.
