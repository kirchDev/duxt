---
title: 'Move duxt-owned content out of the layer i18n files'
status: 'in-progress'
created: '2026-09-07'
updated: '2026-09-07'
branch: 'feat/localised-content-sources'
---

# Handoff 0001 — Move duxt-owned content out of the layer i18n files

> **The plan body below is in German**, the repo owner's language. The repo's
> configured prose language is `en`, but the plan carries 40 translated strings
> that must survive the migration byte-exactly, and re-typing them through a
> translation is exactly how they would be lost. The frontmatter and this frame
> stay English; the plan stays as written.

## Goal

The layer must ship **only** interface chrome — strings any documentation site built on
`@kirchdev/duxt` needs. It currently also ships duxt-the-project's own marketing copy, so a
stranger extending the layer inherits duxt's landing headline, six feature cards, a "Resources"
dropdown pointing at duxt's own tech stack, the site name `duxt`, and a version badge reading
`v0.0.0`.

The rule is already written into `app/utils/duxt-config.ts:75-76`:

> `duxt.defaults.*` translates the interface the layer draws, never content a site writes.

`sections: []` and `links: []` were emptied for exactly this reason. **This work applies the
same cut to what was missed.** Done means: every string in the table below either lives in
`www/app/app.config.ts` or is gone from the layer, `pnpm check` passes, and www renders
identically to today after **every** commit, not just the last.

**Audit and verification are both complete. No code has been changed yet.**

## Context

### Corrections to this handoff's first draft

A grouped verification pass re-read every load-bearing claim against the working copy and
**refuted twenty of them**. The ones that change what gets typed:

- **Every `www/app/app.config.ts` line number in the first draft is stale by +14 to +17.**
  Commit `b425646` inserted a 14-line `logo` block. The file is 496 lines, not 479.
  **Anchor every www edit on text, never on these numbers.**
- **`duxt.version` is a MOVE, not a delete.** www sets no `version`; the destination does not
  already hold it. It was the only item grouped under the wrong verb.
- **Deleting `duxt.version` does not fix the hero pill — it breaks it worse.**
  `app/pages/index.vue:79-84` substitutes into `'{version} released'`, so the pill would read
  `' released'`. And it has three call sites, not one: `DuxtVersion.vue:76`, `:115`, `:119` —
  www's header badge disappears too.
- **`title` cannot simply be deleted.** `app/types/duxt.d.ts:256` declares `title: DuxtText`
  without `?`, so removing it fails `pnpm typecheck:app`; making it optional changes the layer's
  public surface (`feat!:`). And `app/app.vue:41-42` does **not** degrade cleanly — an undefined
  title prints the literal word `undefined` in six places, including an `<img>` with no `alt`
  in `DuxtBrand.vue:36`.
- **The Resources entry is `app/utils/duxt-config.ts:21-61`, not `:21-72`.** Line 72 is inside
  the `sections` doc-comment.
- **Five locale files carry the resources keys, not six.** `pt-BR/duxt/defaults.json` has no
  `navigation` and no `resources` node.
- **The ripple reaches `docs/` and `public/`, which the first draft missed entirely.**
  `docs/**/4.reference/1.configuration.md` documents these defaults in tables across five
  languages, and `public/devtools/config.html` is a byte-compared fixture in `pnpm check`.
- **There is no correct version number to write.** `package.json` is `0.0.0`,
  `.release-please-manifest.json` is `{".": "0.0.0"}`, `duxt.layerVersion` is merged _behind_
  every `app.config.ts` so it cannot be read from one, and `./package.json` is not in the
  `exports` map.

### What www does not override today — the actual bug

`www/app/app.config.ts` sets no `title`, no `version`, no `navigation`, no `landing.headline`
and no `landing.description`. duxt.app renders five layer defaults as if they were its own
configuration — which is why the leak went unnoticed: **for www, the layer's defaults are the
right content.**

### The constraint that decides the fix

`server/utils/duxt-server-text.ts:1` resolves text by importing **only**
`i18n/locales/en/duxt/defaults.json`. `resolveDuxtText` (`app/utils/duxt-text.ts:70`) answers
`lookup(value) ?? value`, so an unresolvable key is emitted **verbatim**. A key in
`www/i18n/locales/**` would print raw into llms.txt, llms-full.txt and rss.xml.

**`www/` therefore needs no `i18n/` directory at all.** The per-locale record form in
`app.config.ts` is already www's established pattern — `TEXT_KEYS` at
`app/utils/duxt-text.ts:29-36`, with base-language fallback (`pt-BR` → any `pt-*`).

### Scope that came back clean — do not re-sweep

- The 70 chrome keys outside `defaults.json` are clean except `duxt.devtools.preview`.
- No locale drift: de, es, fr, pt each carry exactly the English key set.
- `app/pages/index.vue` is a generic renderer — every band is config-gated. Emptying
  `landing.*` needs **no** change to it.
- `nuxt.config.ts` has no `app`, `site`, `seo`, `ogImage`, `schemaOrg` or `robots` key.
- `content.config.ts`, `mdc.config.ts`, `content-cache.ts`, `validate-report.ts`, `sources*.ts`,
  `modules/**`, `server/devtools/**` carry no duxt-project content.
- **No existing test breaks.** Nothing under `tests/` imports `duxtDefaults` or reads
  `i18n/locales/**`.

### Was gefunden wurde

#### Commit 1 — die sechs Feature-Karten

| Schlüssel/Feld                                  | Ort                                                      | Aktion        | Grund                                      |
| :---------------------------------------------- | :------------------------------------------------------- | :------------ | :----------------------------------------- |
| `landing.features` (6 Einträge)                 | `app/utils/duxt-config.ts:127-158`                       | löschen       | duxts eigenes Marketing, www hat es        |
| `duxt.defaults.landing.features.*` (60 Strings) | `i18n/locales/{en,de,es,fr,pt}/duxt/defaults.json:23-48` | löschen       | Verwaiste Übersetzungen ohne Konfiguration |
| ganze Datei (3 Strings)                         | `i18n/locales/pt-BR/duxt/defaults.json`                  | löschen       | Enthält nichts als Feature-Beschreibungen  |
| `'pt-BR/duxt/defaults.json'`                    | `nuxt.config.ts:196`                                     | löschen       | Registrierung einer gelöschten Datei       |
| `landing.features`-Zeile                        | `public/devtools/config.html`                            | neu erzeugen  | Fixture zeigt sechs Einträge               |
| `features`, `landing`, Fließtext                | `docs/{,de/,es/,fr/,pt/}4.reference/1.configuration.md`  | umformulieren | Referenz nennt sechs Karten                |

#### Commit 2 — www bekommt seine eigene Version

| Schlüssel/Feld  | Ort                                     | Aktion        | Grund                                   |
| :-------------- | :-------------------------------------- | :------------ | :-------------------------------------- |
| `version`       | `www/app/app.config.ts`, nach `duxt: {` | nach www      | Nur www kennt seine Version             |
| Badge-Kommentar | `www/app/app.config.ts`, über `badge:`  | umformulieren | Aussage über release-please wird falsch |

#### Commit 3 — die Version verlässt den Layer

| Schlüssel/Feld               | Ort                                              | Aktion        | Grund                                        |
| :--------------------------- | :----------------------------------------------- | :------------ | :------------------------------------------- |
| `version: 'v0.0.0'`          | `app/utils/duxt-config.ts:15`                    | löschen       | Ebene kennt keine fremde Version             |
| `version`-Zeile              | `docs/**/4.reference/1.configuration.md:16` (5×) | umformulieren | Dokumentierter Standard existiert nicht mehr |
| Kommentar über `DuxtVersion` | `app/components/DuxtHeader.vue:233-235`          | umformulieren | Behauptete Invariante gilt nicht mehr        |

#### Commit 4 — www bekommt Namen und Hero-Text

| Schlüssel/Feld                    | Ort                                     | Aktion   | Grund                         |
| :-------------------------------- | :-------------------------------------- | :------- | :---------------------------- |
| `title`                           | `www/app/app.config.ts`, nach `duxt: {` | nach www | Der Name gehört der Website   |
| `landing.headline` (5 Strings)    | `www/app/app.config.ts`, in `landing`   | nach www | Text existiert sonst nirgends |
| `landing.description` (5 Strings) | `www/app/app.config.ts`, in `landing`   | nach www | Text existiert sonst nirgends |

#### Commit 5 — Name und Hero-Text verlassen den Layer

| Schlüssel/Feld                                 | Ort                                                      | Aktion        | Grund                                      |
| :--------------------------------------------- | :------------------------------------------------------- | :------------ | :----------------------------------------- |
| `title: 'duxt'`                                | `app/utils/duxt-config.ts:14`                            | ersetzen      | Produktname im Tab jedes Fremden           |
| `landing.headline`, `landing.description`      | `app/utils/duxt-config.ts:113-114`                       | löschen       | duxts Marketing als fremder Standard       |
| `duxt.defaults.landing.{headline,description}` | `i18n/locales/{en,de,es,fr,pt}/duxt/defaults.json:16-17` | löschen       | Verwaiste Übersetzungen ohne Konfiguration |
| `duxt.defaults.title` (neu)                    | dieselben fünf Dateien, Zeile 4                          | einfügen      | Neutraler Platzhalter statt Produktname    |
| `landing.description`-Zeile                    | `public/devtools/config.html`                            | neu erzeugen  | Zeile verschwindet aus dem Fixture         |
| `title`, `headline`, `description`, `landing`  | `docs/**/4.reference/1.configuration.md` (5×)            | umformulieren | Referenz nennt gelöschte Standardwerte     |
| Doc-Kommentar                                  | `server/devtools/render/system.ts:87-91`                 | umformulieren | Beispiel nennt gelöschten Standardwert     |

#### Commit 6 — www bekommt seine Navigation

| Schlüssel/Feld                | Ort                                   | Aktion   | Grund                             |
| :---------------------------- | :------------------------------------ | :------- | :-------------------------------- |
| `navigation` (beide Einträge) | `www/app/app.config.ts`, nach `feed:` | nach www | Array wird ersetzt, nicht ergänzt |

#### Commit 7 — das Resources-Menü verlässt den Layer

| Schlüssel/Feld                             | Ort                                                 | Aktion        | Grund                                      |
| :----------------------------------------- | :-------------------------------------------------- | :------------ | :----------------------------------------- |
| `navigation[1]` (5 URLs, 5 Beschreibungen) | `app/utils/duxt-config.ts:21-61`                    | löschen       | Fünf Links auf duxts Technikstack          |
| `duxt.defaults.navigation.resources`       | `i18n/.../defaults.json:6` (5×)                     | löschen       | Verwaiste Übersetzung ohne Konfiguration   |
| `duxt.defaults.resources.*` (25 Strings)   | `i18n/.../defaults.json:8-14` (5×)                  | löschen       | Verwaiste Übersetzungen ohne Konfiguration |
| `navigation`-Zeile                         | `public/devtools/config.html`                       | neu erzeugen  | Fixture zeigt zwei Einträge                |
| `navigation`-Zeile                         | `docs/**/4.reference/1.configuration.md:26` (5×)    | umformulieren | Referenz nennt zwei Einträge               |
| Satz über zwei Einträge                    | `docs/**/1.getting-started/2.configuration.md` (5×) | umformulieren | Anleitung nennt zwei Einträge              |

#### Commit 8 — der Produktname im Devtools-Label

| Schlüssel/Feld          | Ort                                                  | Aktion        | Grund                            |
| :---------------------- | :--------------------------------------------------- | :------------ | :------------------------------- |
| `duxt.devtools.preview` | `i18n/locales/{en,de,es,fr,pt}/duxt/devtools.json:4` | umformulieren | Produktname im Namen des iframes |

#### Commit 9 — der MCP-Servername

| Schlüssel/Feld                            | Ort                                    | Aktion   | Grund                                |
| :---------------------------------------- | :------------------------------------- | :------- | :----------------------------------- |
| `mcp.name: 'duxt documentation'`          | `nuxt.config.ts:282`                   | löschen  | Fremde Domain nennt duxts MCP-Server |
| `title?: string \| Record<string,string>` | `duxt-app-config.ts:13`                | einfügen | Typ für den neuen Zugriff            |
| `nameMcpServer()`                         | `modules/config.ts:66` und nach `:175` | einfügen | Name aus dem eigenen Titel           |

#### Commit 10 — der Regressionstest

| Schlüssel/Feld | Ort                            | Aktion   | Grund                             |
| :------------- | :----------------------------- | :------- | :-------------------------------- |
| neue Datei     | `tests/i18n-ownership.test.ts` | einfügen | Verhindert die Rückkehr des Lecks |

---

### Warum das ein Problem ist

Ein Fremder schreibt `extends: ['@kirchdev/duxt']` und bekommt eine fertige Website — die einer anderen. Sein Browser-Tab heißt `duxt`, seine Startseite trägt die Überschrift „Documentation for Nuxt, versioned and multi-repo" und darunter sechs Karten, die duxts Quellenliste, duxts Git-Sourcing und duxts shadcn-vue-Basis bewerben. In der Navigationsleiste hängt ein Aufklappmenü „Resources" mit fünf Links auf duxts Technikstack. Neben der Suche steht ein Abzeichen `v0.0.0`, das er nie gesetzt hat. Sein `llms.txt` beginnt mit `# duxt`, sein RSS-Kanal heißt `duxt`, und sein MCP-Server meldet sich bei jedem Agenten als `duxt documentation`. Nichts davon ist ein Fehler, den er sieht — es sieht aus wie eine Vorlage, die er noch nicht ausgefüllt hat, und genau das ist der Grund, warum es niemandem aufgefallen ist: **für www sind die Standardwerte der Ebene der richtige Inhalt.**

Die Regel, gegen die das verstößt, steht bereits im Repository selbst, in `app/utils/duxt-config.ts:75-76`: `duxt.defaults.*` übersetzt die Oberfläche, die die Ebene zeichnet, niemals Inhalt, den eine Website schreibt. `sections: []` und `links: []` wurden aus exakt diesem Grund geleert. Dieser Schnitt wendet dieselbe Regel auf das an, was übersehen wurde.

**Zwei davon sind live auf duxt.app kaputt, und beide stammen aus derselben Zeile.** `app/utils/duxt-config.ts:15` liefert `version: 'v0.0.0'`, und www setzt keine eigene. Erstens: das Hero-Pill liest `{version} released` (`app/pages/index.vue:79-84`) und zeigt deshalb **„v0.0.0 released"** — eine Behauptung über ein Release, das nie geschnitten wurde (`.release-please-manifest.json` ist `{".": "0.0.0"}`), verlinkt auf `/releases/latest`, wo nichts liegt. Zweitens: www hat eine einzige Quelle ohne Versionen, `DuxtVersion.vue:26-36` errechnet daher eine leere Liste, und der Kopf landet im `v-else-if="duxt.version"`-Zweig bei `:115` — das Abzeichen neben der Suche zeigt **„v0.0.0"**. Beide verschwinden nicht durch das Löschen; sie werden schlimmer (` released` mit führendem Leerzeichen, Abzeichen weg). Deshalb ist `version` eine Verschiebung, kein Löschvorgang, und deshalb muss www zuerst.

---

## Progress

**Nothing from this work is committed as code — the audit and the plan produced no edits.**

The working tree carries eleven modified paths plus untracked `www/app/assets/` that belong to
**other, parallel work**, not to this: `README.md`, `app/assets/css/duxt.css`,
`app/components/DuxtHeader.vue`, `app/components/content/ProseH{2,3,4}.vue`,
`app/composables/useActiveHeading.ts`, `www/app/app.config.ts`, `www/nuxt.config.ts`,
`www/public/apple-touch-icon.png`, `www/public/favicon.svg`.

Two of those matter to this plan:

- `app/components/DuxtHeader.vue` now carries `entryActive` (`:45-48`), which **commit 6 below
  depends on** — it is why the Docs entry must not be given a `to`.
- `www/app/app.config.ts` is itself dirty (a badge `variant` change), so the insertions of
  commits 2, 4 and 6 land on top of an uncommitted change.

**Establish who owns those changes before starting.**

## Next steps

### Der Schnitt

Zehn Commits. Die Reihenfolge ist tragend: **jeder www-Einschub steht vor der Löschung im Layer, die er auffängt.** Nach jedem einzelnen Commit rendert duxt.app korrekt.

Zwei Dinge vorweg, die für mehrere Commits gelten:

- **`public/devtools/config.html` ist Teil von `pnpm check`.** `server/devtools/render/system.ts:37-42` mischt eine Fixture über `duxtDefaults` und `scripts/check-previews.ts:50` vergleicht byteweise. Betroffen sind nur Commits **1, 5 und 7** — dort gehört `pnpm previews` mit der Änderung in **denselben** Commit. `title`, `version` und `landing.headline` setzt die Fixture selbst (`server/devtools/preview.ts:55-67`), ihre Zeilen sind `consumer`-getaggt und ändern sich nicht.
- **`oxfmt` formatiert `docs/**/*.md` nicht** — `.oxfmtrc.json` listet es unter `ignorePatterns`. Die Spaltenbreite der Tabellen muss von Hand nachgezogen werden oder ungleichmäßig bleiben; `pnpm check:fix` tut hier nichts. Für `www/app/app.config.ts` (nicht ignoriert, `printWidth: 80`) tut es das sehr wohl.

---

#### Commit 1

```
fix: stop shipping duxt's own feature cards as layer defaults
```

**Dateien**

- `i18n/locales/{en,de,es,fr,pt}/duxt/defaults.json` — Zeilen **23-48** löschen (`"features": {` bis `},`). Zeile 22 (`"previewOpen"`) behält ihr Komma, Zeile 49 (`"featuresTitle"`) wird letzter Schlüssel von `landing`. Der Bereich ist in allen fünf Dateien identisch.
- `app/utils/duxt-config.ts` — Zeilen **127-158** durch `features: []` mit Begründungskommentar ersetzen (Wortlaut in Abschnitt 5).
- `i18n/locales/pt-BR/duxt/defaults.json` — Datei löschen. Sie enthält ausschließlich die drei brasilianischen Feature-Beschreibungen; alle drei stehen wortgleich in `www/app/app.config.ts` (`:297`, `:391`, `:410`).
- `nuxt.config.ts` — Zeile **196** (`'pt-BR/duxt/defaults.json',`) aus der `pt-BR`-Dateiliste entfernen. Untrennbar von der Dateilöschung: eine registrierte, fehlende Locale-Datei ist ein Build-Fehler.
- `public/devtools/config.html` — `pnpm previews` ausführen und committen. Die `landing.features`-Zeile geht von `6 entries` (mit `<details>`-Block) auf `0 entries` (inline `[]`), die Summenzeile oben verschiebt sich.
- `docs/4.reference/1.configuration.md` — `:53` Standardspalte `six` → `**empty**`; `:31` `badge, headline, description, one action, six features` → `badge, headline, description, one action`; `:61` `under six cards` → `under a card grid`.
- `docs/de/4.reference/1.configuration.md` — `:55` `sechs` → `**leer**`; `:31` → `Abzeichen, Überschrift, Beschreibung, eine Aktion`; `:63` `unter sechs Karten` → `unter einem Kartenraster`.
- `docs/es/4.reference/1.configuration.md` — `:55` `seis` → `**vacío**`; `:31` → `distintivo, titular, descripción, una acción`; `:63` `bajo seis tarjetas` → `bajo una rejilla de tarjetas`.
- `docs/fr/4.reference/1.configuration.md` — `:55` `six` → `**vide**`; `:31` → `badge, titre, description, une action`; `:63` `sous six cartes` → `sous une grille de cartes`.
- `docs/pt/4.reference/1.configuration.md` — `:55` `seis` → `**vazio**`; `:31` → `distintivo, título, descrição, uma ação`; `:63` `sob seis cartões` → `sob uma grelha de cartões`.

**Was sich sichtbar ändert:** nichts. www überschreibt `landing.features` mit acht eigenen Karten (`www/app/app.config.ts:277-462`); die sechs der Ebene wurden dort nie gezeichnet. `app/pages/index.vue:425` blendet das ganze Band bei `features: []` aus — `index.vue` braucht keine Änderung.

**Prüfung:** `pnpm previews && pnpm check:previews` (muss grün sein — ohne die Neuerzeugung schlägt es fehl), dann `pnpm build:app`. Ein Blick auf `/` von www: acht Karten, unverändert.

---

#### Commit 2

```
chore: give the development site its own version
```

**Dateien**

- `www/app/app.config.ts` — `version: 'v0.0.0'` unmittelbar nach `duxt: {` einfügen, mit dem Kommentar aus Abschnitt 4. **Kein Record**: `app/types/duxt.d.ts:281` deklariert `version?: string`, und `version` fehlt in `TEXT_KEYS` (`app/utils/duxt-text.ts:29-36`) — ein Record würde nie aufgelöst und `String()` in `index.vue:82` ergäbe `[object Object]`.
- `www/app/app.config.ts` — den Kommentar über `badge:` ersetzen. Er behauptet heute „the number is never typed twice: release-please bumps `package.json`" — nach dieser Änderung wird die Zahl genau hier getippt und von release-please **nicht** angefasst.

**Was sich sichtbar ändert:** nichts. www rendert weiter „v0.0.0 released" im Hero und „v0.0.0" im Kopf — nur besitzt www diese Angabe jetzt selbst.

**Prüfung:** `pnpm build:app`, dann ein Blick auf `/`: Pill und Kopfabzeichen unverändert.

---

#### Commit 3

```
fix: stop shipping a version the layer cannot know
```

**Dateien**

- `app/utils/duxt-config.ts` — Zeile **15** (`version: 'v0.0.0',`) löschen. Kein Typwechsel nötig, `version?` ist bereits optional.
- `docs/4.reference/1.configuration.md:16` — Standardspalte `` `'v0.0.0'` `` → `**none**`. Analog `docs/de/…:16` → `**keine**`, `docs/es/…:16` → `**ninguna**`, `docs/fr/…:16` → `**aucune**`, `docs/pt/…:16` → `**nenhuma**` (die Vokabeln, die die jeweilige Datei bei `:50-55` bereits verwendet).
- `app/components/DuxtHeader.vue:233-235` — den Kommentar umformulieren. Er begründet die Platzierung mit „it is always rendered — as a badge where there is nothing to choose"; für einen Konsumenten ohne `version` und mit höchstens einer Quelle rendert `DuxtVersion` jetzt **nichts**, und die Icons rechts davon rücken. Die Aussage ist nur noch eine www-Tatsache.

**Was sich sichtbar ändert:** auf www nichts (Commit 2 hat den Wert übernommen). Für einen fremden Konsumenten verschwindet ein Abzeichen, das er nie gesetzt hat — der Zweck der Änderung.

**Prüfung:** `pnpm check:previews` muss **ohne** Neuerzeugung grün bleiben (die Fixture setzt `version: 'v2.4.0'` selbst). `pnpm build:app`, Blick auf `/`: Pill und Kopfabzeichen weiterhin „v0.0.0".

---

#### Commit 4

```
chore: give the development site its own name and hero copy
```

**Dateien**

- `www/app/app.config.ts` — `title: 'duxt'` unmittelbar nach `duxt: {` einfügen, **über** dem `version` aus Commit 2. Ein einfaches Literal, kein Record: das Wort ist in allen Sprachen gleich, dieselbe Regel, die `label: 'GitHub'` und `title: 'shadcn-vue'` unverpackt lässt. Serverseitig geprüft: `lookup('duxt')` läuft in den `duxt`-Objektknoten der englischen Messages, findet keinen String, gibt `undefined` zurück, und `duxt-text.ts:70` reicht das Literal durch.
- `www/app/app.config.ts` — `headline` und `description` in den `landing`-Block einfügen, direkt nach dem schließenden `},` des `badge`-Blocks. Wortlaut vollständig in Abschnitt 4.

**Was sich sichtbar ändert:** nichts. Die zehn Strings sind byteidentisch mit denen, die die Ebene heute liefert.

**Prüfung:** `pnpm build:app`. Dann den gebauten Server starten und die drei Maschinenrouten ansehen — das ist der Schritt, den `server/utils/duxt-server-text.ts` regiert:

```bash
node www/.output/server/index.mjs &
curl -s localhost:3000/llms.txt | head -3     # "# duxt", dann "> Extend one layer …"
curl -s localhost:3000/rss.xml | head -20     # <title>duxt — decisions</title>
```

Es darf kein roher Schlüssel wie `duxt.defaults.landing.description` erscheinen.

---

#### Commit 5

```
fix: stop shipping duxt's name and hero copy as layer defaults
```

**Dateien**

- `app/utils/duxt-config.ts:14` — `title: 'duxt',` → `title: 'duxt.defaults.title',` mit Kommentar (Abschnitt 5). **Nicht löschen**: `app/types/duxt.d.ts:256` deklariert `title: DuxtText` ohne `?`, ein Entfernen bricht `pnpm typecheck:app`; und ein undefinierter Titel druckt an sechs Stellen das Wort `undefined` (Titelvorlage `app/app.vue:42`, 404 `app/error.vue:19`, `llms.txt:44`, `llms-full.txt:47`, `rss.xml:113`) und lässt `DuxtBrand.vue:36` ein `<img>` **ohne** `alt`-Attribut zurück — ein axe-Verstoß, den `check:a11y` nie sähe, weil es über www läuft.
- `app/utils/duxt-config.ts:110-114` — die beiden Schlüsselzeilen löschen und die Begründung in den bereits darüberstehenden Kommentar falten (Wortlaut in Abschnitt 5). Bleibt der Kommentar unverändert stehen, erklärt er scheinbar `actions`.
- `i18n/locales/{en,de,es,fr,pt}/duxt/defaults.json` — Zeilen **16-17** löschen. `pt-BR` trägt beide Schlüssel nicht und wird von diesem Schritt nicht berührt (die Datei ist nach Commit 1 ohnehin fort).
- `i18n/locales/{en,de,es,fr,pt}/duxt/defaults.json` — **im selben Commit** `"title"` als neuen ersten Schlüssel unter `"defaults"` einfügen (Zeile 4, sechs Leerzeichen Einzug): `en` `"Documentation"`, `de` `"Dokumentation"`, `es` `"Documentación"`, `fr` `"Documentation"`, `pt` `"Documentação"`. Genau die fünf Schreibweisen, die www bei `:206-211` bereits benutzt. Ohne diese Registrierung druckt `duxt-text.ts:70` den rohen Schlüssel als Websitenamen.
- `public/devtools/config.html` — `pnpm previews` und committen. Die Zeile `landing.description` (heute `layer`-getaggt, Wert `duxt.defaults.landing.description`) **verschwindet**, die Summenzeile ändert sich. `landing.headline` bleibt, weil die Fixture es selbst setzt.
- `docs/4.reference/1.configuration.md` — `:15` `` `'duxt'` `` → `**none**`; `:48` und `:49` Standardspalte `a line of text` → `**none**`; `:31` `badge, headline, description, one action` → `badge, one action`.
- `docs/de/…` `:15` → `**keiner**`, `:50`/`:51` `eine Zeile Text` → `**keine**`, `:31` → `Abzeichen, eine Aktion`.
- `docs/es/…` `:15` → `**ninguno**`, `:50`/`:51` `una línea de texto` → `**ninguno**`, `:31` → `distintivo, una acción`.
- `docs/fr/…` `:15` → `**aucun**`, `:50`/`:51` `une ligne de texte` → `**aucune**`, `:31` → `badge, une action`.
- `docs/pt/…` `:15` → `**nenhum**`, `:50`/`:51` `uma linha de texto` → `**nenhuma**`, `:31` → `distintivo, uma ação`.
- `server/devtools/render/system.ts:87-91` — den Doc-Kommentar umformulieren. Er nennt „`landing.headline` is a translation key in the layer's defaults" als Beispiel; die erste Hälfte wird falsch. Der Code ist nicht betroffen.

**Was sich sichtbar ändert:** auf www nichts. Für einen fremden Konsumenten heißt die Website ab jetzt „Documentation" statt „duxt", die `h1` fällt auf ebendiesen Titel zurück (`index.vue:248`), der Absatz darunter rendert gar nicht mehr (`index.vue:252` ist `v-if`-gattert), und `llms.txt` beginnt mit `# Documentation`.

**Prüfung:** `pnpm typecheck:app` (der Typ von `title` ist der kritische Punkt), `pnpm previews && pnpm check:previews`, `pnpm build:app`, und erneut die drei Routen aus Commit 4 — sie müssen weiterhin echten Text liefern.

---

#### Commit 6

```
chore: give the development site its own navigation
```

**Dateien**

- `www/app/app.config.ts` — `navigation` mit **beiden** Einträgen nach der `feed:`-Zeile und vor dem `sections`-Kommentar einfügen. Vollständig ausgeschrieben, weil `mergeDuxtConfig` (`app/utils/duxt-config.ts:182-183`) ein Array **ersetzt** statt zu mischen — eine Teilübernahme ist unmöglich. Wortlaut in Abschnitt 4.

**Was sich sichtbar ändert:** nichts. Die Labels werden von Schlüsseln zu Literalen bzw. Records, die zu denselben Strings auflösen.

> **Dem `Docs`-Eintrag kein `to` geben.** `app/components/DuxtHeader.vue:45-48` trägt seit dieser Session `entryActive`: ein Eintrag ohne `to` ist überall dort aktiv, wo **irgendeine** Sektion aktiv ist; einer mit explizitem `to` nur innerhalb dieser einen. Ein `to: '/getting-started'` würde die gerade gelandete Hervorhebungs-Korrektur still rückgängig machen. `linkTarget` (`:26-28`) löst den Eintrag ohnehin auf www's erste Sektion auf.

**Prüfung:** `pnpm build:app`, Blick in die Navigationsleiste: „Docs" plus „Resources" mit fünf Einträgen, unverändert. `pnpm check:previews` bleibt ohne Neuerzeugung grün.

---

#### Commit 7

```
fix: stop shipping duxt's resources dropdown as a layer default
```

**Dateien**

- `app/utils/duxt-config.ts` — Zeilen **21-61** (das gesamte Resources-Objekt) löschen und das Komma am Ende von Zeile **20** entfernen, damit der Docs-Eintrag letztes Arrayelement wird.
- `i18n/locales/{en,de,es,fr,pt}/duxt/defaults.json` — das Komma auf Zeile **5** entfernen, Zeile **6** (`"resources": …` unter `navigation`) löschen, Zeilen **8-14** (der `"resources"`-Block) löschen. Ergebnis: `"navigation": { "docs": "Docs" },` gefolgt von `"landing": {`.
- `public/devtools/config.html` — `pnpm previews` und committen. Die `navigation`-Zeile geht von `2 entries` auf `1 entries`, der eingebettete JSON-Block schrumpft um alle fünf `duxt.defaults.resources.*`-Schlüssel.
- `docs/4.reference/1.configuration.md:26` — `two entries` → `one entry`. Analog `docs/de/…:26` `zwei Einträge` → `ein Eintrag`, `docs/es/…:26` `dos entradas` → `una entrada`, `docs/fr/…:26` `deux entrées` → `une entrée`, `docs/pt/…:26` `duas entradas` → `uma entrada`.
- `docs/1.getting-started/2.configuration.md:35` — „declare `navigation` and the layer's two entries are gone." → „…the layer's one entry is gone." Analog `docs/de/…:36` (`die beiden Einträge der Ebene sind` → `der eine Eintrag der Ebene ist`), `docs/es/…:35` (`las dos entradas de la capa desaparecen` → `la única entrada de la capa desaparece`), `docs/fr/…:36` (`les deux entrées de la couche disparaissent` → `l'unique entrée de la couche disparaît`), `docs/pt/…:35` (`as duas entradas da camada desaparecem` → `a única entrada da camada desaparece`). Absätze von Hand auf ~80 Spalten umbrechen — `oxfmt` fasst `docs/**/*.md` nicht an.

**Warum `navigation` **nicht** `[]` wird:** anders als `DuxtSections.vue:27-28` trägt `DuxtHeader.vue:166-169` keine Bedingung — ein leeres Array ließe ein benanntes `<nav>`-Landmark ohne Inhalt stehen und im mobilen Sheet (`:123`) eine Trennlinie über einer leeren Liste. Ein Eintrag zu behalten spiegelt außerdem `landing.actions`, das seit jeher genau einen generischen Eintrag liefert.

**Was sich sichtbar ändert:** auf www nichts (Commit 6 hat beide Einträge übernommen). Für einen Fremden verschwindet ein Aufklappmenü mit fünf Links auf duxts Technikstack.

**Prüfung:** `pnpm previews && pnpm check:previews`, `pnpm build:app`, Blick in die Navigationsleiste von www.

---

#### Commit 8

```
fix: drop the product name from the devtools preview label
```

**Dateien** — `i18n/locales/{en,de,es,fr,pt}/duxt/devtools.json`, jeweils Zeile **4**. `{tab}` bleibt unangetastet, es ist benannte vue-i18n-Interpolation und wird in `app/components/content/DevtoolsPanel.vue:99` befüllt.

```
en:  "The {tab} panel of duxt’s devtools tab"        → "The {tab} panel of the devtools tab"
de:  "Das Panel {tab} aus dem duxt-Devtools-Tab"     → "Das Panel {tab} aus dem Devtools-Tab"
es:  "El panel {tab} de la pestaña de devtools de duxt" → "El panel {tab} de la pestaña de devtools"
fr:  "Le panneau {tab} de l’onglet devtools de duxt" → "Le panneau {tab} de l’onglet devtools"
pt:  "O painel {tab} do separador devtools do duxt"  → "O painel {tab} do separador devtools"
```

> **Byte-Warnung.** Die englische und die französische Zeile tragen U+2019 (`e2 80 99`), nicht den ASCII-Apostroph — ein aus dem Handoff abgetippter Suchtext trifft nicht. Die spanische Zeile trägt `ñ` als `c3 b1`. Immer gegen die Datei matchen, nie neu tippen. `pt/duxt/devtools.json` bedient über `nuxt.config.ts:184` **beide** portugiesischen Locales; ein `pt-BR`-Overlay für devtools existiert nicht.

**Was sich sichtbar ändert:** der zugängliche Name des iframes auf den fünf Devtools-Referenzseiten.

**Prüfung:** manuell. **Nichts gattert diese Änderung** — `scripts/check-a11y.ts:44-50` prüft fünf Seiten, von denen keine ein `::devtools-panel` einbettet (alle 50 Verwendungen liegen unter `docs/**/4.reference/8.devtools/`). Ein zerbrochenes JSON oder ein geleerter Schlüssel käme durch `pnpm check`. Nach der Änderung: `python3 -c "import json,glob;[json.load(open(f)) for f in glob.glob('i18n/locales/*/duxt/devtools.json')]"` und ein Blick auf eine gerenderte Devtools-Seite.

---

#### Commit 9

```
feat: name the mcp server from the site's own title
```

Muss **nach Commit 4** liegen: erst dann hat www ein `title`, aus dem der Name abgeleitet werden kann. Davor würde www's MCP-Server auf den neutralen Rückfall `Documentation` umbenannt und die Änderung sähe wie eine Regression aus.

**Dateien**

- `nuxt.config.ts` — Zeile **282** (`name: 'duxt documentation',`) löschen. `description` und `instructions` bleiben, beide sind produktneutral. Alleinstehend wäre die Löschung falsch: der Modulstandard von `@nuxtjs/mcp-toolkit` ist der **leere String**.
- `duxt-app-config.ts` — in `DuxtBuildConfig` nach `locales?: string[];` einfügen:

  ```ts
  /**
   * The site's name — also what the MCP server calls itself.
   *
   * Typed structurally rather than as `DuxtText`: this file is loaded by the
   * build, outside the Nuxt runtime whose generated types carry that global.
   * Same reason `scripts/check-previews.ts` declares the preview module's
   * shape instead of importing it.
   */
  title?: string | Record<string, string>;
  ```

  `readDuxtBuildConfig` gibt bereits das gesamte `duxt`-Objekt des Konsumenten zurück (`:62-66`); `title` liegt zur Laufzeit heute schon vor und ist nur untypisiert. Reine Deklaration, keine Verhaltensänderung.

- `modules/config.ts` — Aufruf `nameMcpServer(nuxt, config?.title);` direkt nach `shareSiteUrl(nuxt);` (Zeile 66), Funktion nach dem Ende von `shareSiteUrl` (nach Zeile 175):

  ```ts
  /**
   * The MCP server's name, from the site's own title.
   *
   * `mcp.name` is a nuxt.config key, not an app.config one, so it is the single
   * duxt-facing option a consumer cannot set beside the others. Left as a
   * literal it published duxt's own name from every downstream site. Derived
   * here instead: the title a consumer already writes in `app.config.ts` names
   * the server too, and anyone wanting a different one still writes
   * `mcp: { name }` in `nuxt.config.ts`, which defu keeps ahead of this.
   *
   * A record is resolved against `i18n.defaultLocale`, because the server has
   * one name and no request to read a language from. A consumer who wrote an
   * i18n KEY as their title gets that key — the build has no translator, which
   * is why a literal or a record is the documented form.
   *
   * The module's own default is the empty string, so this must always answer.
   */
  function nameMcpServer(
    nuxt: Nuxt,
    title: string | Record<string, string> | undefined
  ) {
    const options = nuxt.options as {
      mcp?: { name?: string };
      i18n?: { defaultLocale?: string };
    };
    if (!options.mcp || options.mcp.name) return;

    const locale = options.i18n?.defaultLocale;
    const name =
      typeof title === 'string'
        ? title
        : title
          ? ((locale && title[locale]) ?? Object.values(title)[0])
          : undefined;

    options.mcp.name = name ? `${name} documentation` : 'Documentation';
  }
  ```

  Die Reihenfolge stimmt bereits und ist tragend: `nuxt.config.ts:212` installiert `layer('./modules/config.ts')` **vor** `'@nuxtjs/mcp-toolkit'` bei `:253`, diese Mutation von `nuxt.options.mcp` ist also das, was das Toolkit liest.

**Was sich sichtbar ändert:** nichts für www — `title: 'duxt'` (Commit 4) ergibt wieder exakt `duxt documentation`. Ein Fremder bekommt seinen eigenen Namen statt duxts.

**Prüfung:** `pnpm typecheck` **und** `pnpm typecheck:app` (`tsconfig.json` ist strict), dann `pnpm build:app` und

```bash
grep -o '"name":"[^"]*documentation"' www/.nuxt/prerender/chunks/nitro/nitro.mjs
```

muss `"name":"duxt documentation"` liefern — dieselbe Zeichenkette wie heute.

---

#### Commit 10

```
test: assert the layer's defaults name no project
```

**Datei** — `tests/i18n-ownership.test.ts`, neu. Inhalt in Abschnitt 6.

**Was sich sichtbar ändert:** nichts.

**Prüfung:** `pnpm test`. Anschließend einmal `pnpm check` über den gesamten Stapel.

---

### Der Text, der umzieht

Dies ist der unwiederbringliche Teil. Die zehn Hero-Strings und die 30 Resources-Strings existieren **in genau einer Datei im gesamten Repository** — `i18n/locales/*/duxt/defaults.json`. Werden sie gelöscht, bevor dieser Block steht, sind sie fort.

Alle Strings sind byteweise aus den Locale-Dateien gelesen. `oxfmt` mit `printWidth: 80` erzeugt genau diese Umbrüche; nicht von Hand umformatieren.

#### Commit 2 — nach `duxt: {`

```ts
    /**
     * duxt's own version. The layer used to default this to `'v0.0.0'`, so
     * every site extending it wore a version it had never set — both the
     * header badge (`DuxtVersion.vue`, the `v-else-if` branch a single-source
     * site lands on) and the `{version}` in the hero pill below read this one
     * field. The layer ships none now; a site that has a version says so here.
     *
     * A plain string, not a record: `version` is absent from `TEXT_KEYS`, so a
     * record would never be resolved and would print as `[object Object]`.
     *
     * Typed out rather than derived: `duxt.layerVersion` is the LAYER's own
     * version and `modules/config.ts` merges it BEHIND this file, so it cannot
     * be read from inside it, and `package.json` is not in the package's
     * `exports` map either. Nothing bumps this line — add
     * `www/app/app.config.ts` to `extra-files` in `release-please-config.json`
     * when the first release is cut, or it goes stale on that release.
     */
    version: 'v0.0.0',
```

Und der Ersatz für den Kommentar über `badge:`:

```ts
// `{version}` reads this site's own `version` above — see the note there
// on why it is a literal and what has to bump it. The pill links to the
// release it names.
```

#### Commit 4 — `title`, nach `duxt: {` und über `version`

```ts
    /**
     * The site's own name. The layer ships no `title` of its own: a name is the
     * one thing a documentation theme cannot guess, and "duxt" in every
     * downstream header was exactly that mistake.
     *
     * A plain literal, not a record: the word is the same in every language —
     * the rule that also keeps `'GitHub'` and `'shadcn-vue'` below unwrapped.
     */
    title: 'duxt',
```

#### Commit 4 — `headline` und `description`, in `landing`, nach dem `badge`-Block

```ts
      /**
       * The hero copy, written out here rather than inherited.
       *
       * The layer used to ship both as `duxt.defaults.landing.*` keys, which
       * made duxt's own marketing the default headline of every site that
       * extended it. `duxt.defaults.*` translates the interface the layer
       * draws, never content a site writes.
       *
       * The record form rather than a locale file, for the reason the sections
       * above give — and for one more: `llms.txt`, `llms-full.txt` and the feed
       * are Nitro routes with no i18n, and `resolveServerTexts` reads only the
       * LAYER's English messages. A key in a `www/i18n/` file would be printed
       * to a model verbatim; a record resolves to its `en-GB` entry there.
       */
      headline: {
        'en-GB': 'Documentation for Nuxt, versioned and multi-repo',
        'de-DE':
          'Dokumentation für Nuxt, versioniert und über mehrere Repositories',
        'es-ES': 'Documentación para Nuxt, versionada y multirrepositorio',
        'fr-FR': 'Documentation pour Nuxt, versionnée et multidépôt',
        'pt-PT': 'Documentação para Nuxt, com versões e vários repositórios'
      },

      // Also the `<meta name="description">`, the llms.txt blurb and the RSS
      // channel description — one sentence, four readers.
      description: {
        'en-GB':
          'Extend one layer and your docs/ folder becomes a site. Point it at other repositories, or at tags of the same one, and those become versions.',
        'de-DE':
          'Einen Layer erweitern, und dein docs/-Ordner wird zur Website. Zeig damit auf andere Repositories oder auf Tags desselben, und daraus werden Versionen.',
        'es-ES':
          'Extiende una capa y tu carpeta docs/ se convierte en un sitio. Apúntala a otros repositorios, o a etiquetas del mismo, y estos se convierten en versiones.',
        'fr-FR':
          "Étendez une couche et votre dossier docs/ devient un site. Pointez-la vers d'autres dépôts, ou vers des tags du même, et ceux-ci deviennent des versions.",
        'pt-PT':
          'Estenda uma camada e a sua pasta docs/ torna-se um site. Aponte-a para outros repositórios, ou para tags do mesmo, e estes tornam-se versões.'
      },
```

> Die `fr-FR`-Beschreibung enthält in `d'autres` einen **ASCII**-Apostroph (verifiziert) und braucht deshalb doppelte Anführungszeichen — genau die Konvention, die `www/app/app.config.ts:319` und `:354` bereits verwenden. Kein anderer der 40 Strings enthält einen Apostroph.

#### Commit 6 — `navigation`, nach der `feed:`-Zeile

```ts
    // Written out in full, both entries: `mergeDuxtConfig` REPLACES an array
    // rather than merging into it, so naming `navigation` at all means naming
    // every entry. The layer ships only the generic Docs entry; the Resources
    // dropdown below is duxt's own — five links to duxt's tech stack, which
    // belong to this site and not to a stranger's header.
    //
    // The Docs entry carries no `to` on purpose. `DuxtHeader.linkTarget`
    // resolves it to the first section (`/getting-started`), and `entryActive`
    // lights it wherever ANY section is — giving it an explicit `to` would
    // narrow the highlight back to one section.
    navigation: [
      { label: 'Docs', icon: 'lucide:book-open-text' },
      {
        label: {
          'en-GB': 'Resources',
          'de-DE': 'Ressourcen',
          'es-ES': 'Recursos',
          'fr-FR': 'Ressources',
          'pt-PT': 'Recursos'
        },
        icon: 'lucide:library',
        children: [
          {
            label: 'Nuxt',
            to: 'https://nuxt.com',
            icon: 'lucide:box',
            description: {
              'en-GB': 'The framework underneath',
              'de-DE': 'Das Framework darunter',
              'es-ES': 'El framework de base',
              'fr-FR': 'Le framework sous-jacent',
              'pt-PT': 'A framework subjacente'
            },
            external: true
          },
          {
            label: 'Nuxt Content',
            to: 'https://content.nuxt.com',
            icon: 'lucide:file-text',
            description: {
              'en-GB': 'Sourcing, parsing and querying',
              'de-DE': 'Beschaffen, parsen und abfragen',
              'es-ES': 'Obtención, análisis y consulta',
              'fr-FR': 'Récupération, analyse et requêtes',
              'pt-PT': 'Obtenção, análise e consulta'
            },
            external: true
          },
          {
            label: 'shadcn-vue',
            to: 'https://www.shadcn-vue.com',
            icon: 'lucide:palette',
            description: {
              'en-GB': 'The component base',
              'de-DE': 'Die Komponentenbasis',
              'es-ES': 'La base de componentes',
              'fr-FR': 'La base de composants',
              'pt-PT': 'A base de componentes'
            },
            external: true
          },
          {
            label: 'Tailwind CSS',
            to: 'https://tailwindcss.com',
            icon: 'lucide:paintbrush',
            description: {
              'en-GB': 'The styling system',
              'de-DE': 'Das Styling-System',
              'es-ES': 'El sistema de estilos',
              'fr-FR': 'Le système de styles',
              'pt-PT': 'O sistema de estilos'
            },
            external: true
          },
          {
            label: 'MDC syntax',
            to: 'https://content.nuxt.com/docs/files/markdown',
            icon: 'lucide:code',
            description: {
              'en-GB': 'Components inside Markdown',
              'de-DE': 'Komponenten in Markdown',
              'es-ES': 'Componentes dentro de Markdown',
              'fr-FR': 'Des composants dans le Markdown',
              'pt-PT': 'Componentes dentro do Markdown'
            },
            external: true
          }
        ]
      }
    ],
```

> **Kein `pt-BR`-Eintrag.** `resolveDuxtText` (`:81-86`) fällt über die Basissprache auf `pt-PT` zurück — exakt das heutige Verhalten, denn `i18n/locales/pt-BR/duxt/defaults.json` überschreibt weder `navigation` noch `resources`. Ein `pt-BR`-Schlüssel würde das Rendering **ändern**, nicht erhalten.

---

### Was danach im Layer steht

`app/utils/duxt-config.ts`, Zeilen 13 bis zum Ende von `duxtDefaults`:

```ts
export const duxtDefaults: DuxtConfig = {
  // A placeholder, not a name. The layer cannot know what a site is called,
  // and `title` is read by thirteen call sites — the title template, the 404,
  // the brand, the OG card, schema.org, llms.txt and the feed — several of
  // which interpolate it into a template literal and would print the word
  // `undefined` rather than degrade. So a neutral, translated word stands in
  // until a consumer sets its own. It names nobody, which is the whole test.
  title: 'duxt.defaults.title',

  navigation: [
    // No `to`: the header resolves it to the first section, so the entry works
    // whether or not the consumer's URLs carry a prefix.
    //
    // One entry where `sections` and `links` ship empty, because "Docs" names
    // the INTERFACE and not a tree or a repository. The dropdown that used to
    // sit beside it pointed at duxt's own tech stack — five links belonging to
    // this project and to no site that extends it. It lives in
    // `www/app/app.config.ts` now.
    { label: 'duxt.defaults.navigation.docs', icon: 'lucide:book-open-text' }
  ],

  /**
   * Empty, like `links` below — and for a reason one step further out.
   *  … (unverändert) …
   */
  sections: [],

  /**
   * Empty, like `footer.legal`.
   *  … (unverändert) …
   */
  links: [],

  /** Which package managers a command block offers, in the order it shows them. */
  packageManagers: ['pnpm', 'npm', 'yarn', 'bun'],

  /** A flat docs tree gets a trail that only repeats its own section name. */
  breadcrumb: true,

  landing: {
    // No badge, no headline, no description. A pill above the headline says
    // something about the state of a project — "beta", "v2 is out" — and the
    // headline and the paragraph under it say what the project IS. The layer
    // knows none of the three. Those two were duxt's OWN marketing showing
    // through every site that extended it; they live in `www/app/app.config.ts`
    // now, in the record form, because the Nitro routes that read them have no
    // i18n — see `server/utils/duxt-server-text.ts`.
    //
    // Unset, the h1 falls back to `title` and the paragraph does not render at
    // all — `app/pages/index.vue:248` and `:252`. Set `landing.badge`,
    // `landing.headline` or `landing.description` and each appears.

    // One action, and a generic one: "read the docs" is true of every site
    // built on this layer. A second button pointing at duxt's own repository
    // was not — see `links` above.
    // No `to`, for the same reason the section row above ships empty: the
    // layer knows that a site HAS documentation, never what its first page is
    // called. The landing resolves it to the first section, or to `/`.
    actions: [
      {
        label: 'duxt.defaults.landing.actions.docs',
        icon: 'lucide:arrow-right'
      }
    ],

    /**
     * Empty, like `sections` and `links` above.
     *
     * The six cards that used to sit here described duxt — its source list, its
     * git-native sourcing, its shadcn-vue base. That is duxt's own marketing
     * copy, not a default another site would keep: a stranger extending the
     * layer got a landing page selling somebody else's project.
     *
     * Their translations left with them — `duxt.defaults.*` translates the
     * interface the layer draws, never content a site writes. duxt's own cards
     * live in `www/app/app.config.ts`, where each one POINTS at the page that
     * explains it, which the layer could never know.
     *
     * Left empty, the band does not render: `app/pages/index.vue:425` gates the
     * whole section on `duxt.landing?.features?.length`.
     */
    features: []
  },

  /**
   * Title only, no links — same reasoning as `links` above.
   *  … (unverändert) …
   */
  aside: {
    title: 'duxt.defaults.aside.title'
  }
};
```

Und `i18n/locales/en/duxt/defaults.json` vollständig — 27 statt 56 Zeilen, elf Schlüssel statt 31:

```json
{
  "duxt": {
    "defaults": {
      "title": "Documentation",
      "navigation": {
        "docs": "Docs"
      },
      "landing": {
        "actions": {
          "docs": "Read the docs"
        },
        "preview": "Live preview of the documentation",
        "previewOpen": "Open",
        "featuresTitle": "Features"
      },
      "aside": {
        "title": "Community"
      }
    }
  }
}
```

`de`, `es`, `fr`, `pt` bekommen dieselbe Struktur mit ihren eigenen Übersetzungen; `pt-BR/duxt/defaults.json` existiert nicht mehr. Kein Schlüssel in diesem Baum nennt noch ein Produkt, eine Domain oder ein Projekt.

---

### Regressionstest

`tests/i18n-ownership.test.ts`, `environment: 'node'` wie alles unter `tests/`. Das Vorbild ist `tests/contrast.test.ts`: es **liest** das Asset statt es nachzuerzählen (`:24-27`), zieht die Struktur daraus (`:30-43`), wendet **eine** Regel an (`:101`) gegen eine **handgeschriebene** Liste der Paarungen, die das Theme tatsächlich bildet (`PAIRS`, `:83-98`), erzeugt einen benannten Fall pro Paar (`it.each`, `:110`) — und schreibt im Kopf auf, was es **nicht** sehen kann (`:16-19`).

Fünf Zusicherungen. Ehrlich muss der Test sein, dass nur die fünfte die Regel wirklich durchsetzt.

**(a) Keine URLs in `duxtDefaults`.** Rekursiv über String-**Werte** mit ihrem Schlüsselpfad laufen; kein Wert darf `https?://` oder einen nackten Host treffen. Hätte `duxt-config.ts:27, 34, 41, 48, 55` gefangen.

**(b) Keine Produktnamen in `duxtDefaults`.** Derselbe Lauf: ein String-Wert ist zulässig, wenn er mit `^duxt\.defaults\.` **beginnt** (ein interner Schlüssel, der beim Rendern aufgelöst wird) oder wenn er kein Wort aus `/\b(duxt|nuxt|shadcn|tailwind|mdc|kirch)\b/i` enthält. Der `duxt.defaults.`-Schutz muss ein **Präfix**-Test sein, kein „enthält duxt" — sonst käme `title: 'duxt'` trivial durch. Hätte `:14 'duxt'`, `:26 'Nuxt'`, `:33 'Nuxt Content'`, `:40 'shadcn-vue'`, `:47 'Tailwind CSS'`, `:54 'MDC syntax'` gefangen.

**(c) Dieselben zwei Regeln über alle Locale-Dateien.** Per `readdir` über `i18n/locales/*/duxt/*.json` (keine fest verdrahtete Dateiliste), auf Blatt-**Werte** flachgeklopft — **niemals** auf Schlüssel, sonst schlägt der `"duxt": {`-Wrapper in allen 71 Dateien an. Braucht eine kleine, kommentierte `ALLOW`-Liste: `Markdown`, `ChatGPT`, `Claude` (`page.json:19-21`, Bedienoberfläche für Funktionen, die die Ebene selbst zeichnet). Genau diese Liste ist der Wert des Tests — ein vierter Eintrag muss schriftlich begründet werden. Hätte `defaults.json:16`, `:37`, `:42`, `:46` und `devtools.json:4` gefangen.

**(d) Zweiseitige Schlüsselparität.** Alle `duxt.defaults.*`-Literale aus `duxtDefaults` **plus** die vier direkten `$t()`-Aufrufe in `app/pages/index.vue:107, 347, 361, 434` sammeln; dagegen alle Blattpfade unter `duxt.defaults.` in `i18n/locales/en/duxt/*.json`. Die Mengen müssen gleich sein. Die Vorwärtsrichtung fängt genau das Versagen, vor dem die Reihenfolge dieses Plans schützt — eine Konfiguration, die auf einen gelöschten Schlüssel zeigt, was `duxt-text.ts:70` still als rohen Schlüssel rendert. Die Rückrichtung fängt die Waise, zu der `i18n/locales/pt-BR/duxt/defaults.json` gerade wird.

**(e) Ein festgeschriebenes Inventar — die einzige Zusicherung, die die Regel durchsetzt.** (a)-(c) hätten 11 der 20 Fundzeilen des Handoffs erwischt und nur 5 der 12 `defaults.json`-Zeilen. `"The framework underneath"`, `"Extend, don't scaffold"`, `"Resources"` und `version: 'v0.0.0'` nennen kein Produkt und enthalten keine URL — sie sind duxts Marketing in Wörtern, über die kein Regex stolpert. Also zusätzlich:

```ts
expect(topLevelKeys(duxtDefaults)).toEqual([...]);
expect(flatten(enDefaults)).toEqual([...]);
```

gegen handgeschriebene Listen mit **einer Zeile Begründung pro Eintrag** — das direkte Gegenstück zu `PAIRS` bei `contrast.test.ts:83-98`. Einen Schlüssel hinzuzufügen kostet dann eine Teständerung und einen Satz dazu, warum die Ebene diesen String selbst zeichnet. Das ist der einzige Mechanismus, der die Wiederkehr verhindert, weil die Regel von **Eigentum** handelt, nicht von Vokabular. Und es ist die einzige Zusicherung, die `version: 'v0.0.0'` gefangen hätte.

**Der Kopfkommentar muss aufschreiben, was nichts davon sieht:** `pnpm build:app` und `pnpm check:a11y` laufen beide über `www/`, das jeden leckenden Schlüssel überschreibt — **nichts, was CI baut, rendert je die Standardwerte der Ebene.** Dasselbe Argument, das `contrast.test.ts:8-14` über jsdom macht, und der Grund, warum dieser Test nach `tests/` gehört und nicht in ein Gate.

**Wichtig für den Autor:** `duxt.defaults` wächst durch diese Arbeit um `title`. Der Test darf nicht behaupten, dass die Menge monoton schrumpft.

---

## Open questions

**1. `duxt.title` — neutraler Platzhalter oder gar kein Standard?**
Handoff-Frage 1, jetzt durch den Typ entschieden statt durch Geschmack. `app/types/duxt.d.ts:256` deklariert `title: DuxtText` **ohne** `?`, also bricht ein Entfernen `pnpm typecheck:app`; es optional zu machen ändert die öffentliche Oberfläche der Ebene (`feat!:` nach CLAUDE.md) und liefert an sechs Stellen das gedruckte Wort `undefined`, darunter ein `<img>` ohne `alt` in `DuxtBrand.vue:36`.
**Empfehlung: neutraler Platzhalter** (`duxt.defaults.title` → „Documentation"). Kein Typwechsel, kein a11y-Verstoß, benennt niemanden. `headline` und `description` sind echt optional (`duxt.d.ts:217-218`) und degradieren sauber — die werden ersatzlos gelöscht, wofür die `?? 'Documentation.'`-Rückfälle in `llms.txt.get.ts:46`, `llms-full.txt.get.ts:49` und `rss.xml.get.ts:118` offensichtlich geschrieben wurden.

**2. Was soll das Hero-Pill auf duxt.app sagen?**
`version: 'v0.0.0'` nach www zu schreiben erhält das heutige Rendering und verschiebt das Eigentum an der Unwahrheit — aber der Satz „v0.0.0 released" bleibt falsch, solange kein Release geschnitten ist. Es gibt keine korrekte Zahl: `package.json` ist `0.0.0`, `.release-please-manifest.json` ist `{".": "0.0.0"}`, und `duxt.layerVersion` wird von `modules/config.ts:59-63` **hinter** jede `app.config.ts` gemischt, ist von dort also unlesbar; `./package.json` steht nicht in der `exports`-Map.
**Empfehlung: das Literal jetzt schreiben** (Plan wie oben) **und `www/app/app.config.ts` in `extra-files` von `release-please-config.json` eintragen**, das heute keine hat — dann korrigiert sich die Zeile beim ersten Release von selbst. Die Alternative, wenn das Pill sofort aufhören soll zu lügen: kein `version` setzen und www's gesamten `landing.badge`-Block löschen. Dann verschwindet das Pill **und** das Kopfabzeichen. Das ist eine Inhaltsentscheidung, keine mechanische.

**3. Die zehn Devtools-Fixtures in `public/` (unsure-Fund 3 des Handoffs, hiermit entschieden).**
Die „196 KB" des Handoffs sind die Blockgröße von `du`; real sind es **175 088 Bytes** auf der Platte und **~11 KB** im gzip-Tarball (`tar czf - public/devtools | wc -c` = 11 438). Auf Gewicht allein gibt es keinen Fall zum Entfernen — der Handoff überschätzt die Leitungskosten um Faktor 17. Das echte Argument liegt woanders: `docs/` steht **nicht** in der `files`-Allowlist von `package.json`, die Ebene liefert also die Fixtures ohne die Seiten, die sie einbetten — aber genau die duxt-eigene `sources`-Funktion macht es zu einem realen Ablauf, dass ein Dritter `{ repo: 'kirchDev/duxt', path: 'docs' }` einträgt und diese Referenzseiten auf der eigenen Domain rendert. Dann ist `public/` der Ebene das, was die Rahmen liefert.
**Empfehlung: behalten, aber crawlen verbieten.** Jeder Konsument serviert heute zehn indexierbare Dokumente mit `<title>duxt — Sources</title>` von seiner eigenen Domain (`server/devtools/shell.ts:591`). Die Ebene hat keinen `robots:`-Schlüssel. Vor `sitemap:` in `nuxt.config.ts` einfügen:

```ts
  // The devtools previews in `public/` are fixtures for one reference page,
  // not pages of anybody's site. Every consumer serves them, because Nuxt
  // serves every layer's `public/` — and none of them wants ten documents
  // titled "duxt — Sources" indexed against their own domain.
  robots: {
    disallow: ['/devtools/']
  },
```

`@nuxtjs/robots@6.2.0` nimmt ein top-level `disallow`, und defu konkateniert es über Layer hinweg — die Liste eines Konsumenten wird ergänzt, nicht ersetzt. Eigener Commit, `chore: keep the devtools fixtures out of a consumer's index`.

**4. `content.build.markdown.highlight.langs` und `'php'` (unsure-Fund 2, hiermit entschieden).**
`'php'` ist **kein** Leck. Über `docs/` und `www/` hinweg gibt es null PHP-Fences — aber acht der vierzehn konfigurierten Sprachen sind ebenso ungenutzt (`css`, `diff`, `html`, `js`, `jsonc`, `php`, `sh`, `yaml`). Die Liste ist ein generisches Starterset gängiger Websprachen, genau was eine Doku-Ebene liefern soll, und defu **konkateniert** sie über Layer hinweg — ein Konsument mit `langs: ['rust']` bekommt Rust plus diese vierzehn, wird also nie blockiert.
**Empfehlung: unverändert lassen, keine Bearbeitung.**

**5. `i18n.defaultLocale` — und ein zweites, ungefundenes `en-GB` (unsure-Fund 1, hiermit entschieden, plus ein neuer Fehler).**
`nuxt.config.ts:424` `defaultLocale: 'en-GB'` bleibt: es ist URL-relevant unter `strategy: 'prefix_except_default'`, der Kommentar bei `:413-414` warnt selbst davor, es später zu bewegen, und `modules/config.ts:257-264` validiert es bereits gegen `duxt.locales`. Ebenso bleibt `i18n/i18n.config.ts:15` — das beantwortet die andere Frage (welches Locale einen **fehlenden Schlüssel** liefert), und `en-GB` ist der einzige vollständige Satz, den die Ebene hat.
**Neu und ungefunden: `nuxt.config.ts:429` `detectBrowserLanguage.fallbackLocale: 'en-GB'`.** defu mischt das verschachtelte Objekt schlüsselweise, ein Konsument mit `i18n: { defaultLocale: 'de-DE' }` verdrängt es also **nicht**. Setzt er zusätzlich `duxt.locales: ['de-DE']`, filtert `modules/config.ts:251-255` `en-GB` aus jeder Layer-Locale-Liste, während `detectBrowserLanguage` Wurzelbesucher weiterhin dorthin leitet. Nichts wirft — genau die Klasse stillen Fehlers, gegen die `modules/config.ts:98-104` existiert.
**Empfehlung: die Prüfung in `modules/config.ts:257-264` auf `detectBrowserLanguage.fallbackLocale` ausweiten**, statt die Zeile zu löschen (Löschen ändert Verhalten für alle, die Prüfung nicht). Eigener Commit außerhalb dieses Schnitts, `fix: reject a browser fallback locale the site does not serve`.

**6. `duxt.devtools.preview` — ist die Umformulierung überhaupt richtig?**
Die Ebene registriert ihren Devtools-Tab in `modules/devtools.ts:82-83` als `name: 'duxt', title: 'duxt'`, und `server/devtools/shell.ts:591` rendert `<title>duxt — …</title>`. Der neue Text „The {tab} panel of the devtools tab" beschreibt also einen Tab, dessen sichtbare Beschriftung in den Devtools des Konsumenten **„duxt" lautet** — der zugängliche Name wird ungenauer, nicht neutraler. Entweder ist der Tab-Name selbst das Leck (er ist es nicht: das ist Selbstzuschreibung derselben Klasse wie die „Powered by duxt"-Zeile in `DuxtFooter.vue:60`, die `poweredBy: false` abschaltet), oder der String war in Ordnung.
**Empfehlung: trotzdem umformulieren, aber wissen warum** — der zugängliche Name beschreibt das _Panel_, nicht die Marke, und ein Screenreader-Nutzer braucht „duxt" dort nicht zweimal. Wenn der Eigentümer widerspricht, ist Commit 8 der einzige, der ersatzlos entfällt; er hängt an nichts.

**7. Die drei Wörter in `docs/**/4.reference/1.configuration.md:31`, die vorher schon falsch waren.**
Die `landing`-Zeile listet `badge` als Teil des Standards, während die Landing-Tabelle zwölf Zeilen darunter `badge` als **none** führt. Nach Commit 5 schrumpft die Zeile auf `badge, one action` und der Widerspruch springt ins Auge.
**Empfehlung: `badge` in derselben Bearbeitung streichen** — eine Ein-Wort-Korrektur, kein Umschreiben, und die Zeile ist danach wahr. Die Verifikation riet ausdrücklich, die minimale Bearbeitung nicht zu einem Umbau auszuweiten; das hier ist keiner, aber es ist ein Wort mehr als beauftragt, deshalb steht es hier.

**8. Commit-Typ für die drei Layer-Löschungen (3, 5, 7).**
Sie ändern Standardwerte, die ein Konsument sieht, benennen aber nichts um und brechen keine Überschreibung — CLAUDE.md reserviert `feat!:` für Umbenennungen der öffentlichen Oberfläche.
**Empfehlung: `fix:`.** Ein Konsument, der nichts gesetzt hat, hört auf, fremden Inhalt zu erben; das ist der Defekt, nicht ein Bruch. Bei `0.0.0` schneidet release-please ohnehin `0.0.x`.

**9. Kein Gate sieht Commit 8, und drei der fünf a11y-Routen sind vermutlich tot.**
`scripts/check-a11y.ts:44-50` listet `/duxt/getting-started`, `/duxt/reference/mdc-components` und `/workflows/v0.7.0`. www hat heute **eine** unpräfixierte Quelle (`www/app/app.config.ts:30-47`) und serviert `/getting-started`, `/concepts`, `/guides`, `/reference`, `/credits`. Wenn diese drei 404 liefern, prüft das a11y-Gate dreimal die Fehlerseite statt einer Doku-Seite — und keine der fünf Routen bettet ein `::devtools-panel` ein, weshalb axes `frame-title`-Regel den in Commit 8 geänderten String nie sieht.
**Empfehlung: vor dem Schnitt verifizieren** (`node www/.output/server/index.mjs`, dann `curl -o /dev/null -w '%{http_code}'` auf die fünf Routen) und `ROUTES` in einem eigenen Commit korrigieren, plus eine Devtools-Referenzseite aufnehmen. Außerhalb dieses Plans, aber es untergräbt die Prüfung, auf die sich die Commits 6 und 7 stützen.

---
