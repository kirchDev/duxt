<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/wordmark-dark.svg">
  <img src=".github/assets/wordmark-light.svg" alt="duxt" width="200" />
</picture>

**Versioned, multi-repo documentation for Nuxt — one line to extend, no collection boilerplate**

[![npm Version](https://img.shields.io/npm/v/@kirchdev/duxt.svg?style=flat-square&color=4f46e5)](https://www.npmjs.com/package/@kirchdev/duxt)
[![Downloads](https://img.shields.io/npm/dm/@kirchdev/duxt.svg?style=flat-square&color=4f46e5)](https://www.npmjs.com/package/@kirchdev/duxt)
[![Tests](https://img.shields.io/github/actions/workflow/status/kirchDev/duxt/ci.yml?branch=main&style=flat-square&label=tests)](https://github.com/kirchDev/duxt/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/node/v/@kirchdev/duxt.svg?style=flat-square&color=8993be)](https://www.npmjs.com/package/@kirchdev/duxt)
[![License: MIT](https://img.shields.io/npm/l/@kirchdev/duxt.svg?style=flat-square&color=10b981)](LICENSE)

</div>

---

```ts
export default defineNuxtConfig({
  extends: ['@kirchdev/duxt'],
})
```

That's it. Put your Markdown in `docs/` and you have a themed documentation site — search, navigation, table of contents, dark mode, `llms.txt` and an MCP server — with no collection, no layout and no config written by hand.

## 🤔 Why

Nuxt Content v3 already downloads and caches a git repository, at a branch or at a tag, private ones included — so nothing here rebuilds that. What it does not give you is the part that gets retyped in every documentation repo: one collection per version × repository, a URL scheme that carries them, a version switcher that knows which page exists where, and a theme on top.

duxt turns all of it into one list. Sources are declared once, and the collections, the prefixes, the switcher, the redirects and the sitemap are generated from that declaration.

## 📦 Install & run

```bash
pnpm add -D @kirchdev/duxt
```

The `extends` line above is the whole of the single-folder case. Everything beyond it is one file — `app/app.config.ts`, which both halves of the layer read:

```ts
export default defineAppConfig({
  duxt: {
    title: 'Acme',
    sources: [
      { path: 'docs', slug: 'acme' },                          // this repository
      { repo: 'acme/api', path: 'docs', refs: ['main', 'v2.0.0', 'v1.4.0'] },
    ],
    sourceOptions: { defaultRef: 'v2.0.0' },
  },
})
```

Two repositories and three refs become five collections, the URL prefixes that serve them, and a version switcher — none of which you write.

## ✨ Features

- **📦 Extend, don't scaffold** — a Nuxt layer: theme, pages, components and `app.config` defaults arrive with `extends` and are overridden file by file where you disagree.
- **🗂️ Sources as a list** — one compact entry per source instead of one Content collection per version × repository.
- **🧭 Version switcher and URL scheme** — `/[repo]/[version]/[...slug]`, collapsing cleanly when there is one source and no versions, with a lifecycle per version that decides the banner a reader gets.
- **🌿 Git-native sourcing** — branches, tags, private repositories and hash-based caching come straight from Content v3's own `repository` support; `'latest'` resolves to the newest semver tag at build time.
- **🤖 Machine-readable by default** — `llms.txt`, `llms-full.txt` and a real MCP server at `/mcp`, generated from the same collections the pages render from.
- **🎨 shadcn-vue theme, owned not vendored** — Tailwind 4 with the components in `app/components/ui/`, MDC components in `app/components/content/`.
- **🔍 Search, TOC, breadcrumb, prev/next** — ⌘K fuzzy search across every source, active-heading tracking, section landing pages, feedback and "Edit this page" links.
- **🧯 A build that fails loudly** — a validator walks the parse cache for URL collisions, empty collections, broken links and missing titles, because every bug this layer actually had was a silent one.

<details>
<summary>Full feature list</summary>

### Sources & versions

- **🗂️ Sources as a list** — one compact entry per source instead of one Content collection per version × repository. The single unversioned folder is the default and needs no config at all.
- **🧭 Version switcher and URL scheme** — `/[repo]/[version]/[...slug]`, collapsing cleanly when there is one source and no versions, with a lifecycle per version (`upcoming`, `current`, `maintained`, `deprecated`, `eol`) that decides the banner a reader gets.
- **🌿 Git-native sourcing** — branches, tags, private repositories and hash-based caching come straight from Content v3's own `repository` support; `'latest'` resolves to the newest semver tag at build time.
- **🔁 Redirects from frontmatter** — `redirectFrom` on a moved page becomes route rules under every repository, version and locale prefix it is served at.

### Theme & reading experience

- **🎨 shadcn-vue theme, owned not vendored** — Tailwind 4 with the components in `app/components/ui/`, MDC components (`::callout`, `::steps`, `::code-group`, file trees, Mermaid) in `app/components/content/`.
- **🔍 Search, TOC, breadcrumb, prev/next** — ⌘K fuzzy search across every source, active-heading tracking, section landing pages, feedback and "Edit this page" links.
- **🌍 Seven locales out of the box** — `en-GB`, `en-US`, `de-DE`, `es-ES`, `fr-FR`, `pt-PT` and `pt-BR`; a site picks which of them it serves, and its own strings take a literal, a key or a per-locale record.

### Machine-readable & SEO

- **🤖 Machine-readable by default** — `llms.txt`, `llms-full.txt` and a real MCP server at `/mcp` (list pages, read a page, search), generated from the same collections the pages render from.
- **📈 SEO and feeds included** — sitemap, robots, generated OG images, and an optional `/rss.xml` over a section you nominate.

### Layer & build

- **📦 Extend, don't scaffold** — a Nuxt layer: theme, pages, components and `app.config` defaults arrive with `extends` and are overridden file by file where you disagree.
- **🧯 A build that fails loudly** — a validator walks the parse cache for URL collisions, empty collections, broken links and missing titles, because every bug this layer actually had was a silent one.
- **🔎 DevTools tab** — the resolved sources, collections, prefixes, message catalogues and download cache, in dev, where guessing used to be the only option.

</details>

## ⚙️ Configuration

Everything lives under the `duxt` key of `app.config.ts`. The keys most sites touch:

| Key             | What it controls                                                          |
| :-------------- | :------------------------------------------------------------------------ |
| `sources`       | The documentation sources — folder, repository, refs, lifecycle, history. |
| `sourceOptions` | How those become URL prefixes (`defaultRef`, `showRepo`, `showVersion`).  |
| `title`         | The site name, in the navbar and every generated document.                |
| `locales`       | Which of the layer's locales this site serves. Read at build time.        |

Every text field takes a literal, an i18n key, or a per-locale record — a single-language site never sees the other two.

> [!TIP]
> The full surface — `navigation`, `sections`, `landing`, `feed`, `footer` and the rest — is typed, and the types are the documentation: [`app/types/duxt.d.ts`](app/types/duxt.d.ts) carries a comment per key explaining what it costs and when it is read.

## 🧪 Development

```bash
git clone https://github.com/kirchDev/duxt.git
cd duxt
pnpm install   # wires the husky hooks
pnpm check     # lint + format + typecheck + tests + policy parity + build + a11y
```

The repo root **is** the layer — `nuxt.config.ts`, `content.config.ts`, `app/`, `modules/` and `server/` live there, and `package.json` points at them. `www/` beside it is the site that consumes the layer, and the development target: it deliberately carries the awkward cases — two repositories, four refs, one version of each lifecycle. It is not a template; the exemplary starting point lives in [`kirchDev/duxt-starter`](https://github.com/kirchDev/duxt-starter).

## 🎨 Assets & branding

The mark is the package name with its first letter bracketed — `[d]uxt` — because that is how the package is written where it is used: `extends: ['@kirchdev/duxt']`, an array with one entry. It is set in [IBM Plex Mono](https://github.com/IBM/plex) SemiBold and converted to outlines, so no asset depends on the font being installed anywhere.

> [!NOTE]
> The wordmark is **AI-assisted placeholder artwork** — a stand-in to be replaced at some point, with no fixed timeline. No image generator was involved: it is typeset, not drawn.

Every asset, the colour values, why the icon's brackets are redrawn and the font licensing are in [Conventions → Branding](https://duxt.app/conventions/branding).

> [!IMPORTANT]
> The layer ships **no** branding. `duxt.logo` is unset by default, so `DuxtBrand` falls back to the consumer's own `duxt.title` beside a generic icon: a site extending duxt shows its own name in the header and footer and its own icon in the tab, never this one. These assets belong to this repository and to `www/`, not to the published package.

## 🤝 Contributing

PRs welcome. Conventional Commits are enforced via commitlint, and husky runs the linters on `git commit`. Branch off `dev`.

> [!TIP]
> Run `pnpm check:fix` before pushing — CI will catch what husky missed.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## 🛣️ Versioning

[Semantic Versioning](https://semver.org/) via [release-please](https://github.com/googleapis/release-please) — see the [releases](https://github.com/kirchDev/duxt/releases).

## 📄 License

[MIT](LICENSE) © [Titus Kirch](https://github.com/TitusKirch/) / [IT-Dienstleistungen Titus Kirch](https://kirch.dev)
