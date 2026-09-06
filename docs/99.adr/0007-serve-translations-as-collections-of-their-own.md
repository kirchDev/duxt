---
title: Serve translations as collections of their own
description: Add a locale dimension to a source rather than a locale segment to the content path.
status: accepted
date: 2026-09-06
---

## Context

The layer translated its interface in seven locales and served one set of pages
to all of them: `useDuxtPath()` stripped the locale segment before every content
lookup, so `/de-DE/guides/deploying` and `/guides/deploying` resolved to the same
file. Content v3 has no notion of a locale — a collection is one tree — so
translated pages needed a decision rather than a setting.

What the comparable generators do was read rather than assumed. Starlight,
VitePress, Docusaurus and MkDocs all put translations in a folder per language;
only Starlight has a documented fallback for a page a language is missing.
Beyond a certain size the translation leaves the tool entirely: React runs
`de.react.dev` as its own repository, Vue an entire `vuejs-translations` org,
because translators work to their own schedule and review. OpenCode built an
agent that translated its docs in CI, ran it, and switched it off; seventeen
languages have stood still since.

Cost was measured before the shape was chosen: builds over 1 … 200 collections
scale linearly at roughly 2.2 s and 0.63 MB of database each, with no knee. The
matrix does not have a ceiling that would force the design's hand.

## Decision

A source gains a `locales` list, and so does a ref, resolved as `status` already
is (`ref.locales ?? source.locales`). A string is a folder inside the source's
`path`; an object moves that language to its own folder, repository or ref.

**The default locale is the tree in `path` itself, without a folder**, so adding
the key moves no URL a site already serves.

**The locale is not part of the content path.** It belongs to i18n's routing,
which puts it in front of the path anyway. Original and translation therefore
live under identical content paths in separate collections.

A page missing from a language falls back along a chain — the locale, its base
language, a sibling region, vue-i18n's `fallbackLocale`, the untranslated
original — and the reader is told, in a banner, which language they are being
shown.

## Consequences

Every path comparison in the theme is untouched: navigation, redirects, the
breadcrumb, the 404's nearest-page scoring and the language switcher all keep
working on a path that never carried a locale. The fallback is one more query
for the same path rather than a redirect or a second resolution scheme.

`useDuxtNavigation` and the search follow `useDuxtCollection`, so both became
locale-aware without being changed.

A site that sets nothing gets exactly what it had: one collection named `docs`,
one entry in the manifest, one query per page.

Two configurations can now disagree in a way that produces an empty page rather
than an error — `content.config.ts` resolves the default locale without access
to the Nuxt config. The duxt module therefore checks `sourceOptions.defaultLocale`
against `i18n.defaultLocale` and fails the build when they differ, instead of
injecting one into the other and leaving Content computing the other answer.

Translations multiply collections, and the build pays for each linearly. The
figure belongs in the documentation, because a consumer decides the matrix.

Partials are not translated. `_partials/` is one collection shared across
sources, and a language folder's own partials are excluded rather than
colliding by name with the original's.

## Alternatives considered

**A locale segment in the content prefix.** Symmetric with `repo` and `version`,
and it would have forced every path comparison in the theme to learn about
locales — for a URL that i18n already prefixes, which would then be spelled
twice.

**A file suffix — `installation.de-DE.md` beside the original.** No collection
multiplication, and it fails the case the big projects actually have: it forces
the translation into the same repository and the same ref as the original.

**404 for a missing translation.** What VitePress does by omission. It punishes
the reader for a gap the writer left, and it hides from everyone else that the
translation is incomplete.
