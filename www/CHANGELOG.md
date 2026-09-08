# Changelog

The documentation site's own log. `www` is private and never published, so the
numbers below mark this site's milestones rather than releases of the
`@kirchdev/duxt` package — release-please writes that changelog at the
repository root once the first version is cut.

It is also the fixture that keeps a generated section on the build's path: the
site declares it under `duxt.sources[].generated`, so `pnpm check` renders the
`changelog` type end to end rather than trusting a registry with nothing in it.

## 0.4.0 (2026-09-08)

### Features

* publish the site's changelog as a generated section, the first type in the
  registry
* complete the page metadata the SEO modules leave open, and take the stack from
  the Nuxt SEO bundle

### Bug Fixes

* check the origin before a framed panel takes a theme from a message
* stop creating the content database before Content does

## 0.3.0 (2026-09-06)

### Features

* localise the documentation into German, Spanish, French and Portuguese
* let a section stand in with an icon for pages that carry none of their own

### Bug Fixes

* put the palette in a cascade layer so an override cannot lose a race
* give a page outside every section one branch of the tree, not the whole tree
* name a sidebar folder after its index page rather than its directory

## 0.2.0 (2026-09-04)

### Features

* give the development site its own name, copy, navigation and brand accent

### Bug Fixes

* stop shipping duxt's own content as layer defaults
* name the MCP server from the site's own title
* reject a browser fallback locale the site does not serve

## 0.1.0 (2026-09-02)

### Features

* the first site built on the layer: shadcn-vue theme, Content v3 collections
  generated from one source list, and the docs tree this site still serves
