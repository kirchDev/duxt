# duxt

## What this repo is

`duxt` is a **Nuxt documentation layer on Nuxt Content v3**, published as `@kirchdev/duxt` and consumed with `extends: ['@kirchdev/duxt']`. It is a **layer that carries a module**: theme, pages, components, `app.config` defaults and collections are layer material a consumer overrides selectively; collection generation, `llms.txt` and the MCP route are build-time and server work declared in the layer's config. `packages/` also carries the companion layers `duxt-typesense`, `duxt-meilisearch` and `duxt-wiki`.

**Content v3 already does git-native sourcing — do not rebuild it.** A `CollectionSource` takes `repository` (url, branch, tag, auth); Content downloads and hash-caches it under `.data/content/`. `loadContentConfig` reads `content.config.ts` from **every** layer and merges them (later wins), through c12 — so `content.config.ts` is executed code and may compute its collections at load time. There is no collection-injection hook, and none is needed.

Once a name is public — component, page, `app.config` key, hook — a rename is a breaking change (`feat!:`).

## Decisions

- **Theme: shadcn-vue via `shadcn-nuxt`** (ADR-0008), owned components in `app/components/ui/`, not Docus or Nuxt UI. Add one with `pnpm dlx shadcn-vue@latest add <name>`. If the CLI refuses (it tries to install `reka-ui`/`@vueuse/core`/`@lucide/vue` into the workspace root), fetch `https://www.shadcn-vue.com/r/styles/new-york/<name>.json` and write the files by hand, swapping `@/…` for `@duxt/…` and every `lucide-vue-next` import for `<Icon name="lucide:…">`. **Components are prefixed `Ui`** (`shadcn.prefix`): unprefixed, the layer would auto-import `Button`, `Input`, `Card` … into every consuming site, and a collision resolves silently. The palette is CSS variables in `app/assets/css/duxt.css`, `dark` toggled by `@nuxtjs/color-mode`; consumers redefine tokens in their own stylesheet.
- **Icons: the domain picks the set.** The stack (file, fence language, tool) → `vscode-icons` (`app/utils/file-icons.ts`, package-manager tabs); a third party as itself → `simple-icons`; a locale's region → `flag`; everything else → `lucide` (default, inherits `currentColor`). When both collections carry a brand, the domain still decides (`vscode-icons:file-type-claude` for a Claude file, `simple-icons:claude` for the platform). Never tint a monochrome mark. Full rule and licences: `docs/7.conventions/2.icons.md`.
- **Markdown components are MDC, not MDX** (ADR-0004), in `app/components/content/`.
- **Numbered prefixes are stripped by Content** (`1.guides/` → `/guides`). Reordering never moves a URL; renaming the name part does.
- **No SQLite driver is installed.** `content.experimental.sqliteConnector: 'native'` uses Node's `node:sqlite`. Fallback if that stops being viable: `@libsql/client`, never `better-sqlite3`. Never set a deprecated `content.experimental` option — a consumer cannot see or silence a layer's warning; `tests/sqlite-connector.test.ts` fails on any. `@libsql/client` and `pg` in `apps/www` devDependencies exist only for the adapter matrix; nothing imports them.
- **Database adapters.** The layer reads the deployed database **only** through `queryCollection()`; `tests/content-database.test.ts` fails on any driver import under `server/` or `app/` and keeps the list of build-time database readers closed. The one runtime exception is the content-bundle importer (`modules/runtime/content-bundles/runtime.ts`, ADR-0013), which `modules/content-bundles.ts` registers only for production Node SQLite servers; with `runtimeConfig.duxt.contentBundles.dir` / `DUXT_CONTENT_BUNDLE_DIR` unset it opens nothing. Build-time readers (`build/content/content-cache.ts`, `modules/git-meta.ts`, `duxt report`) read `content._localDatabase` (`.data/content/contents.sqlite`), never `content.database`, so no adapter choice moves them. Verified: `sqlite`, `d1`, `libsql`, `postgresql`. **`pglite` is untested** — do not claim otherwise without a run. `.github/workflows/adapters.yml` builds `apps/www` per adapter (`DUXT_CONTENT_ADAPTER`) and runs `pnpm check:adapters`; it is deliberately not in `pnpm check`. Consumer docs: `docs/2.concepts/11.databases.md`.
- **One extension hook: `duxt:search:records`.** Contract in `build/search/search-records.ts`; `modules/search-records.ts` decides when it fires and skips the payload while nothing listens (fails open). An extension is a **Nuxt layer** — no `duxt.plugins` API, no generic registry. `sectionTypes` is the extension point for generated content types; UI changes go through slots and component shadowing. **A second hook needs a consumer that cannot be written without it**: a hook name is public surface and can never be removed.
- **Integration contributions are build-only `duxt.build.ts` files** (ADR-0014). Every layer may contribute `sectionTypes`, `sourceFlavors` and a `pageSchema` callback; the site wins, maps replace by entry, schema callbacks receive Content's own `z`. Parsers never go in `app.config.ts`. Source flavors write `navigationRank`/`navigationGroup`; a page-less folder inherits its lowest child rank. `@kirchdev/duxt/unstable` is the one provisional export until #129 settles. `duxt report` reads layer metadata recorded at prepare time and never reruns `nuxt.config.ts`; stale metadata requires prepare/build. Guarded by `tests/integration-boundaries.test.ts`, `apps/www/fixtures/build-extension` and `check:extensions`.
- **MCP tools reach the request through `useEvent()`**, so the layer turns on `nitro.experimental.asyncContext` — the one Nitro flag it imposes. A tool handler's `extra` is the MCP SDK's `RequestHandlerExtra` and carries **no H3 event** (#90). A thrown handler becomes an `isError` result, not a JSON-RPC error; `check:adapters` reports it as a failure. `tests/mcp-tools.test.ts` builds `extra` as a proxy that throws on any field the SDK does not define — keep it that way.
- **An assertion must be able to fail for the reason it names.** `list_pages` is bounded by `DUXT_PAGE_SIZE`, so `check:adapters` asks it for *some* rows and asks `read_page` for *that* page. Same rule for every fixture.
- **Content's per-collection search stays the default** (ADR-0010). A replacement must pass `searchIndexVerdict` in `apps/www/scripts/search-index-bench.ts` — re-run it, don't re-argue it. Pagefind remains an add-on layer.

## Repo shape

A Turborepo monorepo; the root is not a package (ADR-0011).

- `packages/duxt` — the layer. `main: "./nuxt.config.ts"` plus a `files` allowlist; build-time modules sit in topic folders under `build/`. The `exports` map is public surface. `nuxt` is a peerDependency here and a real dependency only of `apps/www`.
- `packages/duxt-*` — provider layers, peer-depending on `@kirchdev/duxt` with a wide range (`>=0.x.0 <1`), never `^0.x`.
- `apps/www` — the development site and the scripts/tests that read its build. Wants edge cases, ugly frontmatter, several sources and tags. [`kirchDev/duxt-starter`](https://github.com/kirchDev/duxt-starter) is a **different artifact** (minimal, exemplary) — do not conflate them.
- Root — workspace/meta config, `scripts/check-policy-parity.ts`, `scripts/git-dir-guard.ts`, `docs/` (published by `apps/www`) and the layer's `CHANGELOG.md`.

**Path convention:** a path starting with `app/`, `build/`, `i18n/`, `modules/`, `server/` or `tests/`, and a bare `nuxt.config.ts`/`content.config.ts`, is relative to `packages/duxt`. Everything else is relative to the repo root.

> [!IMPORTANT]
> **Nothing layer-relative resolves the way it reads.** Assume any path in the layer is read from the consumer's directory until proven otherwise. `css` and `componentDir` go through the `layer()` helper (`import.meta.url`); the `@` alias belongs to the consumer, so the layer imports via `@duxt`.

> [!IMPORTANT]
> **A layer's collections resolve against the LAYER.** Content sets `__rootDir` per layer, so a relative `source.cwd` points into this package. The layer computes an absolute path at load time (`join(process.cwd(), 'docs')`) — the seam the `sources` shorthand sits on.

## Commands

The root `package.json` is the authoritative list; every package task delegates to `turbo run <task> --filter=…`.

| Command | What it does |
| :-- | :-- |
| `pnpm check` | The CI gate — the full chain is the `check` script. CI runs whatever it chains, so adding a check needs no workflow change. |
| `pnpm check:fix` | Auto-fix lint (`oxlint`) + format (`oxfmt`). `pnpm format` is the **check**, not the fix. |
| `pnpm typecheck` / `typecheck:app` | `tsc` over meta and package scripts / `nuxt typecheck` over the layer via `apps/www`. |
| `pnpm build:app` | Node-server build of `apps/www` — the gate's SSR check. |
| `pnpm build:www` / `deploy:www` / `publish:www` | Workers build (ends with `check:routes`) / build + `wrangler deploy` / deploy what `.output` holds. |
| `pnpm check:adapters`, `pnpm check:routes` | Not in `check`: driven by `adapters.yml` and by every Workers build respectively. |
| `pnpm og:cache` | OG-image cache key, or `--report` on what a build reused. |
| `pnpm skills:update`, `pnpm taze` / `taze:w` | Refresh project skills; dependency upgrade check / write. |

**Test rules.** Unit tests cover pure logic (vitest, `packages/duxt/tests`, `apps/www/tests`). Components are not unit-tested — real failures here were SSR failures, so `check` builds the site and runs browser and build checks over it. `tests/contrast.test.ts` measures palette contrast because jsdom cannot. **A component the build never renders is a component nothing checks** — add a fixture page (e.g. `apps/www/demo/docs/3.images.md`). **A width nothing measures is a width nothing protects** — `check:overflow` asserts no sideways scroll at 320/412px *and* that headings aren't clipped, so `truncate`/`overflow-hidden` cannot buy a green gate. Browser checks (`apps/www/scripts/browser.ts`) use whatever Chromium-family browser is installed; **none is ever downloaded**.

## Conventions

- **Runtime:** Node 26.13.1 (`.nvmrc`, CI), pnpm 12 (`packageManager`), TypeScript 6. Published packages keep `engines.node >=24.15.0`. `pnpm-workspace.yaml` enforces `minimumReleaseAge` (3 days) and the isolated linker — don't loosen. **TypeScript stays on 6** until Volar supports 7: `vue-tsc` cannot run on it. Leave `pmOnFail` unset — its default is the strictest.
- **No build step for meta scripts:** `.ts` run directly on Node; the root `tsconfig.json` is `erasableSyntaxOnly`, so no enums or parameter properties.
- **oxc, not eslint/prettier** (`.oxlintrc.json`, `.oxfmtrc.json`). `docs/**/*.md`, `README.md`, `AGENTS.md` and changelogs are excluded from oxfmt — it breaks MDC blocks. `lint-staged.config.ts` repeats that list and must stay in step.
- **Heavy browser dependencies are `import()`ed on demand, never bundled** (mermaid, CodeMirror). That is why the body editor is not Monaco.
- **Turborepo cache is local only** — no remote cache, no token. Cache a task only where its declared inputs (`turbo.json`) determine its result; build-reading checks are `cache: false`. `envMode` stays `loose` — the checks read `DUXT_*`, `NITRO_PRESET` and runner variables.
- **Hoisting:** every layer dependency the site has to reach must be in `publicHoistPattern` (`pnpm-workspace.yaml`). Missing ones break `nuxt typecheck` (Content queries type as `never`) and the Workers build (`shiki`'s `onig.wasm`).
- **Husky** runs `lint-staged` and `commitlint`. **Conventional Commits.** Never `--no-verify` unless explicitly asked.
- **Releases: release-me** (`release-me.yaml`, `.github/workflows/release.yml`). Linked versioning across the four packages, one shared release PR, only changed components release; tags read `<component>@vX.Y.Z`. A component is credited only with commits touching its `path` — a `feat:`/`fix:` confined to root `docs/` or `apps/www` releases nothing. The layer's changelog stays at the repo root (`apps/www` reads it per version). Tag-based source versions read component tags (`tagComponent` in `build/sources/sources-resolve.ts`; the site's sources are in `apps/www/app/site-sources.ts`).
- **Publishing** is decided by the registry: a package publishes when its version has a tag and npm lacks it; pushes to `main` publish `dev-main` prereleases for changed packages. `release.yml` is the npm trusted publisher's file name — renaming it breaks publishing.
- **Workflows** are pinned to commit SHAs with the version as a comment; Dependabot bumps them. `apps/www/tests/action-pins.test.ts` enforces it (`FLOATING` stays empty unless an exception is named there).
- **CodeQL** scans `actions` + `javascript-typescript` (`security-extended,security-and-quality`), path-filtered. **Dependabot** groups minor/patch per ecosystem; majors come separately.

## Workflows are calls, not copies

Workflows are stubs calling bodies in [`kirchDev/workflows`](https://github.com/kirchDev/workflows). **Five carry their own jobs, each justified in its header:** `deploy.yml`, `adapters.yml`, `prerender-bench.yml`, `release.yml`, `content-packer.yml`. A sixth needs that argument in writing first. Never paste a body back in — add an input centrally or an own job beside the call (`docs/1.guides/2.add-a-body.md` in that repo).

## Deployment — `apps/www` on Cloudflare Workers

One Worker with static assets, built in GitHub Actions and uploaded by wrangler (`.github/workflows/deploy.yml`, preset `cloudflare-module`) on every push to `main` and on every published release. Everything prerenderable is prerendered; the routes that stay dynamic (`llms.txt`, `llms-full.txt`, `rss.xml`, `…/page.md`, `/mcp`, `/demo/echo` and helpers) are why the site is not `nuxt generate`d. Try-it clients reach `/demo/echo` on their own origin (`tryIt.baseUrl: '/'`); an absolute host sends a local reader to production.

> [!IMPORTANT]
> **`apps/www/scripts/check-routes.ts` (`DEPLOYMENT_ROUTES`) is the authoritative route classification** — asset or Worker, D1 or not, and why. `check:routes` compares it against the build and Nitro's handler manifest (failing open is reported, never passed). Change a route's side there, not in prose.

Workers rules, all guarded by `NITRO_PRESET.startsWith('cloudflare')` in `apps/www/nuxt.config.ts` because they are wrong locally:

- Content uses **D1** (`bindingName: 'DB'`); prerendered pages never touch it.
- **OG images are build-time only** (`ogImage.zeroRuntime`; resvg cannot run on workerd). A dynamic one would need the Takumi/WASM renderer. They are cached between builds (`ogImage.buildCache`, `build/og-image/og-image-cache.ts`, cache step in `deploy.yml`); a stale image is never served.
- **`nodejs_compat` is required.** `/mcp` needs the optional peer `agents` — in `apps/www`, never in the layer.
- **The origin must be pinned twice:** `i18n.baseUrl` *and* `runtimeConfig.public.i18n.baseUrl`. Without the second, prerendered canonicals point at `localhost:3000`; without the first, the sitemap fails the prerender.
- **`routeRules` prerender nothing alone** — `nitro.prerender.crawlLinks` with `routes: ['/']` seeds the crawl. The crawler only follows extensionless and `.json` links, which is why `.md`, `llms.txt` and `rss.xml` are Worker routes and why `DuxtHeader` calls `prerenderRoutes` for version segments like `v0.1.0`.
- **Prerender concurrency stays at 8** (`DUXT_PRERENDER_CONCURRENCY`) with `ogImage.security.renderTimeout` at 60s. The question is open: change it only on a verdict from `.github/workflows/prerender-bench.yml` (rule in `apps/www/scripts/prerender-bench.ts`), which runs only from the default branch.
- **Version links check their target exists** before rendering; the target's overview is the fallback. `failOnError` stays off.
- **Non-deterministic build output is accepted** (`prerenderedAt`, `buildId`, sitemap credits — measured on #45). Do not patch core payload fields from the layer.

> [!IMPORTANT]
> **Hostname, route and D1 database belong to the OpenTofu estate, not wrangler.** `wrangler.jsonc` declares only the binding and its id; `workers_dev = false`. A new hostname must be **applied** in infrastructure — nothing here fails if it is missing. The deploy token (`workers-deploy-ci`) has **no D1 rights**: `wrangler d1 execute` from CI fails with `7403`. Database repairs are the Worker's job (`server/plugins/content-restore-recovery.ts`).

- The deploy is **two jobs**: `build` (pushes cancel each other; dispatch/release builds never get cancelled) and `publish` (never cancelled, serialised, `needs: build`). Both build `main`, whatever ref triggered them.
- The site documents the commit it is built from; the version badge lags until a release lands.
- Freshness ("Time to publish", `apps/www/scripts/deploy-summary.ts`) is reported, never gated.
- The Workers build is **not** in `pnpm check`; use `pnpm --filter www preview:cf` when a change might break that side.
- `@nuxthub/core` was rejected: no capability this site uses. A KV need is a binding in `wrangler.jsonc`.

## Branching

Branch off `dev`, PR into `dev`, roll `dev` into `main`; releases cut from `main`. `.github/workflows/promotion-pr.yml` keeps a draft promotion PR — **merge it with a merge commit, never a squash**, or the individual commits never reach the release. `ci.yml` and `codeql.yml` must list both `main` and `dev`. The `dev` branch must exist or Dependabot (`target-branch: dev`) opens nothing.

## Permission policy

`.claude/settings.json`: a **generous `deny`, a short `allow`**.

- **`deny`** may cover stacks the repo doesn't have. Block what harms the machine or remote state or destroys work without a recovery path (incl. `git reflog expire`, `git gc --prune=now`). Ordinary local cleanup (`rm -rf node_modules`, `docker compose down -v`, deleting a remote branch) prompts instead.
- **`allow`** only what runs many times per session (read-only git, `ls`/`grep`/`rg`, the project's check scripts, plain `git push`).
- Anything in neither list prompts — the right default.

> [!IMPORTANT]
> **Never allow a rule that runs arbitrary code** (`tinker --execute`, `pnpm exec turbo run`, `find . *`, raw `pnpm dlx`, SQL-executing MCP tools). `turbo` stays out of `allow`.

Permissions cannot see which branch a push targets (use branch protection) and miss flags placed before a subcommand. **Codex carries the same policy in `.codex/rules/default.rules`; change both together.** `pnpm check:policy` proves parity; undeclared differences fail, and so do stale declarations in its `DELIBERATE` list (mirrored in the rules header). It proves equal spellings, not completeness — neither language normalises flag order or case. Check a Codex rule with `codex execpolicy check --pretty --rules .codex/rules/default.rules -- <cmd>`.

## AI & skills

`.tituskirch-skills.json` configures the TitusKirch skills (reconcile with `tituskirch-skills-config`); they are installed via `pnpm dlx skills add TitusKirch/skills`, not vendored. `.claude/settings.local.json` is gitignored.

## Visibility & README style

Public and MIT. CodeQL, `LICENSE` + README footer and the Discord links in `.github/ISSUE_TEMPLATE/config.yml` depend on that and go together if it ever changes. READMEs follow `/write-readme`; the footer reads `[MIT](LICENSE) © [Titus Kirch](https://github.com/TitusKirch/) / [IT-Dienstleistungen Titus Kirch](https://kirch.dev)`. Use GitHub callouts, never plain blockquotes.

## Traps

- **Never build from a checkout under a `.git` directory.** nitropack and Vite exclude `.git` paths, so the build fails as `defineMcpTool is not defined` and vitest loses `tests/shortcuts.test.ts` (#87). `scripts/git-dir-guard.ts` refuses with the reason. Create worktrees outside the repo (`git worktree add ../duxt-<branch>`); `.claude/worktrees/…` is fine.
- **Stop `pnpm --filter www dev` before builds, checks or `typecheck:app`** — they share Content's cache and Nuxt artifacts; the site's ownership guard exits naming the owner. Never delete a live process's lock, `.data` or SQLite files.
- `packages/duxt` must **not** be `"private": true`; the root **is** private. `prepack`/`postpack` copy README and LICENSE into the tarball.
- When unsure about a meta convention, check what `../forgemap` does.

## Runtime and verification limits

- `useDuxtRequest` owns the OpenAPI/Bruno try-it lifecycle: abort on cancel/dispose, 30 s timeout incl. body reads, 1 MiB streamed preview, no credential persistence, no proxy. `check:interactive` proves it in Chromium, along with Mermaid IDs and theme handling.
- MCP listings cache paths only in production. Search keeps Unicode matching and locale precedence and reads at most 64 bodies at once. HTTP Markdown and MCP `read_page` share `duxtDocPage`.
- Built-server checks use a fresh SQLite file per child process.
- `check:seo` covers prerendered and live HTML; Workers builds pin the production URL variables and run `check:seo:static`. Local dotenv must never set the production origin.
- `check:security` audits every run; `security-advisories.json` owns each accepted advisory (path, versions, reachability, remediation, expiry) — unknown paths, changed severity and expired reviews fail. Security overrides in `pnpm-workspace.yaml` target specific parents, keep the cooldown, and are removed once the parent ships a fix. Root overrides do not reach consumers of the published layer.
