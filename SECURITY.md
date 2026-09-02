# Security Policy

## Scope

`duxt` is a **Nuxt layer published as `@kirchdev/duxt`** — it runs inside a consumer's Nuxt application at build time and at runtime. A vulnerability here reaches every site built on it.

The supported version is always the **latest release**. There are no maintenance branches to back-port fixes to; upgrade to the current release to pick up a fix.

## Reporting a Vulnerability

**Please do not file a public GitHub issue for security problems.**

In the context of this layer, a "vulnerability" typically means:

- A path that leaks a private repository's content or a source token into the built output.
- Unescaped content rendered into a page, or a server route that serves more than the docs it should.
- An insecure default in a shipped workflow (e.g. overly broad `permissions`).
- A dependency in `package.json` that introduces a known CVE.

Use one of the following private channels:

1. **GitHub Private Vulnerability Reporting** (preferred): open a private advisory at <https://github.com/kirchDev/duxt/security/advisories/new>.
2. **Email**: [titus.kirch@kirch.dev](mailto:titus.kirch@kirch.dev). PGP available on request.

Please include:

- A description of the vulnerability and its impact on sites built on the layer.
- Steps to reproduce.
- Any suggested fix, if you have one.

### What to expect

| Stage                        | Target timeline                                   |
| :--------------------------- | :------------------------------------------------ |
| Acknowledgement of report    | within **3 business days**                        |
| Initial assessment & triage  | within **7 business days**                        |
| Patch released (if accepted) | depends on severity — critical issues prioritised |
| Public disclosure & advisory | coordinated with reporter after the patch ships   |

## Credit

Reporters who follow this process responsibly are credited in the changelog and the corresponding GitHub Security Advisory, unless they prefer to remain anonymous.

---

Maintained by [Titus Kirch](https://github.com/TitusKirch/) / [IT-Dienstleistungen Titus Kirch](https://kirch.dev).
