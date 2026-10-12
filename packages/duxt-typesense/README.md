# @kirchdev/duxt-typesense

Opt-in Typesense search for duxt. This companion Nuxt layer indexes the complete
`duxt:search:records` payload during a build and connects the existing search
dialog directly to Typesense with a search-only key.

```sh
pnpm add @kirchdev/duxt @kirchdev/duxt-typesense
```

```ts
export default defineNuxtConfig({
  extends: ['@kirchdev/duxt', '@kirchdev/duxt-typesense'],
  duxtTypesense: {
    endpoint: process.env.TYPESENSE_ENDPOINT,
    collection: 'docs',
    searchKey: process.env.TYPESENSE_SEARCH_KEY,
    adminKey: process.env.TYPESENSE_ADMIN_KEY
  }
})
```

`endpoint` is the HTTP(S) URL of your Typesense node (a reverse-proxy path is
supported). `collection` names a dedicated alias owned by this layer; it must
not already be a physical collection. The browser needs CORS access to that
endpoint. Create a Typesense key with only `documents:search`, restricted to
this alias; never put an admin key in `searchKey` or public runtime config.
Only the endpoint, alias and search-only key enter public runtime config.

A build with an admin key creates a fresh physical collection, imports records
in batches of 100, checks every import result, then switches the alias. This
replaces the complete set, including deleted pages. IDs and all common fields
are preserved. The prior collection is removed only when its name belongs to
this provider's managed namespace. Failed imports leave the alias unchanged and
remove the failed staging collection. A failed alias response retains staging,
because the service may have switched the alias before the response was lost.
Concurrent builds use distinct staging
collections; the last completed sync wins. Run one build at a time if publication
order matters. Cleanup failures are reported and may leave an unused collection
for an operator to remove.

Local builds without an admin key skip synchronization. Without both an
endpoint and a search-only key the layer leaves built-in search active. With
browser search enabled, the existing dialog searches title and plaintext, using
the current content locale and the selected/default edition of each source.
Requests time out after 30 seconds. Service failures produce no results and a
console warning. There is no server proxy or Typesense SDK in duxt.

To verify the provider in this repository, set `DUXT_SEARCH_PROVIDER=typesense`
and the `TYPESENSE_*` variables above before building `apps/www`. An ordinary
build uses built-in search and requires no service or credentials.

For custom search UIs, `@kirchdev/duxt-typesense/search` exports `searchTypesense`;
`@kirchdev/duxt-typesense/sync` exports `syncTypesense` for explicit build tooling.
Keep admin synchronization in build-only code. The API contract follows the
[Typesense document API](https://typesense.org/docs/30.2/api/documents.html) and
[collection aliases](https://typesense.org/docs/30.2/api/collection-alias.html).

[MIT](LICENSE) © [Titus Kirch](https://github.com/TitusKirch/) /
[IT-Dienstleistungen Titus Kirch](https://kirch.dev)
