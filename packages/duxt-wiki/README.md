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

Wikilinks resolve from current Content rows at render time: `[[Title]]`,
`[[Alias|Label]]`, `[[path/to/page]]` and `[[Title#Section]]`. Names and paths
ignore case after Unicode NFC normalization. Links stay in their source and
version, then try locale fallbacks; `[[~/other-source/Title]]` explicitly leaves
that scope, including a generated source's own version and locale fallbacks.
A disambiguation page with the shared title wins; otherwise an
ambiguous name stays a red link and produces a build warning. Missing pages
are wanted notes, never build failures. Inline code and fences stay literal.

The HTML link checker excludes only a `title` query on an actually registered
Wiki wanted route, using the configured locale routing strategy. External
URLs, other source/version paths, other queries and fragments keep their
ordinary checks; resolved wikilinks still use duxt's existing link validator.

Red links open the collection's `/wanted?title=…` page. The query is read in the
browser, so one static, noindex page serves every title. Without a query it
lists wanted titles and link counts. A recognized source forge gets a prefilled
create-file proposal when an editable Markdown target can be derived. Generated
artifact files and tags offer no create-file proposal; the explanation and
linking pages remain available. Article
backlinks show ten pages and the remaining count. `duxt report` includes wanted,
orphaned, dead-end and uncategorized pages through a validated data-only report
receipt. Runtime resolvers never read that receipt.

Authored `rawbody` and the stored body AST are preserved. HTML uses a render
copy. Markdown downloads, MCP `read_page`, `llms-full.txt` and the copy-page
action serve ordinary links; unresolved names become plain text. Core's one
request-bound `event.context.duxtMarkdown` output formatter has Wiki as its
consumer and retains plain strip-frontmatter behavior without the layer.

## Infoboxes and text queries

Put one infobox at the start of the article body, before the lead. It floats
on the logical end of a wide article and stacks above the prose on a phone.
Its image uses `ProseImg`, including the image viewer. Groups start open;
`collapsed` closes one initially and keeps it keyboard-operable.

```mdc
::infobox{title="Sprint" image="/sprint.png" type="mode"}
:::infobox-row{label="Status" key="status"}
**Available**
:::
:::infobox-group{title="Details" collapsed}
::::infobox-row{label="Version" key="version"}
01
::::
::::infobox-row{label="Release" key="release"}
[Release notes](/release) and [[Sprint|related mode]]
::::
:::
::

::query{type="mode" where="status=Available" columns="title,version"}
::
```

The build-only schema contribution adds one `infobox` JSON column containing
`{ type, values }`. Parsing extracts each row's plain text and preserves the
authored body, so Markdown, links and wikilinks still render in the box. A row
uses its `key`, falling back to its label when the key is absent or blank. Use
an explicit stable key when translating labels; groups do not change keys.
The infobox's `type` is body data. The page's frontmatter `type` still chooses
its page template.

The public query attributes are `type`, `where` and `columns`. `where` is an
optional `key=value` text comparison; `columns` is a comma-separated list and
defaults to `title`. The `title` column links to the page; other columns read
row keys, showing a blank cell for a missing key. Equality is case-sensitive
text equality: `01` and `1` remain different values. No per-type schema or
numeric conversion is applied.

Queries use `queryCollection` in the current source and version, overlaying
the requested locale and its fallbacks before filtering. They do not retain
metadata between requests or bundles. Tables scroll inside their own
container and an unmatched query shows an empty state.

Installing the components and JSON column requires a new application image.
After that, new row keys and infobox types are content-only changes and can
be delivered with `duxt content pack` without rebuilding that image.

[MIT](LICENSE) © [Titus Kirch](https://github.com/TitusKirch/) / [IT-Dienstleistungen Titus Kirch](https://kirch.dev)
