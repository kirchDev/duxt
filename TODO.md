# TODO

Open items that are decided but not built. Anything still being argued about
belongs in `CLAUDE.md` under _Open — ask, do not decide_, not here.

## Theme

- [ ] **Point the aside's "Documentation" link at duxt's own published docs.**
      It currently links to `/getting-started` on the same site, which is
      circular. Needs the site to be deployed somewhere first.
- [x] **Search.** ⌘K over the collection, the way nuxt.com and shadcn-docs-nuxt
      both have it.
- [x] **Prev / next links** at the end of a page, from the navigation order.
- [x] **Active heading in the table of contents** while scrolling.
- [ ] **Section landing pages** — `/guide` is a page like any other; nuxt.com
      gives each section an overview with a card per subsection.
- [x] **Adopt `typeset`.** shadcn-vue's typeset is built for exactly this —
      its own documentation wraps `<ContentRenderer>` in
      `<div class="typeset typeset-docs">`. It gives what `prose.css` does by
      hand, plus things it does not: `--typeset-size` / `-leading` / `-flow` as
      the only knobs, several presets per context (docs, chat, article), a
      `not-typeset` escape hatch, and flow spacing that does not make an
      earlier block change when a new one arrives. It is not installable
      through the CLI — the registry has no `typeset` item, the site generates
      the CSS from a builder — so adopting it means porting that CSS by hand
      and retiring `prose.css`. Recommended, once the current design pass
      settles.

- [x] **Section landing pages with cards**, the way nuxt.com gives each part of
      its documentation an overview.
- [x] **Breadcrumb.** The component is added but not used anywhere.
- [x] **Mobile: hide the section row properly.** It is reachable from the sheet
      now, but the row itself still scrolls horizontally on a narrow screen.
- [ ] **Kill the blue box behind highlighted code.** In the package-manager
      block the tokens sit on a `#24292e` rectangle — github-dark's
      `--shiki-dark-bg`, measured off a screenshot — instead of the card's own
      surface, so the line reads as a highlighted row. `.duxt-shell pre` is
      already forced transparent and `.typeset :where(.shiki, .shiki span)` is
      already transparent, yet the box survives, and nothing in the built CSS
      or in `node_modules` sets `--shiki-dark-bg` as a background: the source
      still has to be found before it can be removed.
- [ ] **Build the tree on Reka UI's `Tree`.** `FileTree` / `DuxtFileTreeNodes`
      is hand-rolled recursion over `<ul>`/`<li>` — no keyboard navigation, no
      expand/collapse state, no ARIA roles. Reka UI ships all of it as
      [`Tree`](https://reka-ui.com/docs/components/tree), and `reka-ui` is
      already a dependency of every shadcn-vue component here. No registry item
      needed; use the primitives directly.
- [x] **An escape hatch** for content keeping its own styling inside a page —
      `not-typeset`, which came with typeset.

## Layer

- [ ] **The `sources` shorthand.** The seam is proven (`content.config.ts` is
      executed code, so it can compute absolute paths); the compact list that
      generates one collection per version × repository is not built.
- [ ] **Version switcher, URL scheme and fallback** for a page missing from a
      version. The scheme to build is
      `domain.tld/<repo?>/<version?>/<folder?>/…/<file>`, and each of the two
      prefixes is switched on by the config rather than guessed per request: a
      repository segment appears once there is more than one repository, or
      when a `showRepo`-style flag forces it; a version segment once there is
      more than one version, or when its own flag forces it. A single
      unversioned source therefore serves `/guide/deploying` and nothing in
      the URL betrays that repositories and versions exist at all.
      That rule is also what makes the scheme routable. Both prefixes optional
      _per request_ would leave the first segment ambiguous — `/guide/…` could
      be a folder, a repository or a version — but because the layer decides
      at build time from the `sources` list whether a prefix is present at
      all, the shape of a URL is fixed before the first request. What is left
      is a name collision while a prefix is active: a docs folder called like
      a repository or a version. The layer should detect that at build and
      reject it, rather than resolving it silently one way.
- [x] **`llms.txt`** — generated from the collection at `/llms.txt`.
- [ ] **The MCP route.**

## Docs

- [ ] **A reference page per component and per composable.** The page
      `docs/structure/components.md` is a tour, not a reference: it shows four
      MDC components in prose, and documents no props, no slots and no
      composable at all. Every part of the public surface needs its own page
      with props, slots, events, defaults and a live example — the MDC
      components (`Callout`, `PackageManagers`, `FileTree`, `Steps`, the
      `Prose*` overrides), the layer components a consumer overrides
      (`DuxtHeader`, `DuxtFooter`, `DuxtNavigation`, `DuxtToc`, `DuxtSections`,
      …) and the composables (`useDuxtConfig`, `useDuxtSection`,
      `useDuxtToast`, `usePackageManager`). This is also what pins the public
      surface: once a name is documented, renaming it is a `feat!:`.

## Repo

- [ ] **`vue-tsc` on TypeScript 7.** The repo is held at 6 because vue-tsc
      cannot run on 7 — see `CLAUDE.md`. Revisit when Volar ships support.
- [ ] **Delete `AI_SETUP.md`** once its content is fully carried by `README.md`,
      `docs/` and `CLAUDE.md`.
