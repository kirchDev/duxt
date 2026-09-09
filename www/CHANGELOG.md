# Changelog

The documentation site's own log. `www` is private and never published, so the
numbers below mark this site's milestones rather than releases of the
`@kirchdev/duxt` package — release-please writes that changelog at the
repository root once the first version is cut.

It is also the fixture that keeps a generated section on the build's path: the
site declares it under `duxt.sources[].generated` twice — once split into a page
per release at `/releases`, once whole at `/changelog` — so `pnpm check` renders
both of the `changelog` type's granularities end to end rather than trusting a
registry with nothing in it.

Three things below are deliberate rather than historical. `0.5.0` carries **every
section release-please can write** — the breaking-change block, the two visible
types and the whole hidden set — because the theme colours and filters groups by
the names the file used, and a fixture holding two of them proves nothing about
the twelfth. `0.4.1` is written at `###` with its groups at `###` too, which is
how release-please writes a patch: the parser finds a release's groups by the
shallowest heading inside it rather than by a fixed level, and that is the only
release here that tells the two rules apart. And `0.1.0` alone wraps its version
in no compare link, which is the third thing kept on purpose: release-please
writes one on every release that has a predecessor, the release page turns it
into the "compare changes" beside "edit this page", and the first release of a
project has nothing to compare against — so the page has to render without one.

## [0.5.0](https://github.com/kirchDev/duxt/compare/v0.4.1...v0.5.0) (2026-09-08)

### ⚠ BREAKING CHANGES

* `duxt.sections[].path` is now `to`, for the same reason every other link in
  the config carries one — a site that names the old key loses its navbar entry
  rather than getting it in the wrong place
* the OG image template moved from `components/OgImage.vue` to
  `OgImage/Duxt.satori.vue`; a site that overrode it by name overrides nothing
  until the file is renamed

### Features

* filter the release overview by the kinds of change a release carries
* give every generated page the contents column its headings were missing

### Bug Fixes

* centre the timeline marker on its rail rather than beside it
* keep a group's count on the baseline of the heading it belongs to

### Performance Improvements

* build the navigation tree once per request instead of once per sidebar entry

### Reverts

* restore the version switcher's own query cache, dropped in 0.4.0 by mistake

### Documentation

* write down why the two agent policy files exist twice and are checked against
  each other

### Code Refactoring

* move the changelog's anchors and tones beside the components that draw them

### Build System

* pin the Node version the site builds on to the one `.nvmrc` names

### Continuous Integration

* run the accessibility gate over the built site rather than the dev server

### Tests

* cover the release parser's patch-level headings

### Styles

* set the release version in tabular figures so a column of them lines up

### Miscellaneous Chores

* update the development dependencies to their September releases

### [0.4.1](https://github.com/kirchDev/duxt/compare/v0.4.0...v0.4.1) (2026-09-08)

### Bug Fixes

* stop the section row from wrapping onto a second line at exactly 1024px

## [0.4.0](https://github.com/kirchDev/duxt/compare/v0.3.0...v0.4.0) (2026-09-08)

### Features

* publish the site's changelog as a generated section, the first type in the
  registry
* complete the page metadata the SEO modules leave open, and take the stack from
  the Nuxt SEO bundle

### Bug Fixes

* check the origin before a framed panel takes a theme from a message
* stop creating the content database before Content does

## [0.3.0](https://github.com/kirchDev/duxt/compare/v0.2.0...v0.3.0) (2026-09-06)

### Features

* localise the documentation into German, Spanish, French and Portuguese
* let a section stand in with an icon for pages that carry none of their own

### Bug Fixes

* put the palette in a cascade layer so an override cannot lose a race
* give a page outside every section one branch of the tree, not the whole tree
* name a sidebar folder after its index page rather than its directory

## [0.2.0](https://github.com/kirchDev/duxt/compare/v0.1.0...v0.2.0) (2026-09-04)

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
