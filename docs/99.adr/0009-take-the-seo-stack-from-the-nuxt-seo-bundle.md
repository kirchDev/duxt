---
title: Take the SEO stack from the Nuxt SEO bundle
description: The layer installs @nuxtjs/seo and hands it the head tags and structured data it used to write by hand, keeping only the rules that depend on versions and translations.
status: accepted
date: 2026-09-08
---

## Context

The layer already shipped three of Nuxt SEO's modules — robots, sitemap and OG
image — chosen one at a time as each need appeared. Everything they do not cover
was written by hand: a canonical link, an `og:`/`twitter:` block per page, and a
`@graph` of JSON-LD assembled in a template string inside `[...slug].vue`.

That worked and was invisible. Which is the problem: none of it was covered by a
test, because SEO lives in rendered HTML rather than in logic, and the repo's
tests deliberately cover pure logic only. The landing page — the one most likely
to be shared — had no social card at all, the error page could be indexed, and
seven locales shipped without a single `og:locale`. Each of those was an omission
nobody could see.

The hand-written half was also the half that grows. Structured data is a
specification with a large surface and its own validators; every node added by
hand is a node whose shape has to be got right by reading the spec.

## Decision

The layer depends on `@nuxtjs/seo` and loads it as one module, in the place the
three named modules used to sit — before `@nuxt/content`, because the sitemap's
Content integration says so.

The bundle is an alias, not a wrapper: its own documentation states it "contains
no logic of its own". What it buys is the four modules that were missing —
`nuxt-schema-org` for the graph, `nuxt-seo-utils` for the automatic canonical and
the derived social tags, `nuxt-link-checker`, and `nuxt-site-config` as the one
place `site.url` is read from — plus the shared devtools panel, which reports on
whichever of them are installed.

Three of `nuxt-seo-utils`' defaults are switched off, each for a reason the layer
cannot design away: `canonicalLowercase`, because a locale prefix is
case-sensitive and `/de-DE/` is not `/de-de/`; `fallbackTitle`, because a title
invented from a slug would mask the build validator that fails over a page
without one; and `mergeWithSiteConfig`, because `app.vue` owns the title
template.

What stays hand-written is what the modules cannot know: the canonical on a
versioned page points at the current version rather than at the page being
rendered, and `noindex` follows from a version being old or a page being served
in a language it was not translated into.

The link check reports rather than fails. `modules/validate.ts` already fails a
build over a link pointing nowhere, and it is the one that understands versions
and locale fallbacks.

## Consequences

Every consumer of the layer installs seven modules where it installed three. That
is the price of the decision and it is paid by sites that may use none of the
four new ones.

The rules that used to be claims in a comment are now assertions in
`scripts/check-seo.ts`, which reads the built pages and fails over a second
canonical, a missing `hreflang`, an indexable error page, or a graph that does
not parse. It runs in `check` beside `check:a11y`, for the same reason: the tags
exist only in rendered HTML.

Two of those rules could not be checked at all before, because they only exist
when the site knows its own origin, and `www` deliberately states no domain. The
check hands the built server its own address through the environment variables
the modules already read, rather than a domain committed to a config a consumer
would copy.

Publishing an `Organization` needs a fact the layer must not invent, so it waits
on a new `duxt.organization` key and stays absent until a consumer fills it in —
the same stance as ADR-0005.

## Alternatives considered

**Keep the three modules and add only `nuxt-schema-org`.** The narrowest change,
and it was rejected on the canonical: the version rule and the automatic
canonical have to be reconciled either way, and doing it without `nuxt-seo-utils`
means keeping the hand-written `og:`/`twitter:` block that had already been
forgotten on two pages.

**Write the structured data by hand and keep it.** It worked, it had no
dependency, and it was rejected because the graph was already the part most
likely to be wrong and least likely to be noticed — and because a second page
needing a second node would have meant a second copy of the site's identity
inlined into it.

**Let the link checker fail the build.** Rejected because two gates over one rule
means the looser one decides when a build breaks. The check that understands this
layer's versions and locale fallbacks is the layer's own.
