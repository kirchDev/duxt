# CLAUDE.md

This file provides guidance to AI coding agents — Claude Code (claude.ai/code) and vendor-neutral tools such as Codex, OpenCode, Cursor, and Copilot — when working with code in this repository.

## Agent instruction files

`CLAUDE.md` and `AGENTS.md` are kept **byte-identical**. `CLAUDE.md` is what Claude Code reads; `AGENTS.md` is what vendor-neutral agent tools read — Codex, OpenCode, Cursor, Copilot, and whatever follows them. Two real files, deliberately not a symlink: not every tool resolves one.

**After editing either file, copy it over the other — don't repeat the edit by hand:**

```bash
cp CLAUDE.md AGENTS.md   # or the reverse, whichever you just edited
```

Retyping a change is exactly how the two drift; one reflowed line or reworded clause is enough. `diff CLAUDE.md AGENTS.md` must print nothing. If it ever does, treat it as a defect and fix it by letting one file win wholesale — never by merging them.

## What this repo is

> [!IMPORTANT]
> **Nothing here is decided.** `duxt` is at the idea stage — the repo currently carries the meta layer and nothing else. What follows is the working sketch plus the questions still open. Treat every "is" below as "is currently assumed"; do not harden any of it into code without asking.

The idea started in `kirchDev/greenhouse` as `ideas/nuxt-ai-docs.md`, where it is filed under that working title; `duxt` is the name it got here.

The sketch: `duxt` as a **Nuxt documentation layer on Nuxt Content v3**, published as `@kirchdev/duxt` and consumed with one line:

```ts
export default defineNuxtConfig({
  extends: ['@kirchdev/duxt'],
})
```

Assumed shape is a **layer that carries a module** — theme, pages, components, `app.config` defaults and collections as layer material the consumer overrides selectively, while generating collections, emitting `llms.txt` and mounting an MCP route are build-time and server work the layer's own config declares.

**One thing that _is_ settled, because it was verified by reading `@nuxt/content@3.16.0`: Content v3 already does git-native sourcing — do not rebuild it.** A `CollectionSource` takes `repository` (url, branch, tag, auth) and Content downloads and hash-caches it under `.data/content/`. Multi-repo, reading from a branch or tag, private-repo auth and caching all exist. Two consequences:

- `loadContentConfig` reads `content.config.ts` from **every Nuxt layer** and merges them, later layers winning. A layer ships its own collections for free.
- It loads them through **c12**, so `content.config.ts` is **executed code, not a data file** — it may compute its collections at load time. There is no hook for injecting collections, and none is needed.

What that leaves as candidate value: the **ergonomics** (a compact `sources` list generating one collection per version × repo, with the single unversioned source needing no config at all), the **version switcher, URL scheme and fallback**, and the **theme**.

**Open — ask, do not decide:**

- **Does the idea carry a public project at all?** Positioning on ergonomics plus version UX may be too thin. If it is, `duxt` is a private layer and needs neither a brand, a starter, nor a public repo.

**Decided so far:**

- **The theme is shadcn-vue, wired through `shadcn-nuxt`** — a clean Tailwind 4 base with owned components in `app/components/ui/`, not Docus or Nuxt UI. Add one with `pnpm dlx shadcn-vue@latest add <name>`; `components.json` already points the CLI at the layer's own alias. If the CLI refuses (it wants to install `reka-ui`/`@vueuse/core`/`@lucide/vue` into the workspace root and gives up), fetch the component from `https://www.shadcn-vue.com/r/styles/new-york/<name>.json` and write its files by hand — then swap `@/…` for `@duxt/…` and every `lucide-vue-next` import for `<Icon name="lucide:…">`, which is what the components already here use. **They are prefixed `Ui`** (`shadcn.prefix` in `nuxt.config.ts`), so it is `<UiButton>`, `<UiSelectTrigger>`, `<UiTextarea>`: without a prefix the layer auto-imports `Button`, `Input`, `Card` and a hundred other ordinary words into every site that extends it, and a collision with a consumer's own component resolves silently. The palette is the neutral shadcn set as CSS variables in `app/assets/css/duxt.css`, `dark` class toggled by `@nuxtjs/color-mode`; a consumer redefines a token in its own stylesheet rather than forking the file.
- **Four icon sets, and the DOMAIN decides which.** The **stack** — a file, a fence's language, a tool you run — is `vscode-icons`, which carries the real colours in the file (`app/utils/file-icons.ts` and the package-manager tabs). A **third party as itself** — a platform, service or company the site links to or hands something to — is `simple-icons` (GitHub, Discord, Claude, OpenAI, Laravel). A locale's region is `flag`. Everything that is not a mark at all is `lucide`, which inherits `currentColor` and is the default. Where both collections carry a brand, the domain still decides: `vscode-icons:file-type-claude` is the icon for a Claude *file*, while the button that sends a page to the Claude *platform* is `simple-icons:claude`. Do not tint a monochrome mark by hand; if a coloured one belongs there, use it. The whole rule, the licences and why a licence is not a trademark: `docs/6.conventions/2.icons.md`.
- **Markdown components are MDC, not MDX.** Content ships MDC, so `::callout{type="tip"}` works with no extra module. Components live in `app/components/content/`.
- **Numbered section prefixes are a non-issue.** Content strips them itself: `1.guides/` renders at `/guides`, `99.adr/` at `/adr`. Verified in `www/`. Reordering does not move a URL; only renaming the name part does.
- **No SQLite driver is installed.** Content's default is `better-sqlite3`, a native addon needing a node-gyp toolchain. `content.experimental.nativeSqlite` uses Node 24's built-in `node:sqlite` instead, which needs no package at all — an ordinary `www/` build reads and renders through neither `better-sqlite3` nor `@libsql/client`. It is flagged experimental in Content; if that changes, `@libsql/client` is the prebuilt fallback, not `better-sqlite3`. (`@libsql/client` and `pg` **are** now in `www/`'s devDependencies, and that is not a contradiction: they exist solely so the adapter matrix below can build this site against those two adapters. Nothing imports either, and a build with `DUXT_CONTENT_ADAPTER` unset loads neither.)
- **Which Content database adapters pass through, and how far that is actually known.** Content runs on five — `sqlite`, `d1`, `postgresql`, `libsql`, `pglite`. The layer is transparent to all of them because it reads the deployed database **only** through `queryCollection()`; `tests/content-database.test.ts` enforces exactly that, failing on any driver import under `server/` or `app/` and keeping the list of build-time files that may open a database closed. The fact that makes it work is that **Content keeps two databases**: `content._localDatabase` — the parse cache at `.data/content/contents.sqlite`, typed `sqlite | d1` and nothing else — and `content.database`, the deployed one. `content-cache.ts`, `modules/git-meta.ts` and `duxt-report` all read the **first**, during a build, so no adapter choice moves them. `sqlite`, `d1`, `libsql` and `postgresql` are verified; **`pglite` is untested and is documented as untested** — do not upgrade that claim without a run behind it. `.github/workflows/adapters.yml` keeps `libsql` and `postgresql` honest by building `www/` against each (`DUXT_CONTENT_ADAPTER`, read in `www/nuxt.config.ts`) and then probing the endpoints that read the database at runtime with `pnpm check:adapters`. It is the second workflow here that is **not** a stub, and it is deliberately **not** in `pnpm check`: each leg is a second full Nuxt build, and the PostgreSQL one needs a server. Written up for consumers in `docs/2.concepts/11.databases.md`.

**Repo shape — the root IS the layer.** `nuxt.config.ts`, `content.config.ts` and `app/` sit at the repo root, and `package.json` points at them with `main: "./nuxt.config.ts"` plus a `files` allowlist, so `extends: ['@kirchdev/duxt']` resolves. `www/` is the consuming site beside it — the only workspace package, and the development target, exactly as `www/` is in `ZTL-UwU/shadcn-docs-nuxt`. `nuxt` is a peerDependency of the layer and a real dependency only of `www/`.

> [!IMPORTANT]
> **Nothing layer-relative resolves the way it reads.** Three places have hit this already, and a fourth will: the Content collection `cwd`, the `css` entry and `componentDir` in `nuxt.config.ts` (both go through the `layer()` helper resolving against `import.meta.url`), and the `@` alias — which belongs to whoever extends the layer, so the layer's own imports use `@duxt` instead. Assume any path written here is read from the consumer's directory until proven otherwise.

> [!IMPORTANT]
> **A layer's collections resolve against the LAYER, not the consumer.** Content sets `collection.__rootDir = curr.cwd` per layer, so a relative `source.cwd` in this repo's `content.config.ts` points into this repo — never into the site that extends it. The layer therefore computes an absolute path at load time (`join(process.cwd(), 'docs')`), which works because c12 executes the config. This is the seam the whole `sources` shorthand sits on.

`www/` wants edge cases, ugly frontmatter, several sources and a tag to read from. [`kirchDev/duxt-starter`](https://github.com/kirchDev/duxt-starter) would be a **different artifact** — minimal and exemplary, what a stranger clones with `npx nuxi@latest init -t github:kirchDev/duxt-starter`. Do not conflate the two; a development site makes a bad starter.

## Commands

| Command             | What it does                                               |
| :------------------ | :--------------------------------------------------------- |
| `pnpm install`      | Install deps and wire husky hooks via the `prepare` script |
| `pnpm lint`         | `oxlint . --deny-warnings`                                 |
| `pnpm format`       | `oxfmt --check .` (note: `format` is the check, not fix)   |
| `pnpm typecheck`    | `tsc --noEmit` over the meta scripts                       |
| `pnpm typecheck:app`| `nuxt typecheck` over the layer, run through `www/`        |
| `pnpm test`         | `vitest run` over the layer's pure logic                   |
| `pnpm build:app`    | `nuxt build` in `www/` — the gate's SSR check              |
| `pnpm build:www`    | `nuxt build` in `www/` with the Workers preset, then `check:routes` over what it wrote |
| `pnpm publish:www`  | `wrangler deploy`s whatever `www/.output` already holds     |
| `pnpm deploy:www`   | Builds `www/` for Workers and `wrangler deploy`s it         |
| `pnpm check`        | Runs `lint` + `format` + both typechecks + `test` + `check:policy` + `check:previews` + `build:app` + `check:a11y` + `check:seo` + `check:images` — the CI gate |
| `pnpm check:policy` | Proves the two agent policy files ban the same commands    |
| `pnpm check:a11y`   | axe-core over one page of each kind from the built site     |
| `pnpm check:images` | Reads the images off the built fixture page — sources, pass-through, zoom affordance |
| `pnpm check:adapters` | Probes the built server's database-reading endpoints — for the adapter matrix, not part of `check` |
| `pnpm check:routes` | Proves the static/runtime route classification against a Cloudflare build's `.output/public` — the last step of `build:cf`, so every Workers build runs it; not in `check` |
| `pnpm lint:fix`     | Auto-fix lint                                              |
| `pnpm format:fix`   | Auto-fix format                                            |
| `pnpm check:fix`    | Auto-fix lint + format                                     |
| `pnpm skills:update`| Update project-scoped agent skills via the skills.sh CLI   |
| `pnpm taze`         | Interactive dependency upgrade check                       |
| `pnpm taze:w`       | Write upgrade results                                      |

Tests cover the layer's pure logic — the source resolver, the config merge, the icon lookup, the build validator, the redirect map, the 404's nearest-page scoring — in `tests/`, run by vitest. `tests/contrast.test.ts` is the odd one out and deliberate: it parses the palette out of `duxt.css` and measures every foreground against the background it is paired with, because that is the one accessibility rule `check:a11y` cannot answer (jsdom has no computed colour) and the one this theme actually broke. Component rendering is not covered: it needs a Nuxt environment, and the failures this repo actually had were SSR failures, which is why `check` builds the site instead. `check:a11y` then runs axe-core over that build: jsdom has no layout, so `color-contrast` and `target-size` are reported as skipped rather than passed, and the structural rules — landmarks, names, heading order, ARIA — are what it enforces. `check:images` reads one more thing off the same build, and exists because of what that gap let through: `ProseImg`'s zoom had been dead since the day it was written — Vue casts an absent `boolean | string` prop to `false`, so no image was ever zoomable — and nobody could see it, because every `![…]` in the reference sits inside a fenced code block and the build therefore rendered no image at all. `www/demo/docs/3.images.md` is the fixture that renders one of each shape; the check reads its `srcset`, `sizes`, pass-through formats and zoom button back off the rendered page. **A component the build never renders is a component nothing checks** — that is the general rule, and the fixture is how this one pays it. CI runs whatever `check` chains on PR; adding a check to the `check` script is enough, no workflow change needed. The one exception is `check:adapters`, which is driven by `.github/workflows/adapters.yml` instead — it needs a build per adapter and, for PostgreSQL, a server, so it parallelises as a matrix rather than lengthening the gate.

## Architecture / conventions

- **Node 24, pnpm 12, TypeScript 6.** Pinned via `.nvmrc`, `engines`, and `packageManager`. `pnpm-workspace.yaml` enforces `minimumReleaseAge=4320` (3-day cooldown), isolated node-linker. Don't loosen these without reason. **TypeScript stays on 6 deliberately**: 7 is the native port, whose `exports` map no longer exposes the compiler internals Volar builds on, so `vue-tsc` cannot run on it — and without `vue-tsc` the layer has no typecheck at all. Move to 7 when Volar does, not before. Package-manager enforcement carries no key on purpose: pnpm 11 replaced `packageManagerStrict`/`packageManagerStrictVersion` with `pmOnFail`, whose default `download` already errors on a foreign package manager and fetches the pinned pnpm version — every other value only weakens it, so leave it unset (the rationale sits as a comment in the file).
- **A heavy browser dependency is loaded on demand, never bundled.** `mermaid` (~0.5 MB) and CodeMirror 6 (the request-body editor in the API reference) are both `import()`ed inside the component that draws them, so a page without a diagram or an endpoint downloads neither. That is the bar a new one has to clear — which is also why the body editor is not Monaco: an editor whose workers and megabytes every consumer site carries, for a box that holds ten lines of JSON, is the wrong trade for a package.
- **oxc, not eslint/prettier.** Linting via `oxlint`, formatting via `oxfmt`. Configs live in `.oxlintrc.json` / `.oxfmtrc.json`. `oxlint` uses `unicorn` + `oxc` plugins; rules deliberately minimal.
- **TypeScript, no build step.** The meta scripts and the three tool configs are `.ts` — Node 24 strips types natively, so `scripts/check-policy-parity.ts`, `commitlint.config.ts`, `lint-staged.config.ts` and `taze.config.ts` stay directly executable and each tool loads its own `.ts` config unaided. `tsconfig.json` is `noEmit` + `strict` + `erasableSyntaxOnly`, so only strippable syntax (no enums, no parameter properties) can be written; `pnpm typecheck` is the gate for those. The layer itself is checked separately by `pnpm typecheck:app` (`nuxt typecheck` in `www/`), because `tsc` cannot see a Nuxt config's module options — those exist only in generated types. `oxlint` + `oxfmt` cover `.vue`, so no ESLint is coming.
- **Husky hooks** (`.husky/pre-commit`, `.husky/commit-msg`) run `lint-staged` and `commitlint`. `lint-staged.config.ts` excludes `README.md`, `CLAUDE.md`, and `AGENTS.md` (free-form prose) and `pnpm-lock.yaml`. `oxlint --fix --deny-warnings` then `oxfmt` on JS/TS; `oxfmt` only on JSON/YAML/MD.
- **Conventional Commits enforced** via `@commitlint/config-conventional`. Don't `--no-verify` unless explicitly asked.
- **release-please** drives the versioning. Files: `release-please-config.json`, `.release-please-manifest.json`, `.github/workflows/release-please.yml`. `release-type: node` (this is a published package, so `package.json` gets bumped too), `include-v-in-tag: true`, starting from `0.0.0`. Publishing to npm is a job added to `release-please.yml`, gated on `needs.release-please.outputs.release-created`.
- **Workflows** use `actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v6`, `github/codeql-action/{init,analyze}@v4`. Keep these pinned to major versions; Dependabot bumps them monthly.
- **CodeQL** scans `actions` + `javascript-typescript` with `security-extended,security-and-quality` queries, gated by path filters so non-code changes don't trigger it.
- **Dependabot** groups all minor/patch updates per ecosystem into a single PR (`npm-minor-patch`, `actions-minor-patch`). Majors come as separate PRs.

## AI & skills

- **`.claude/settings.json`** ships a baseline permission policy — see _Permission policy_ below for the rules it follows. `.claude/settings.local.json` (per-machine overrides, typically `enabledMcpjsonServers`) is gitignored.
- **`.tituskirch-skills.json`** configures the [TitusKirch skills](https://github.com/TitusKirch/skills) (commit, PR, issue, release, docs …) per repo. It is the runtime **config**, not an installer. Regenerate/reconcile it with the `tituskirch-skills-config` skill.
- **Installing the skills.** The bundle is installed via the skills.sh CLI (`pnpm dlx skills add TitusKirch/skills`), not vendored into the repo. `pnpm skills:update` refreshes project-scoped skills tracked in `skills-lock.json` (only present once a repo actually installs project skills).

## Permission policy

`.claude/settings.json` is deliberately lopsided: a **long `deny` list and a short `allow` list**. The two sides answer different questions, so they follow opposite rules.

**`deny` may be generous.** A rule for a command the repo doesn't have is a no-op, it never needs maintenance, and it is never reviewed — a too-broad block only surfaces when you actually hit it. So the list covers every stack kirchDev repos might grow into (Laravel, Prisma, Terraform/OpenTofu, AWS), not just this one. `git reflog expire` and `git gc --prune=now` are in there because they destroy the rescue path that survives a `reset --hard`.

The line to draw is **the machine or something remote, not the working copy**. Blocked: anything that wrecks the OS (`dd`, `mkfs`, `chmod -R`, `rm -rf /…`), tears down remote state or resources (`terraform destroy`, `state rm`, `aws ec2 terminate-instances`, `gh repo delete`), or throws away work with no recovery path (force-push, `reset --hard`, `stash drop`). Deliberately *not* blocked, because they are ordinary local development: `rm -rf node_modules`, `docker volume rm`, `docker compose down -v`, `docker system prune`, `php artisan tinker`, deleting a remote branch. Those prompt instead — a command that is sometimes wanted belongs in the middle state, never in `deny`.

**`allow` must stay short.** Its only return is fewer prompts — no safety is gained. Every line has to be read and understood by whoever copies this file, and an unreviewed allow list is more dangerous than none. Keep what occurs many times per session (read-only git, `ls`/`grep`/`rg`, the project's own check scripts) and let everything else ask.

**Three states, not two.** A command in `allow` runs unasked; one in `deny` is impossible and has to be typed by hand; one in **neither list prompts you** — and that middle state is the right default for almost everything. Reserve `deny` for what a mistaken "yes" could not undo. A normal `git push` is not that: it is reversible, visible and the ordinary way work ships, so it sits in `allow`.

> [!IMPORTANT]
> **Never allow a rule that runs arbitrary code.** `php artisan tinker --execute`, `pnpm exec turbo run`, `find . *` (which covers `-delete` and `-exec rm`), a raw `pnpm dlx`, or an MCP tool that executes SQL (`database-query`, `run-query`) each hand back everything the `deny` list took away — a blocked `db:wipe` means nothing next to an allowed `tinker --execute 'DB::statement(...)'`. A deny list is only as strong as the weakest allow rule beside it.

Two things this file cannot do, by design: it cannot tell which branch a `git push` targets (protect release branches with **branch protection**, not permissions), and prefix rules miss flags placed before the subcommand (`docker compose -f x.yml down -v`). Treat it as lowering the odds, not as a guarantee.

Downstream repos keep the `deny` list as-is and swap the `pnpm` lines in `allow` for whatever their stack runs.

**Codex gets the same policy** in `.codex/rules/default.rules` — permission config is not portable, so the block list exists twice and **both must be changed together**. Codex uses Starlark `prefix_rule()` calls matching on argument *tokens*, which handles flags and shell chains that the `Bash(…)` prefix patterns miss, and every rule carries its own `match`/`not_match` cases. Check a rule with:

```bash
codex execpolicy check --pretty --rules .codex/rules/default.rules -- git push --force
```

**Parity between the two is machine-checked, not eyeballed.** `pnpm check:policy` (`scripts/check-policy-parity.ts`, part of `pnpm check` and of CI) expands every `prefix_rule` into its concrete argv prefixes — the cartesian product over its alternation lists — and matches the two sets in both directions, so "we changed both files" becomes a number rather than a claim. Two things it encodes are worth knowing before editing either file:

- **The languages differ, so a few gaps cannot be closed.** Claude Code matches a prefix of the command _string_; a `prefix_rule` matches whole argv _tokens_. `Bash(aws iam delete-:*)` therefore bans every delete verb AWS will ever ship, and the Codex side can only enumerate the ones it ships today. Such a difference is legal but must be **declared** — in the `DELIBERATE` list in the script and in the `.codex/rules/default.rules` header — and the check fails both on an undeclared one and on a declaration that has gone stale.
- **Neither language normalises flag order or case.** `rm -rf /` and `rm -fr /` are separate bans; `rm -r -f /` and `redis-cli FlushAll` are neither, and enumerating permutations never ends. The check proves the two files list the **same spellings** — it does not claim the set of spellings is complete. Same caveat as the two below, and for the same reason.

## Workflows are calls, not copies

Every file in `.github/workflows/` is a **stub**: a trigger and a `uses:` pointing at a body in [`kirchDev/workflows`](https://github.com/kirchDev/workflows). This repo carries the calls, not 727 lines of workflow — and a fix made centrally reaches it on its next Dependabot bump instead of never.

What follows:

- **Do not paste a workflow body back in.** If a stub almost fits, the answer is an input on the body or an own job beside the call — see that repository's `docs/1.guides/2.add-a-body.md`.
- **The pins are commit SHAs with the version as a trailing comment.** Dependabot raises the bumps; the `github-actions` ecosystem is already configured in `.github/dependabot.yml`.
- **Publishing** is an own job in `release-please.yml`, gated on `needs.release-please.outputs.release-created` — not a forked workflow.
- **Checks come from `package.json`.** `ci.yml` runs whatever the `check` script chains, so adding a check needs no workflow change at all.

## Deployment — `www/` on Cloudflare Workers

`www/` is deployed as **one Worker with static assets**, built in GitHub Actions and uploaded with wrangler. There is no Pages git integration and no build on Cloudflare's side: `.github/workflows/deploy.yml` deploys on every push to `main` and again when a release is published, building with `NITRO_PRESET=cloudflare-module` and then `wrangler deploy`ing the result. One place builds, and it is the one whose logs we keep. **It is two jobs, not one** — `build` and `publish`, for the reason below.

**SSR on the edge, with everything prerendered that can be.** Not a choice between static and SSR: `routeRules: { '/**': { prerender: true } }` writes every doc page and every OG image into `.output/public`, which the assets binding serves without ever invoking the Worker. What is left running is **six routes**, and it is the reason the site is not simply `nuxt generate`d:

- **`/llms.txt`** — the site's index for a model, generated from every collection the manifest names. Reads D1.
- **`/llms-full.txt`** — the whole documentation concatenated out of `rawbody`. Reads D1.
- **`/rss.xml`** — a feed over the one section `duxt.feed.path` names. Reads D1 when a section is named, and answers an empty channel without touching it when none is.
- **`…/page.md`** — `server/middleware/raw-markdown.ts`, a suffix match over arbitrary paths, which is what "View as Markdown" and the ChatGPT/Claude hand-off links open. Reads D1.
- **`/mcp`** (`@nuxtjs/mcp-toolkit`) — POST, an actual MCP server. Reads D1.
- **`POST /demo/echo`** — the one real endpoint behind the API reference's try-it client, and the only runtime route that never reads D1: it answers from the request body.

A static build kills all six, which are the layer's whole pitch. That is the trade, and it was taken deliberately.

> [!IMPORTANT]
> **That list is a summary of `scripts/check-routes.ts`, which is the authoritative one.** It used to be written out three times — here, in `www/nuxt.config.ts` and in `www/wrangler.jsonc` — the three named different sets, and `llms-full.txt` and `rss.xml` fell through every gap between them. `DEPLOYMENT_ROUTES` there answers asset-or-Worker, D1-or-not, the fallback and the reason per route, and `pnpm check:routes` walks a Cloudflare build's `.output/public` and fails if the artifact disagrees. It is the last step of `build:cf`, so every Workers build runs it — CI's build job included, which means a build whose artifact disagrees never reaches the publish job. It is **not** in `pnpm check`, which builds the Node server. Change the classification there first; a route that moves side is a change to that table, not to prose.

Three Workers facts follow, and all three are guarded by `const cloudflare = NITRO_PRESET.startsWith('cloudflare')` in `www/nuxt.config.ts` — `pnpm build:app`, the gate's SSR check, still builds an ordinary Node server, because every one of them would be wrong locally:

- **Content needs D1.** A Worker has no filesystem and no `node:sqlite`, so `content.database = { type: 'd1', bindingName: 'DB' }` and Content restores its dump into D1 on the first request after a deploy. Five of the six runtime routes above read it — every one but `POST /demo/echo` calls `queryCollection()` at request time. The prerendered pages never touch the binding. `experimental.nativeSqlite` in the layer covers the local case and means nothing here.
- **OG images are build-time only.** `@resvg/resvg-js` is a native Node binding and cannot run on workerd at all, so `ogImage.zeroRuntime` strips the renderer out of the bundle and leaves the images the prerender pass wrote. Every OG image here is a function of a page, and every page is prerendered, so nothing is lost. If a dynamically rendered image is ever needed, the answer is the Takumi/WASM renderer, not the native one.
- **`nodejs_compat` is not optional.** Content's Nitro half, the MCP SDK and Nitro's own runtime all reach for node builtins; without the flag the Worker fails at the first import.
- **`/mcp` needs the `agents` package.** `@nuxtjs/mcp-toolkit` picks a provider by preset, and its Cloudflare one imports `agents/mcp` — Cloudflare's MCP Handler API, a stateless handler, so no Durable Object and no binding. It is an optional peer dependency, so nothing installs it for you: without it the Nitro build dies with `Cannot resolve "agents/mcp" … and externals are not allowed`. It sits in `www/`, not in the layer — a consumer deploying to Node must not carry it — and a consumer deploying duxt to Workers has to add it for the same reason.
- **The site's origin has to be stated.** `i18n.baseUrl` in `www/nuxt.config.ts` is `https://duxt.app`, and the layer's module turns it into `site.url` — the sitemap, the canonicals, robots.txt and the absolute OG URLs all read it. It does not degrade when missing: the sitemap fails the prerender outright with "You must provide a site URL".
- **The OG renders time out under the crawl, and that is not fully solved.** Every page renders an OG image through satori while the crawler walks the site, and at Nitro's default concurrency hundreds contend for one process until they exceed the renderer's 15-second budget: one build produced 335 `createImage timeout` lines and therefore 335 pages with no image — silently, because a missing OG image fails nothing. `prerender.concurrency: 8` brought that to 140, and `ogImage.security.renderTimeout` is raised to 60s as the second lever. **The combination has not yet been measured on a green build.** Watch the `createImage timeout` count in the deploy log; it should be zero.
- **The route rule alone prerenders nothing.** `routeRules` says a page *may* be prerendered; it seeds no crawl. Left at that, the build rendered the 17 Content SQL dumps and not one page — a build that looks fine and ships a fully dynamic site. `nitro.prerender.crawlLinks` with `routes: ['/']` is what actually walks the sidebar. **It walks pages and nothing else.** Nitro queues a discovered link only when its extension is `""` or `.json`, so the `.md` twin beside every page, the `llms.txt` in the footer and `rss.xml` are skipped however prominently they are linked — which is why all three are Worker routes above, and it is a property of Nitro rather than of this config. The one thing that does get past it is `prerenderRoutes` in `DuxtHeader`, and it is there because a version segment like `v0.1.0` reads to the crawler as a file with extension `.0`.
- **`failOnError` is off, and the crawler is now this repo's link checker.** Nuxt exits the build on the first prerender error, and crawling every link finds every dead one: `/demo/api/shipments` and its two operations are linked by the versioned demo section and served by nothing, 42 times across the locales. Those pages fall through to the Worker, which answers them as it would anyway. **The links are a real defect and want fixing where they are generated** — the build prints each one, so the list stays visible rather than going quiet.
- **The origin has to be pinned twice, and the second one is not a duplicate.** `@nuxtjs/i18n` copies its `baseUrl` into `runtimeConfig.public.i18n` with `defu`, and something in the SEO chain seeds that key first, so the module option never reaches the runtime. The runtime then holds an empty string, falls back to the request's own origin, and every page rendered at build time is rendered against `localhost:3000` — nuxt-site-config pushes that over `site.url`, and the prerendered HTML ships `<link rel="canonical" href="http://localhost:3000">`. `runtimeConfig.public.i18n.baseUrl` set explicitly is what fixes it. A served site never shows this, because the fallback resolves to the real host; it took the first prerendered build to surface.
- **Half of every deploy's upload is the same files again, and that is measured rather than suspected.** wrangler uploads what changed; two unrelated pushes uploaded 2,829 of 5,709 assets and 2,876 of 5,774 — within 0.2 points of each other, which is the signature of a floor and not of a diff. Four clean local builds of one commit put a number on it: **808 of 1,414 assets get a new content hash with no source change at all** — every `index.html`, every `_payload.json`, the eight sitemaps and the two build-manifest files. Three values do it: `payload.prerenderedAt` (`Date.now()` per rendered route, written into the payload and into the page's inlined `__NUXT_DATA__`), Nuxt's `buildId` (`randomUUID()`, in three places in every page) and the `new Date()` inside `@nuxtjs/sitemap`'s credits comment. **Everything else is already deterministic** — the 281 OG images, the 37 Content dumps and 227 of 228 `_nuxt` chunks come out byte-identical, so satori renders reproducibly and the build id does not cascade into chunk hashes. Mask the three and two builds still disagree on 19 files, because `payload.data` keys and a sitemap's `hreflang` alternates are written in async-completion order. **Nothing is being changed about any of it, deliberately**: the upload step is 33–39 s of a six-to-seven-minute job, `sitemap.credits: false` is the only supported lever and buys 8 files, pinning `buildId` to the commit is wrong *here* because the release trigger rebuilds the same commit and that build may legitimately differ, and `prerenderedAt` is hard-coded in Nuxt's renderer — read only for truthiness, but overriding it means a layer server plugin rewriting a core payload field in every site that extends duxt. The cost that is worth watching is not the seconds: it is that no edge or browser cache entry for any page survives a deploy that did not touch that page. The full measurement is on #45.

> [!IMPORTANT]
> **The hostname is not in `www/wrangler.jsonc`, deliberately.** DNS record and Workers route are owned end to end by the OpenTofu estate, not by wrangler: wrangler creates and updates routes but **deletes nothing** that disappears from the file, so a retired hostname keeps answering forever. `workers_dev = false` for the same reason a second front door is a bypass. A new hostname is an infrastructure change that has to be **applied**, not merely merged — and nothing here fails if it is missing: the deploy succeeds and the name stays dark.

**The D1 database itself belongs to tofu, not to wrangler** — the same seam the hostname runs along, and for the same reason: no wrangler config creates a D1 database, so one made with `wrangler d1 create` is a resource no state names and nothing ever deletes. `www/wrangler.jsonc` declares only the binding and repeats the id, which is an account-scoped identifier rather than a secret; wrangler refuses to deploy without it. The deploy token in Bitwarden needs `Workers Scripts: Edit` **and `D1: Edit`**. It needs no `Workers Routes: Edit`, because the route is tofu's.

**Deploying on every push to `main`, plus every published release.** `www/` reads `docs/` off the checkout — `origin.ref` in its `app.config.ts` names the repository for the edit links and downloads nothing — so the site publishes the documentation of the commit it is built from, and a documentation fix should not wait for a release. A published release triggers a second, deliberately redundant build after its tag exists: `latest` is resolved from that tag rather than racing release-please. The consequence, stated rather than hidden: the version badge comes from `package.json`, which release-please bumps, so between a promotion and its release the site shows the last released number while documenting what is already on `main`. `main` only moves when the promotion PR merges, so the window is short — but it is real.

**A build is disposable, a publication is not — which is why the deploy is two jobs.** The workflow used to be one job under one `concurrency: deploy-www, cancel-in-progress: false` group, and that serialized whole *runs*: a build for the newest commit could not start while an older publication was still uploading, so a burst of pushes delivered the newest state one full build-and-upload late, every time. Cancelling the combined job instead is not the fix either — it cannot tell a throwaway build from an upload halfway into Cloudflare. So the two halves carry opposite policies:

- **`build`** groups every push to `main` together with `cancel-in-progress: true`, so a newer commit drops the in-flight build for the older one. Anything that is not a push — `workflow_dispatch`, `release: published` — is grouped on `github.run_id` instead, which nothing else can collide with, so a deliberate deploy is never thrown away by a commit that happens to land during it.
- **`publish`** groups on a single constant with `cancel-in-progress: false` and `needs: build`. An upload that has started runs to completion; a newer successful build waits and goes second. A cancelled or failed build never reaches the job at all, so a failing newest build leaves production on the last published version rather than falling back to a stale artefact in a queue.

`.output` crosses between them as an artefact (`retention-days: 1`), and that round trip is the price of being able to cancel a build without risking an upload. The split pays because the two halves are nothing like the same size: the measurement on #45 puts the upload at **33-39 s of a six-to-seven-minute job**, so what a newer push now discards is minutes of build, while the window that cannot be interrupted is well under a minute. The accepted edge: a manual or release build started before a push can publish after it, leaving production a commit behind until the next deploy — both build `main`, and the alternative is a manual deploy a push can silently discard.

**Both jobs build `main`, not the ref they were triggered from.** A release event points at the tag, and building that would roll the site back whenever `main` has moved past it — the release build exists to refresh `latest`, not to republish the tag. A `workflow_dispatch` points at whichever branch the dropdown was left on, and honouring it would make the Run button a two-click route from any branch into production. Only a `push` builds its own commit.

**Freshness is reported, not gated.** The deployment summary (`scripts/deploy-summary.ts`) carries a *Time to publish* row — from the committer date of the published commit to the moment the upload finished. There is no threshold and no non-zero exit: by the time it runs the Worker is live, and a slow queue is a fact to look at rather than an error to raise. The clock starts on the committer date rather than the push because only a `push` payload carries a push time, and a number meaning a different thing per trigger is worse than one that means the same thing every time.

**The Cloudflare build is not part of `pnpm check`.** `check` builds the Node server, which is the SSR gate; a second full Nuxt build would roughly double CI for a target only `main` ever reaches. So a Workers-only breakage surfaces in the deploy rather than in the pull request. That is the accepted trade — `pnpm --filter www preview:cf` runs the built Worker on miniflare locally when a change looks like it might land on that side.

**`@nuxthub/core` was considered and rejected.** It abstracts over the Cloudflare primitives (`hubDatabase`, `hubKV`, `hubBlob`) and wants to own the deploy; Content already speaks D1 directly, the site writes nothing, and route ownership belongs to tofu. It would add a module, a runtime layer and an account for no capability this site uses. A future KV need is a binding in `wrangler.jsonc`, not a framework.

## Branching model

A **`dev` integration branch**: branch off `dev`, PR into `dev`, roll `dev` up into `main`, and release-please releases from `main`. `.tituskirch-skills.json` (`pr.base`) and `.github/dependabot.yml` (`target-branch`) both encode this.

> [!IMPORTANT]
> With `target-branch: 'dev'` pointing at a branch that does not exist, Dependabot opens nothing at all. The `dev` branch has to exist before the first Dependabot run.

`.github/workflows/promotion-pr.yml` opens and updates the rolling draft promotion PR. Mark that PR ready and **merge it with a merge commit, never a squash**: squashing collapses the individual `feat:`/`fix:` commits into the PR's own `chore:` title, and release-please then cuts nothing.

It calls a central body that picks its own target: with a `stage` branch it promotes `dev` into `stage`, without one straight into `main`.

`ci.yml` and `codeql.yml` list both `main` and `dev` in their `on: branches:` filters — without `dev` in `ci.yml`, PRs into `dev` (Dependabot's included) would run no CI at all.

## Visibility

`duxt` is a **public, MIT-licensed** repo, and three defaults depend on that: CodeQL (`.github/workflows/codeql.yml`) needs GitHub Advanced Security, free only on public repos; the MIT `LICENSE` plus the README footer; and the Discord forum links in `.github/ISSUE_TEMPLATE/config.yml` (each open-source repo gets a forum, provisioned from the `infrastructure` repo's OpenTofu). If the repo ever goes private, all three come out together.

## House style for READMEs and meta files

`/write-readme` skill encodes the canonical structure. Key rules: hero block wrapped in `<div align="center">`, prescribed section emojis (✨ Features, 🚀 Setup, 🤝 Contributing, 🛣️ Versioning, 📄 License), license footer always reads `[MIT](LICENSE) © [Titus Kirch](https://github.com/TitusKirch/) / [IT-Dienstleistungen Titus Kirch](https://kirch.dev)`. Use GitHub callouts (`> [!TIP]`, `> [!IMPORTANT]`), never plain blockquotes.

## When working here

- `forgemap` (sibling repo at `../forgemap`) is the de-facto reference implementation of the kirchDev meta conventions. When unsure about a config choice, check what forgemap does.
- The package is published as `@kirchdev/duxt` with `publishConfig.access: public`. It is **not** `"private": true` — do not add that back.
- Once the layer exists, its public surface is what a consumer can override: component, page and `app.config` names would need to stay stable, and a rename becomes a breaking change (`feat!:`). Until then there is no surface to protect.
