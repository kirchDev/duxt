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

- **The theme is shadcn-vue, wired through `shadcn-nuxt`** — a clean Tailwind 4 base with owned components in `app/components/ui/`, not Docus or Nuxt UI. Add one with `pnpm dlx shadcn-vue@latest add <name>`; `components.json` already points the CLI at the layer's own alias. The palette is the neutral shadcn set as CSS variables in `app/assets/css/duxt.css`, `dark` class toggled by `@nuxtjs/color-mode`; a consumer redefines a token in its own stylesheet rather than forking the file.
- **Markdown components are MDC, not MDX.** Content ships MDC, so `::callout{type="tip"}` works with no extra module. Components live in `app/components/content/`.
- **Numbered section prefixes are a non-issue.** Content strips them itself: `1.guides/` renders at `/guides`, `99.adr/` at `/adr`. Verified in `www/`. Reordering does not move a URL; only renaming the name part does.
- **No SQLite driver is installed.** Content's default is `better-sqlite3`, a native addon needing a node-gyp toolchain. `content.experimental.nativeSqlite` uses Node 24's built-in `node:sqlite` instead, which needs no package at all — `www/` builds and renders with neither `better-sqlite3` nor `@libsql/client` present. It is flagged experimental in Content; if that changes, `@libsql/client` is the prebuilt fallback, not `better-sqlite3`.

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
| `pnpm check`        | Runs `lint` + `format` + `typecheck` + `typecheck:app` + `check:policy` — the CI gate |
| `pnpm check:policy` | Proves the two agent policy files ban the same commands    |
| `pnpm lint:fix`     | Auto-fix lint                                              |
| `pnpm format:fix`   | Auto-fix format                                            |
| `pnpm check:fix`    | Auto-fix lint + format                                     |
| `pnpm skills:update`| Update project-scoped agent skills via the skills.sh CLI   |
| `pnpm taze`         | Interactive dependency upgrade check                       |
| `pnpm taze:w`       | Write upgrade results                                      |

There is no test suite yet — the repo currently carries only the meta layer. CI runs whatever `check` chains on PR; adding a check to the `check` script is enough, no workflow change needed.

## Architecture / conventions

- **Node 24, pnpm 12, TypeScript 6.** Pinned via `.nvmrc`, `engines`, and `packageManager`. `pnpm-workspace.yaml` enforces `minimumReleaseAge=4320` (3-day cooldown), isolated node-linker. Don't loosen these without reason. **TypeScript stays on 6 deliberately**: 7 is the native port, whose `exports` map no longer exposes the compiler internals Volar builds on, so `vue-tsc` cannot run on it — and without `vue-tsc` the layer has no typecheck at all. Move to 7 when Volar does, not before. Package-manager enforcement carries no key on purpose: pnpm 11 replaced `packageManagerStrict`/`packageManagerStrictVersion` with `pmOnFail`, whose default `download` already errors on a foreign package manager and fetches the pinned pnpm version — every other value only weakens it, so leave it unset (the rationale sits as a comment in the file).
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
