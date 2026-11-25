# Contributing to duxt

Thanks for contributing! 🛠️ This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting issues

- **Questions, ideas, possible bugs**: the [Discord forum](https://discord.duxt.app/).
- **Confirmed bugs**: a [Bug report](https://github.com/kirchDev/duxt/issues/new?template=bug_report.yml), with a minimal reproduction.
- **Feature requests**: a [Feature request](https://github.com/kirchDev/duxt/issues/new?template=feature_request.yml).
- **Security vulnerabilities**: never a public issue — see [SECURITY.md](SECURITY.md).

## Development setup

Node **26** (`.nvmrc`; the published packages support 24.15+), **pnpm 12**, `git`.

```bash
git clone https://github.com/kirchDev/duxt.git
cd duxt
pnpm install   # wires husky hooks
```

Run the site with `pnpm --filter www dev`, and stop it before `pnpm build:app`, `pnpm check` or `pnpm typecheck:app`: they share Content's cache and Nuxt's build artifacts, and a conflicting command exits naming the owning PID. After a crash, retry once that process has exited. Never delete a live process's lock, `.data`, SQLite or WAL files — a lock's age is no proof its owner stopped.

Layout and conventions: [AGENTS.md](AGENTS.md). Run everything from the root.

## Checks

`pnpm check` is the CI gate; the chain is the `check` script in `package.json`. `pnpm check:fix` auto-fixes lint and format. Keep it green before you push.

## Branching & PRs

1. Branch off `dev`; PRs target `dev`, which is rolled up into `main` for releases.
2. [Conventional Commits](https://www.conventionalcommits.org/), enforced by commitlint (`feat!:` or `BREAKING CHANGE:` for breaking changes).
3. One concern per PR, docs updated with it.

Husky runs `lint-staged` (oxlint + oxfmt) and commitlint on commit. If a hook fails, fix it and commit again — never `--no-verify`.

## Agent instructions

Agent rules live in [AGENTS.md](AGENTS.md). Claude Code (v2.1.277+) loads it on its own as long as no `CLAUDE.md` or `CLAUDE.local.md` sits in the working directory or above — don't add one to the repo.

## License

Contributions are licensed under the [MIT License](LICENSE).
