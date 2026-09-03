# TODO

Open items that are decided but not built. Anything still being argued about
belongs in `CLAUDE.md` under _Open — ask, do not decide_, not here.

## Theme

- [ ] **Point the aside's "Documentation" link at duxt's own published docs.**
      It currently links to `/getting-started` on the same site, which is
      circular. Needs the site to be deployed somewhere first.
- [ ] **Search.** ⌘K over the collection, the way nuxt.com and shadcn-docs-nuxt
      both have it.
- [ ] **Prev / next links** at the end of a page, from the navigation order.
- [ ] **Active heading in the table of contents** while scrolling.
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

- [ ] **Section landing pages with cards**, the way nuxt.com gives each part of
      its documentation an overview.
- [ ] **Breadcrumb.** The component is added but not used anywhere.
- [ ] **Mobile: hide the section row properly.** It is reachable from the sheet
      now, but the row itself still scrolls horizontally on a narrow screen.
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
      version.
- [ ] **`llms.txt` and the MCP route.**

## Repo

- [ ] **`vue-tsc` on TypeScript 7.** The repo is held at 6 because vue-tsc
      cannot run on 7 — see `CLAUDE.md`. Revisit when Volar ships support.
- [ ] **Delete `AI_SETUP.md`** once its content is fully carried by `README.md`,
      `docs/` and `CLAUDE.md`.
