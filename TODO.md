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
- [ ] **Decide on `typeset`.** shadcn-vue ships a prose preset
      (`--typeset-*` variables, a `not-typeset` escape hatch) that covers what
      `app/assets/css/prose.css` does by hand. It is not installable through the
      CLI — the registry has no `typeset` item — so adopting it means porting
      the CSS. Worth revisiting once the theme settles.

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
