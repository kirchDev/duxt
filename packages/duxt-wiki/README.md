# @kirchdev/duxt-wiki

Shared wiki metadata for duxt. Extend the core first, then this layer:

```ts
export default defineNuxtConfig({
  extends: ['@kirchdev/duxt', '@kirchdev/duxt-wiki']
})
```

Pages accept `categories: [Modes]` and `aliases: [Fast]`. The parse step stores
unresolved outgoing `links` as `{ target, kind: 'markdown' | 'wiki' }` records.
`[[Target|Label]]` is recorded as a target, without rendering wiki syntax yet.
Code fences and inline code contribute no links. The authored body is preserved.

`@kirchdev/duxt-wiki/server` exports `queryWikiPages(event, collections)`, a
request-bound metadata loader using only `queryCollection`. Supply the page's
own source/version collections in locale fallback order, from duxt's
`sourcesForRoute` resolver. Read once per page and share that returned array
across `resolveWikiTargets`, `wikiIncoming` and `wikiCategory` from
`@kirchdev/duxt-wiki/queries`. Browser consumers can bind Content's browser
query builder to `loadWikiPages` instead. Neither loader retains data between
requests or bundles. Names compare after NFC normalization and lowercasing;
ambiguous names return every candidate in the first matching collection.

A category page lives at `<source-prefix>/category/<name>`; its own
`categories` are its parents. `wikiCategory` returns its optional page,
parents, direct members and subcategory pages. Categories with members but
no page work too. Category cycles produce a warning during builds and packs.

The fields are Content columns, including in content bundle dumps. Adding the
layer changes the schema and needs a new application image once. Subsequent
page/alias/category changes travel through content bundles. Unchanged parsed
pages retain their links, and targets resolve against the currently loaded
rows rather than the state at parse time. Sites without this layer get no
wiki columns. Runtime reads are adapter-independent: SQLite, D1, libsql and
PostgreSQL are the project's matrix targets; pglite remains untested.

[MIT](LICENSE) © [Titus Kirch](https://github.com/TitusKirch/) / [IT-Dienstleistungen Titus Kirch](https://kirch.dev)
