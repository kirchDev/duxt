---
title: 'Move duxt-owned content out of the layer i18n files'
status: 'in-progress'
created: '2026-09-07'
updated: '2026-09-07'
branch: 'feat/localised-content-sources'
---

# Handoff 0001 — Move duxt-owned content out of the layer i18n files

## Goal

The layer must ship **only** interface chrome — strings any documentation site built on
`@kirchdev/duxt` needs. It currently also ships duxt-the-project's own marketing and
documentation copy, so a stranger extending the layer inherits duxt's landing headline, its
six feature cards and a "Resources" dropdown pointing at duxt's own tech stack.

The repo already stated this rule itself, in `app/utils/duxt-config.ts:75`:

> `duxt.defaults.*` translates the interface the layer draws, never content a site writes.

`sections: []` and `links: []` were emptied for exactly this reason. **This work applies the
same cut to what was missed.** Done means: every string listed under _Findings_ below either
lives in `www/app/app.config.ts` or is gone from the layer, `pnpm check` passes, and
`www/` renders identically to today.

**Audit is complete. No code has been changed yet.** The remaining work is the migration.

## Context

### The decisive constraint: `www/i18n/` is NOT an option

The obvious fix — give `www/` its own locale files — **does not work for three fields**, and
this was verified, not assumed:

`server/utils/duxt-server-text.ts:1` resolves text by importing **only**
`i18n/locales/en/duxt/defaults.json` and walking it (lines 20-29). `resolveDuxtText` answers
`lookup(value) ?? value` (`app/utils/duxt-text.ts:70`), so an unresolvable key is emitted
**verbatim**. A key living in `www/i18n/locales/**` is unresolvable there — it would print the
raw key string into llms.txt, llms-full.txt and the RSS feed. The file's own header comment
(lines 15-16) already documents this.

Three config fields are read by Nitro routes and are therefore bound to a literal or a
per-locale record in `www/app/app.config.ts`:

| Field                      | Read at                                                                             |
| :------------------------- | :---------------------------------------------------------------------------------- |
| `duxt.title`               | `server/routes/llms.txt.get.ts:44`, `llms-full.txt.get.ts:47`, `rss.xml.get.ts:113` |
| `duxt.landing.description` | `llms.txt.get.ts:46`, `llms-full.txt.get.ts:49`, `rss.xml.get.ts:116`               |
| `duxt.feed.title`          | `rss.xml.get.ts`                                                                    |

**Conclusion: `www/` needs no `i18n/` directory at all.** The record form is already www's
established pattern — `app/utils/duxt-text.ts:29-36` defines
`TEXT_KEYS = {badge, copyright, description, headline, label, title}`, and `resolveDuxtText`
(:65-90) accepts a literal, a registered i18n key, or a per-locale record with base-language
fallback (`pt-BR` → any `pt-*`).

### The www override template to copy

`www/app/app.config.ts` (479 lines) already overrides `sources` (:16-33), `sections` (:52-108),
`links` (:127-139), `aside.links` (:143-204), `landing.badge` (:211-223), `landing.preview`
(:227), `landing.command` (:232), `landing.actions` (:234-253), `landing.features` (:260-445),
`footer.copyright` (:449) and `footer.legal` (:453-476).

Its conventions, which the migration must follow:

- **The whole array is written out.** `mergeDuxtConfig` (`app/utils/duxt-config.ts:182-193`)
  replaces an array rather than appending, so partial override is impossible.
- **Every text field is a record keyed by locale**, five entries
  (`en-GB`, `de-DE`, `es-ES`, `fr-FR`, `pt-PT`) serving all seven — `pt-BR` and `en-US` resolve
  through base-language fallback. A sixth `pt-BR` key is added only where Brazilian spelling
  actually differs: exactly three times, at :280, :374, :393.
- **A string identical in every language stays a plain literal** — `'GitHub'` :247,
  `'shadcn-vue'` :381.
- **`command` and `alt` are NOT text keys.** They are absent from `TEXT_KEYS`; a record there
  would render as `[object Object]`. `www/app/app.config.ts:232` is correctly a plain literal.

### What www does not override today — the actual bug

`www/app/app.config.ts` sets **no** `title`, **no** `version`, **no** `navigation`, **no**
`landing.headline` and **no** `landing.description`. duxt.app is therefore rendering five layer
defaults as if they were its own configuration — which is precisely why the leak went unnoticed:
the layer's defaults _are_ www's content.

**A live bug falls out of this:** www's landing badge label is `{version} released`
(`www/app/app.config.ts:212-217`), `app/pages/index.vue:80-83` substitutes `duxt.version`, and
`duxt.version` is the layer default `'v0.0.0'`. duxt.app's hero pill currently reads
**"v0.0.0 released"** and links to the latest GitHub release.

### The feature copy already exists twice

All 12 feature strings under `duxt.defaults.landing.features.*` appear **character-for-character**
in `www/app/app.config.ts:260-445`, in every language. www's array has 8 cards (it adds "Versions
that switch" and "Localised out of the box"), so it never renders the layer's six. That makes
`delete` the right verb for those 12 strings and their ~60 translations — the destination already
holds them, and removing them changes nothing visible on www. **They are the safest first cut.**

### Three keys that look movable and are not

`landing.preview`, `landing.previewOpen` and `landing.featuresTitle` never appear in
`duxtDefaults` at all — they are literal `$t()` calls inside `app/pages/index.vue` (lines 107,
347, 361, 434). There is no config field to move them into, and deleting them makes the layer's
own landing component print raw keys on every site. They are chrome by the stated rule, despite
carrying the `landing.` prefix.

### Scope that came back clean — do not re-sweep

- **The 70 chrome keys outside `defaults.json`** (code 7, devtools 1, error 4, footer 1,
  locale 1, nav 10, page 19, search 6, shortcuts 5, theme 1, toc 1, version 14) are clean except
  `duxt.devtools.preview`. Greps for `duxt|kirch|nuxt|shadcn|tailwind|github|npm|pnpm|mdc|llms`
  across all 71 locale files hit nothing else. Greps for `http|github|.app|.dev|.com` hit
  **zero** locale files.
- **No locale drift.** de, es, fr, pt each carry exactly the English key set. pt-BR's 26-of-96
  gap is by design — `nuxt.config.ts:174-190` loads the full `pt/` set first, then the overlay.
- **`app/pages/index.vue` is a generic renderer.** Every band is config-gated and draws nothing
  when unconfigured (preview :316, features :425, badge :224, command :281, actions :260,
  description :252; the h1 at :248 falls back to `duxt.title`). Emptying `landing.*` in
  `duxt-config.ts` requires **no** change to index.vue.
- **`nuxt.config.ts` has no `app`, `site`, `seo`, `ogImage`, `schemaOrg` or `robots` key.** No
  author, no social handle, no default og:image, no favicon in the layer.
- **`content.config.ts`, `mdc.config.ts`, `content-cache.ts`, `validate-report.ts`,
  `sources*.ts`, `modules/**`, `server/middleware/raw-markdown.ts`, `server/devtools/**`** carry
  no duxt-project content. Their only English prose is build-log text.
- **No test breaks.** Nothing under `tests/` imports `duxtDefaults` or reads `i18n/locales/**`.
  The single `duxt.defaults.*` reference is `duxt.defaults.aside.title` in
  `tests/duxt-text.test.ts:6,42,52`, and `aside.title` stays.

### Findings — the 33 confirmed leaks

`delete` = the text already exists in www, drop it from the layer.
`→ www` = must be written into `www/app/app.config.ts` or the site loses it.

| Key / field                                                                  | Location                         | Action                               |
| :--------------------------------------------------------------------------- | :------------------------------- | :----------------------------------- |
| `duxt.title` (`'duxt'`)                                                      | `app/utils/duxt-config.ts:14`    | → www                                |
| `duxt.version` (`'v0.0.0'`)                                                  | `app/utils/duxt-config.ts:15`    | delete (fixes the hero pill)         |
| `duxt.navigation[1]` — the whole Resources dropdown, 5 URLs + 5 descriptions | `app/utils/duxt-config.ts:21-72` | → www                                |
| `duxt.defaults.navigation.resources` (`'Resources'`)                         | `i18n/.../defaults.json:6`       | → www                                |
| `duxt.defaults.resources.nuxt`                                               | `:9`                             | → www                                |
| `duxt.defaults.resources.content`                                            | `:10`                            | → www                                |
| `duxt.defaults.resources.shadcn`                                             | `:11`                            | → www                                |
| `duxt.defaults.resources.tailwind`                                           | `:12`                            | → www                                |
| `duxt.defaults.resources.mdc`                                                | `:13`                            | → www                                |
| `duxt.defaults.landing.headline`                                             | `:16`                            | → www (**text exists nowhere else**) |
| `duxt.defaults.landing.description`                                          | `:17`                            | → www (**text exists nowhere else**) |
| `landing.features.extend.{title,description}`                                | `:25-26`                         | delete                               |
| `landing.features.sources.{title,description}`                               | `:29-30`                         | delete                               |
| `landing.features.git.{title,description}`                                   | `:33-34`                         | delete                               |
| `landing.features.shadcn.{title,description}`                                | `:37-38`                         | delete                               |
| `landing.features.mdc.{title,description}`                                   | `:41-42`                         | delete                               |
| `landing.features.machine.{title,description}`                               | `:45-46`                         | delete                               |
| `duxt.devtools.preview` — `"The {tab} panel of duxt's devtools tab"`         | `i18n/.../devtools.json:4`       | reword to drop the product name      |
| `mcp.name` (`'duxt documentation'`)                                          | `nuxt.config.ts:282`             | → www                                |
| `'pt-BR/duxt/defaults.json'` registration                                    | `nuxt.config.ts:196`             | delete (file becomes empty)          |

**Kept deliberately**, with the reasoning already written into the files:
`duxt.defaults.navigation.docs`, `landing.actions.docs`, `landing.preview`,
`landing.previewOpen`, `landing.featuresTitle`, `aside.title` (`'Community'` names nobody and
its block is `v-if`-gated on `aside.links`, which the layer ships empty — `DuxtToc.vue:63`).

### Open, not settled

Three findings came back `unsure` and were never adjudicated:

1. `i18n.defaultLocale: 'en-GB'` (`nuxt.config.ts:424`) — duxt's own choice, and with
   `strategy: 'prefix_except_default'` it decides which language every consumer serves
   unprefixed. The file's own comment warns that changing it later moves every page.
2. `content.build.markdown.highlight.langs` (`nuxt.config.ts:320`) — mechanics, not prose, but
   `'php'` is in the list because kirchDev documents Laravel.
3. `public/devtools` (`package.json:38`) — ten committed HTML fixtures (196 KB) shipped in the
   published tarball, existing only so duxt's own docs pages can embed them via the
   `::devtools-panel` MDC component.

### Dead ends and process notes

- **The audit workflow was run at too fine a grain.** Finders were instructed to enumerate every
  leaf key individually rather than group them, which produced 174 raw findings (94 after dedup)
  and fanned out to 358 agents before it was stopped for budget. All 8 finders completed; the
  adversarial verify phase reached 330 of ~522 lens votes (286 upheld, 44 refuted) and the
  synthesis never ran. **If this is re-run, group the keys.** The findings above are the finder
  output, which is complete; only the per-finding verification is partial.
- The verify votes cannot be reattached to their findings — the workflow journal keys are
  opaque hashes, not labels.

## Progress

**Nothing from this work is uncommitted — the audit produced no code changes.**

The working tree does carry three unrelated modifications that were **not** made by this work
and were deliberately left alone:

- `app/components/DuxtVersion.vue` — version badge switched from `variant="secondary"` to
  `variant="default"`
- `www/nuxt.config.ts` — a `css: ['~/assets/css/brand.css']` entry
- `www/app/assets/css/brand.css` — untracked, new

Whoever resumes this should establish whether those belong to someone else's in-flight work
before committing anything.

## Next steps

1. **Delete the 12 feature strings** from `i18n/locales/{en,de,es,fr,pt}/duxt/defaults.json` and
   set `features: []` in `duxtDefaults` (`app/utils/duxt-config.ts:127-158`). Nothing visible
   changes on www. Verify with `pnpm build:app`.
2. **Delete `i18n/locales/pt-BR/duxt/defaults.json`** — now empty — and remove its registration
   from `nuxt.config.ts:196`.
3. **Write `title`, `landing.headline` and `landing.description` into
   `www/app/app.config.ts`** in the record form, five locale entries each, before removing them
   from the layer. The headline and description text exists nowhere else in the repo — copy it
   out of `i18n/locales/*/duxt/defaults.json` first.
4. **Then** remove `title` and `landing.{headline,description}` from `duxtDefaults` and their
   keys from all six `defaults.json` files. Confirm llms.txt, llms-full.txt and rss.xml still
   carry real text and not a raw key — this is the step the server-text constraint governs.
5. **Move the Resources dropdown**: write `navigation` out in full in `www/app/app.config.ts`
   (both entries — the array is replaced, not merged), then set `navigation` in `duxtDefaults`
   to the single Docs entry, and delete `duxt.defaults.resources.*` and
   `duxt.defaults.navigation.resources` from all six locale files.
6. **Drop `version: 'v0.0.0'`** from `duxtDefaults` and set the real version in
   `www/app/app.config.ts`, fixing the "v0.0.0 released" hero pill.
7. **Reword `duxt.devtools.preview`** in all five locale files to name no product.
8. **Move `mcp.name`** off the `'duxt documentation'` literal in `nuxt.config.ts:282`.
9. **Add a regression test.** `tests/contrast.test.ts` is the repo's own precedent for parsing a
   layer asset at test time to enforce a rule the other gates cannot see. A test that greps the
   layer's locale files for product names and URLs is the cheap way to stop this recurring.
10. Run `pnpm check` and commit as a series via `atomic-commit`.

## Open questions

1. **`duxt.title` — remove the default, or keep a neutral one?** Thirteen call sites depend on
   it, six of them SEO surfaces (title template, 404 title, OG card, schema.org WebSite,
   llms.txt H1, RSS channel title). `app/app.vue:41-42` already prints the page title alone when
   there is no site title, so an undefined default degrades correctly — but every consumer then
   gets an untitled site until they set one. Same shape as the `sections`/`links` decision.
2. **Should `DuxtConfig` gain a `description` field separate from `landing.description`?**
   Today one marketing sentence doubles as the landing paragraph, the `<meta name="description">`,
   the llms.txt blurb and the RSS feed description. Splitting them would let the machine outputs
   read a site's own sentence without borrowing landing copy. Without it, the fallback is the
   literal `'Documentation.'` (`llms.txt.get.ts:46`, `llms-full.txt.get.ts:49`,
   `rss.xml.get.ts:118`) — honest but bland.
3. **The three `unsure` findings above** — `defaultLocale`, the `highlight.langs` list, and the
   196 KB of `public/devtools` fixtures in the published tarball. Each is defensible; none was
   adjudicated.
4. **Is `aside.title` (`'Community'`) really chrome?** One finder argued it fails the test
   despite the defence written at `app/utils/duxt-config.ts:166-173`. The counter-argument —
   it names nobody and its block never renders until a consumer fills `aside.links` — held up
   under review, but the owner set this line and may want to move it.
