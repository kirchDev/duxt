# @kirchdev/duxt-meilisearch

Opt-in Meilisearch search for duxt, published as an independent companion Nuxt
layer. It consumes the full `duxt:search:records` build snapshot and connects the
existing search dialog. duxt itself needs no service or SDK.

```sh
pnpm add @kirchdev/duxt @kirchdev/duxt-meilisearch
```

```ts
export default defineNuxtConfig({
  extends: ['@kirchdev/duxt', '@kirchdev/duxt-meilisearch'],
  duxtMeilisearch: {
    host: process.env.MEILISEARCH_HOST,
    index: 'docs',
    searchKey: process.env.MEILISEARCH_SEARCH_KEY,
    syncKey: process.env.MEILISEARCH_SYNC_KEY,
    taskKey: process.env.MEILISEARCH_TASK_KEY,
    sync: {
      enabled: process.env.MEILISEARCH_SYNC_ENABLED === 'true',
      deployment: process.env.DUXT_DEPLOYMENT === 'production'
        ? 'production' : 'preview'
    }
  }
})
```

`host` is an HTTP(S) URL without embedded credentials, query or fragment;
reverse-proxy paths are supported. `index` must use letters, numbers, underscores
or hyphens and must be a dedicated index owned by this provider.

**Sync is disabled by default, even when the private key is present.** Enable it
only in the production publication pipeline with both `sync.enabled: true` and
`sync.deployment: 'production'`. Development, Nuxt prepare, and recognized
GitHub PR, GitLab MR, Jenkins change, Vercel preview and Netlify preview builds
skip writes even when configured otherwise. Cloudflare Pages skips writes unless
`CF_PAGES_BRANCH` equals an explicitly set `DUXT_PRODUCTION_BRANCH`. Other CI
systems must map their deployment context to the deployment option; never set it
to production for previews. Keep publication jobs serialized if release order
matters. Each concurrent sync owns a unique staging index; the last successful
swap wins.

The build creates a fresh staging index, applies title/plaintext search and
source/version/locale/page filters, imports batches of 100, and waits for **every**
asynchronous task. It then swaps the complete snapshot with the live index,
waits for the swap task to succeed, and only then deletes staging (which now
holds the prior snapshot). Deleted records disappear on the next sync; an empty
snapshot clears the live index. The first sync creates an empty live index after
staging is ready. Failures before swapping preserve the old snapshot. An
uncertain or failed swap retains staging for inspection; cleanup failures report
a warning. Do not delete retained indexes until checking whether their swap
committed. Requests have a 30-second timeout and each task a five-minute timeout;
`sync.taskTimeoutMs` changes the task budget, from 1 to 3,600,000 milliseconds.
Errors omit service response bodies so keys and documents cannot enter logs.

`syncKey` is a private **build-only** credential and never enters runtime config.
Give it `indexes.create`, `indexes.get`, `indexes.delete`, `indexes.swap`,
`settings.update`, `documents.add` and `tasks.get` for `docs` and
`docs__duxt_*` (replace `docs` with your index). No master key is needed.


Meilisearch 1.54.3 hides the global `indexSwap` task (`indexUid: null`) from
index-restricted keys, even when they cover both swapped indexes. With a scoped
write key, supply a separate private `taskKey` with only `actions: ['tasks.get']`
and `indexes: ['*']`. It is used only for task polling and never enters public
config. Without it, `syncKey` must itself be able to read global tasks. A hidden
404 fails publication confirmation and retains staging; it is never taken as
success. This behavior was verified against the real engine.

Browser search is enabled only by supplying `host` and `searchKey`; browser-only
use needs no private key and does not synchronize. Create a separate Meilisearch
key with **only** `actions: ['search']`, **only** `indexes: ['docs']`, and an
appropriate expiry. The default search key permits every index and is too broad.
Never configure a master or administrative key as `searchKey`. The known private
key is rejected if reused there. Keys are opaque: the layer cannot infer a key's
permissions from its string; provisioning the scoped key is the operator's
responsibility. Only host, index and search key enter public runtime config.
The browser needs CORS access to the service.

The existing dialog searches the selected/default edition of each source,
including generated sections and its content-language fallback chain. Existing
translations suppress their original pages even when a query matches only the
original; untranslated pages remain searchable in the fallback language. This
requires a cached page-path inventory through Content's public `queryCollection`
API. The provider adds a filter-only `page` field (the URL without its anchor)
to indexed documents. Preferred page URLs are excluded within each exact
source/version/locale scope **before** Meilisearch ranks and limits results,
so hidden original sections cannot consume the engine's 1,000-hit window.
The dialog limit counts visible results. Run a production sync before enabling
this browser integration against an index created by an earlier provider build,
so its documents and filterable settings include `page`.
Service failures yield no results and a console warning.

For custom UIs, `@kirchdev/duxt-meilisearch/search` exports `searchMeilisearch`;
`@kirchdev/duxt-meilisearch/sync` exports `syncMeilisearch` for explicit build
scripts with the same production opt-in. Keep the latter out of runtime/browser
code. There is no Meilisearch SDK or runtime synchronization.

Repository dogfooding: set `DUXT_SEARCH_PROVIDER=meilisearch` and the
`MEILISEARCH_*` variables above before building `apps/www`. Without that selector,
the ordinary site keeps built-in search and requires no credentials.

The implementation follows the official [atomic swap API](https://specs.meilisearch.dev/specifications/text/0191-swap-indexes-api.html),
[asynchronous tasks](https://www.meilisearch.com/docs/reference/api/async-task-management/get-task),
and [scoped keys](https://www.meilisearch.com/docs/reference/api/keys/create-api-key).

Repository regression: after installing the frozen workspace, run
`node packages/duxt-meilisearch/tests/consumer-types.ts` to check the documented
plain Nuxt configuration in a separate consuming app, including a rejected
numeric browser key.

[MIT](LICENSE) © [Titus Kirch](https://github.com/TitusKirch/) /
[IT-Dienstleistungen Titus Kirch](https://kirch.dev)
