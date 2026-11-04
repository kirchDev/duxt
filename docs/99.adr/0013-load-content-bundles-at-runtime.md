---
title: Load content bundles at runtime
description: Narrow the rebuild-only default for opt-in Node and SQLite deployments, after measuring a content-only pack against a full build.
status: accepted
date: 2026-11-04
---

## Context

A wiki can change its Markdown more often than its application code. Rebuilding
an image for every edit ties content to the release pipeline; a pod without
egress cannot fetch the source itself.
[ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime)
chose immutable deployments, a useful default for static sites and Workers.

The exception needed evidence that content could be packed without compiling the
application. On 2026-11-04, the spike used `apps/www` at
`725534546886f06220f62a99525070ee63978a50`, Node 26.11.1, Nuxt 4.6.2 and
Content 3.16.2: 96 collections, 9,603 files and 95 public collection dumps.

Both processes ran from `apps/www` on the same machine with eight CPUs and the
same source and installed dependencies. Fixed public Git mirrors supplied the
remote inputs over isolated loopback HTTPS, with external networking disabled.
Both started without a Content parse database or previous templates and parsed
all 9,603 files. Runner setup and copying inputs were outside the timed
processes. Both exited with code `0`.

| Measurement | Content-only pack | Full `nuxt build` |
| :---------- | ----------------: | ----------------: |
| Wall time | 110.36 s | 278.54 s |
| Fraction of full build | 39.62% | 100% |
| Collection dumps | 95 | 95 |

All 95 compressed collection dumps and the literal `checksums` and
`checksumsStructure` exports were byte-identical. The complete
`database.compressed.mjs`, `manifest.ts` and `sql_dump.txt` also matched, with
96 table entries in both manifests.

| File | Bytes | SHA-256 (both runs) |
| :--- | ----: | :----------------- |
| `database.compressed.mjs` | 18,747,182 | `e708db643cc47bc0cd742e910124f5cdd63586e9d06fd4c6301a35d871a2bb1f` |
| `manifest.ts` | 104,380 | `43bd5c30c30e426a117053d9256684aa992c52a9b72493c4af2b95ee1ea8df65` |
| `sql_dump.txt` | 76,747,454 | `eba31689710dc03ce165dfeb9770c666c7f561083336a7fc1ba85828c334fb00` |


The content-only sequence was:

```js
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { loadNuxt, buildNuxt } from 'nuxt/kit';

const buildDir = await mkdtemp(join(process.cwd(), '.nuxt-pack-'));
const nuxt = await loadNuxt({
  cwd: process.cwd(),
  dev: false,
  overrides: { buildDir }
});
try {
  nuxt.options._prepare = true;
  await buildNuxt(nuxt);
  // Save buildDir/content before disposing the temporary directory.
} finally {
  await nuxt.close();
}
```

Production module initialization and parsing finished **before** `_prepare` was
enabled. Setting it earlier would skip parsing; reusing the build directory
would permit stale template output. This generated templates without bundling
Vite or Nitro. The comparison ran `node node_modules/nuxt/bin/nuxt.mjs build` from
`apps/www`, without configuration overrides. The spike added no production
packer or runtime loader.

## Decision

Allow content bundles as an explicit opt-in for Node deployments using SQLite.
This narrows ADR-0006 for that deployment only; rebuilds remain the default and
the path for Workers and static output. The spike passed both agreed gates:
byte-identical dumps and checksums, and pack wall time at most half the build's.

A bundle may change content, redirects and documentation media. Schema changes,
new sources or versions, and new MDC component code still require an image.
Compatibility and hashes are validated before importing every collection in one
SQLite transaction and publishing matching Content checksums. Rejection leaves
the active content in place.

Transport is an operator-owned directory with an atomically replaced `current`
pointer; the layer needs no storage client, credentials or egress. The packer
comes from the application's commit, with a tested second Docker target and an
expected compatibility hash checked before publication. Existing MDC components
are global in bundle mode; content may use a subset of that set. Replicas switch
independently, accepting skew up to the poll interval plus import time.

## Consequences

Content and application releases become independent within this scope, at the
cost of compatibility validation and atomic activation. Content's dump format,
dump route and mutable checksum export need contract tests. The cold pack still
spent most of its time parsing; this measurement establishes the speedup for
this tree, not every consumer or cache state. Replica skew and a browser keeping
its current content until a full reload are accepted costs.

## Alternatives considered

**Rebuild an image for every content push.** Remains the default; the measured
content-only stage justified an exception for the motivating wiki.

**Replace ADR-0006 everywhere.** Rejected: static sites and Workers retain their
immutable build model.

**Let Content restore lazily, or fetch storage from the layer.** Per-collection
restore cannot switch every collection atomically. A storage client would bring
credentials and egress into the application instead of leaving transport with
the operator.
