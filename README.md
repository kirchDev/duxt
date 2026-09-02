<div align="center">

# 📚 duxt

**An idea: versioned, multi-repo documentation for Nuxt — one line to extend, no collection boilerplate**

</div>

---

```ts
export default defineNuxtConfig({
  extends: ['@kirchdev/duxt'],
})
```

The idea is that this line is the whole setup: Nuxt Content v3 underneath, a theme on top, and — when you need them — several source repositories and several versions of the docs, declared as a list rather than as one collection per version × repo.

> [!IMPORTANT]
> **This is a sketch, not a product.** Nothing is built, nothing is published to npm, and none of the design below is decided — including whether the layer gets built on a clean base or on top of Docus / Nuxt UI, and whether it stays public at all. Everything here reads as a proposal to argue with.

## ✨ The idea

- **📦 Extend, don't scaffold** — a Nuxt layer, so the theme, pages, components and `app.config` defaults arrive with `extends` and are overridden file by file where you disagree.
- **🗂️ Sources as a list** — one compact declaration per source instead of one Content collection per version × repo:

  ```ts
  sources: [
    { path: 'docs' },                                 // this repo, current branch
    { path: 'docs', refs: ['v1.x', 'v2.x', 'main'] }, // versioned
    { repo: 'kirchDev/app', path: 'docs' },           // another repo
  ]
  ```

  The single-source, unversioned case is the default and needs no config at all.
- **🔀 Version switcher and URL scheme** — `/[repo]/[version]/[...slug]`, collapsing cleanly when there is one source and no versions, with a defined fallback for a page that a given version does not have.
- **🌿 Git-native sourcing** — branches, tags, private repositories and hash-based caching come straight from Nuxt Content v3's own `repository` support. `duxt` adds the ergonomics on top, not a second mechanism.
- **🤖 Machine-readable output** — `llms.txt` and an MCP route over the same content, generated at build time.

## 🚀 Setup (intended)

```bash
pnpm add -D @kirchdev/duxt
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@kirchdev/duxt'],
})
```

Put your Markdown in `docs/` and start the app. Everything beyond that — more sources, versions, theme overrides — would be opt-in.

Neither the package nor `kirchDev/duxt-starter` exists yet; the starter, if it happens, would be cloned with `npx nuxi@latest init -t github:kirchDev/duxt-starter`.

## 🧪 Development

```bash
git clone https://github.com/kirchDev/duxt.git
cd duxt
pnpm install   # wires the husky hooks
pnpm check     # lint + format + typecheck + policy parity
```

The repo root **is** the layer — `nuxt.config.ts`, `content.config.ts` and `app/` live there, and `package.json` points at them. `www/` beside it is the site that consumes the layer, and the development target: it deliberately carries the ugly cases — edge-case frontmatter, several sources, a tag to read from. It is not a template; the exemplary starting point lives in [`kirchDev/duxt-starter`](https://github.com/kirchDev/duxt-starter).

## 🤝 Contributing

PRs welcome. Conventional Commits are enforced via commitlint, and husky runs the linters on `git commit`. Branch off `dev`.

> [!TIP]
> Run `pnpm check:fix` before pushing — CI will catch what husky missed.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## 🛣️ Versioning

[Semantic Versioning](https://semver.org/) via [release-please](https://github.com/googleapis/release-please) — see the [releases](https://github.com/kirchDev/duxt/releases).

## 📄 License

[MIT](LICENSE) © [Titus Kirch](https://github.com/TitusKirch/) / [IT-Dienstleistungen Titus Kirch](https://kirch.dev)
