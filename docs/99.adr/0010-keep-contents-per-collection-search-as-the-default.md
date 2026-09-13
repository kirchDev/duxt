---
title: Keep Content's per-collection search as the default
description: One index across every source was measured against Content's one-index-per-collection search and is not the layer's default; the build-time hook makes it a provider layer instead.
status: accepted
date: 2026-09-12
---

## Context

Search is one index per collection. `useDuxtSearch()` calls Content's
`useSearchCollection()` once per active source, which downloads that
collection's `sql_dump.txt` and builds an FTS5 index in the browser over WASM
SQLite. Three complaints follow from that one shape:

- **The payload grows with the model.** One dump per active collection, and
  collections multiply as sources × versions × locales. Multi-source is duxt's
  proposition, and search pays for it linearly.
- **Sources cannot be ranked against each other.** Each database ranks inside
  itself, so `interleave()` round-robins the per-source lists because position
  is the only comparable thing there is.
- **No typo tolerance in the primary path.** FTS5 matches terms and prefixes,
  never near-misses, so `useFuzzySearch()` carries a second index over the same
  sections and loads on every miss.

[Pagefind](https://pagefind.app/) answers all three in principle: a chunked
index a browser fetches a slice of, one ranked list with filters, and — as
Starlight's default — the closest peer's own answer. Its Node API takes records
rather than built HTML, so `addCustomRecord` consumes `duxt:search:records`
directly and the layer never has to require a rendering strategy of the sites
that extend it.

It was measured rather than argued about, over `www/`'s real content: 33
collections, 2,918 pages, **11,937 records** across five languages and four
versions. `scripts/search-index-bench.ts` is what the numbers below were
computed by, and `tests/search-index-bench.test.ts` pins the rule they were read
by.

### What the measurement found

**Payload — Pagefind wins, decisively.** An English reader's first query costs
**1,448 KB** today (1,108 KB of WASM SQLite and its worker, 340 KB of dumps
across the seven collections in scope) and every query after it is free. The
same query against one Pagefind index costs **150 KB**, and every query after it
**13 KB**. Even discounting the database engine entirely — Content loads it on
demand, and a client-side `queryCollection` on a route change can summon it too
— 340 KB against 150 KB, and the 340 KB is the half that grows with every source
a consumer adds while the 150 KB is not.

**Ranking — Pagefind wins, per language.** One index over every source returned
a single ranked list, and the filters came straight off the record contract with
no adaptation: `source` held `/`, `/demo`, `/demo/api`, `/demo/changelog`,
`/demo/changelog-flat`, `/demo/collection`, `/releases`, `/tf`, and `version`
held `main`, `v0.1.0`, `v0.2.0`, `v0.2.6`, `v0.3.4`, `v1.x`, `v2.x`, `v3.x`.
`interleave()` would retire — for the sources. It would not retire outright:
Pagefind indexes each language separately and selects one at runtime, its
documentation describes no way to search two together, and `mergeIndex` against
the same base path is skipped, so the language fallback an untranslated page
depends on still needs a second instance and two incomparable score spaces.

**Typo tolerance — Pagefind loses, and takes the fallback with it.** Pagefind
stems per language and has no fuzzy matching. `collecton` was salvaged by prefix
into 360 results; `verison` — a transposition — returned **three unrelated
pages**. That is worse than the FTS5 behaviour it replaces, because it is not an
empty result: `useDuxtSearch()` falls back to Fuse precisely when the exact pass
returns nothing, so three wrong answers are three reasons the fallback never
fires. Fuse would have to stay, and the trigger that summons it would have to be
rewritten around a provider that answers confidently and wrongly.

**Output — one file per indexed section.** The index emitted **12,066 files**
and 6.80 MiB for 11,937 records, one fragment per section, against the 1,414 a
Cloudflare build of `www/` writes today. Cloudflare Workers caps a version at
20,000 static files on the free plan. A documentation site whose index grows by
one file per section per source per version per locale reaches that from a
site with ninety pages of source material, and a consumer who adds a language
would discover it in a failed deploy.

**The packaging is not an obstacle.** `pagefind@1.5.2` is MIT, ships seven
prebuilt binaries as `optionalDependencies` covering every platform `engines`
promises, and needs neither a postinstall download nor a node-gyp toolchain —
the bar `better-sqlite3` failed. Indexing 11,937 records took 6.8 seconds and
the whole index was in memory after 10.0. Nothing about it conflicts with
[ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime):
everything happens during the build.

## Decision

**Content's per-collection search stays the layer's default.** Pagefind is not
adopted as what duxt ships.

Of the three problems, one index solves one outright, one only within a
language, and one it makes worse while adding a file-count growth law that
collides with the platform the layer's own site deploys to. A default is changed
for a clear win, not for a trade, and two of three is a different shape rather
than a better one.

**Pagefind stays available, as a layer rather than as a default.**
`duxt:search:records` was opened for exactly this, and the measurement confirmed
the contract needs no adaptation: `url`, `title`, `content`, `source`, `version`
and `locale` map onto `addCustomRecord` field for field, and the filters that
come out are the source identities and version labels duxt already computes. A
consumer who wants one index writes `extends: ['@kirchdev/duxt', 'duxt-pagefind']`
and pays the file count knowingly.

**The rule outlives the candidate.** `searchIndexVerdict` in
`scripts/search-index-bench.ts` states the six conditions a replacement has to
clear — materially smaller payload, sources ranked together, typo tolerance
kept, build-time only, binaries covering `engines`, output inside the
deployment's file ceiling — and returns the ones a candidate fails. This ADR's
"no" is a value that function returns.

## Consequences

Readers keep a search that downloads more and answers offline afterwards, and
keep the typo tolerance Fuse provides. The payload complaint is unfixed: a
consumer pulling many sources still pays per active collection, and that remains
the strongest reason to revisit this.

`interleave()` stays, and so does the comment explaining why there are no
comparable scores to rank with.

Revisiting is cheap and the terms are written down. Pagefind gaining fuzzy
matching, or emitting fragments in fewer files, would flip two conditions; a
candidate that indexes every language into one searchable space would flip a
third. Re-run the bench rather than re-argue the case — and record a new ADR
superseding this one, because these records are append-only.

Nothing here constrains an external service. Meilisearch and Typesense answer
all three complaints and were never candidates for a *default*, because a
default may not require a consumer to run or buy a service; they consume the
same hook.
