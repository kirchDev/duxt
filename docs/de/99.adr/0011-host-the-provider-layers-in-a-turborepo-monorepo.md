---
title: Die Provider-Ebenen in einem Turborepo-Monorepo führen
description: Die Ebene zieht nach packages/duxt und die Website nach apps/www, jedes veröffentlichte Paket versioniert und taggt für sich als <name>@vX.Y.Z, und die in #74 und #75 festgehaltene Entscheidung für eigene Repositories ist abgelöst.
status: accepted
date: 2026-09-15
---

## Kontext

#74 und #75 haben jeweils entschieden, dass die offiziellen Such-Provider als
unabhängig veröffentlichte Begleit-Ebenen **in eigenen Repositories** erscheinen
— `@kirchdev/duxt-typesense`, `@kirchdev/duxt-meilisearch`. Keines dieser
Repositories existiert, und ein neues Open-Source-Repository ist hier nicht einen
Befehl entfernt: Es wird über OpenTofu bereitgestellt und trägt danach die
vollständige Meta-Ebene selbst — Workflow-Stubs, release-please, Dependabot,
CodeQL, eine Lizenz, eine README und eine Agenten-Konfiguration. Das ist der
dauerhafte Preis zweier dünner Adapter über genau einem Build-Hook.

Der Vertrag, den beide nutzen, `duxt:search:records`, liegt in diesem
Repository. Über drei Repositories verteilt würde jede Änderung daran zu einem
Release-Reigen — Ebene anheben, veröffentlichen, den Bereich jedes Providers
erweitern, veröffentlichen — ohne ein einziges Gate, das den Hook gegen einen
Konsumenten laufen lässt. Die Entwicklungs-Website konnte keinen Provider
ausprobieren, ohne von einer veröffentlichten Version abzuhängen.

Das Repository war zudem auf genau ein Paket zugeschnitten: Seine Wurzel **war**
die Ebene, und dreißig Build-Module lagen flach neben der Meta-Konfiguration,
von ihr nur durch eine `files`-Allowlist getrennt.

## Entscheidung

**Ein Repository, ein pnpm-Workspace, gesteuert von Turborepo.**

- `packages/duxt` ist `@kirchdev/duxt`. Seine Build-Module ziehen aus der
  flachen Wurzel in Themenordner unter `build/` — `sources/`, `sections/`,
  `bruno/`, `openapi/`, `search/`, `content/`, `og-image/`, `git/`, `config/`,
  `cli/` —, und die `files`-Allowlist schrumpft auf Verzeichnisse. Die
  `exports`-Map behält jeden Subpfad-Namen.
- `apps/www` ist die Website, die die Ebene entwickelt, samt der Prüfungen, die
  ihren Build lesen.
- Die Wurzel ist kein Paket. Sie behält Workspace- und Meta-Konfiguration sowie
  `docs/`, das `apps/www` veröffentlicht.
- Provider-Pakete kommen mit #74 und #75 als `packages/duxt-typesense` und
  `packages/duxt-meilisearch` neben die Ebene.

**Jedes veröffentlichte Paket ist eine eigene Release-Einheit.** release-please
läuft im Manifest-Modus mit einem Eintrag pro Paket, jeweils mit eigener Version
und eigenem Changelog, und ein Release veröffentlicht nur die Pakete, die es
angehoben hat. Eine gemeinsame Version wurde verworfen, weil sie unveränderte
Pakete unter neuer Nummer erneut veröffentlicht.

**Jedes Paket taggt `<name>@vX.Y.Z`, die Ebene eingeschlossen** —
`include-component-in-tag` mit `tag-separator: "@"`, sodass `duxt@v0.5.0` neben
`duxt-typesense@v0.1.0` steht. Die Version selbst bleibt in `package.json` und
auf npm eine bloße Zahl. Die einfachen Tags `v0.1.0`…`v0.4.0` bleiben, und
`last-release-sha` zeigt einmalig auf den Release-Commit von `v0.4.0`, damit
release-please den vorigen Release der Ebene trotz des neuen Musters findet.

**Der Changelog der Ebene bleibt an der Repository-Wurzel**, als
`changelog-path: "/CHANGELOG.md"`. Die Website veröffentlicht den Changelog jeder
Version, die sie ausliefert, gelesen aus dem Checkout dieser Version, und jeder
bestehende Tag hat die Datei dort. Ein Umzug ins Paket hätte jede frühere
Ausgabe ohne ihre Release-Seiten gelassen. Der Changelog eines Providers liegt in
dessen eigenem Verzeichnis; er hat keine Historie zu bewahren.

**duxts eigene tag-basierte Versionierung lernt Komponenten-Tags**, und das muss
vor dem ersten Release nach dem Umzug landen. `latest`, die Release-Erkennung
und die Reihenfolge im Umschalter lesen `<name>@vX.Y.Z` wie `vX.Y.Z`; Label und
URL-Segment zeigen nur die Version; und eine Quelle kann mit `tagComponent` auf
die Tags eines Pakets eingeschränkt werden, wobei einfache Tags als dessen
frühere Historie weiter zählen. Ohne das wäre `latest` von `apps/www` nach
`duxt@v0.5.0` auf `v0.4.0` stehen geblieben, ohne dass ein Build scheitert.

**Über eine Veröffentlichung entscheidet die Registry.** Ein Paket wird
veröffentlicht, wenn seine Version einen `<component>@v<version>`-Tag hat und npm
diese Version nicht kennt. Das zentrale `_publish-npm.yml` veröffentlicht die
Repository-Wurzel und das zentrale `_release-please.yml` reicht nur die Ausgaben
des Wurzelpakets weiter, deshalb gehören die Veröffentlichungs-Jobs dem
Repository selbst, bis die zentralen Bodies ein Arbeitsverzeichnis annehmen.

**Provider hängen als Peer von `@kirchdev/duxt` mit weitem Bereich ab,
`>=0.4.0 <1`**, die Untergrenze dort, wo der Provider zuerst etwas braucht — nie
`^0.x`, womit jeder Provider bei jedem Minor der Ebene releasen müsste. Das Gate
des Monorepos beweist die Kompatibilität, und die Untergrenze steigt nur, wenn
sich der Hook-Vertrag inkompatibel ändert.

**Der Cache von Turborepo ist rein lokal** — kein Remote-Cache, kein Konto, kein
Token. Gecacht wird eine Aufgabe nur, wo ihre deklarierten Eingaben das Ergebnis
bestimmen: Bei den Unit-Tests ist das so, Typecheck, Build und jede Prüfung über
einen Build lösen `latest` gegen ein Remote auf und sind es nicht.

## Konsequenzen

Die in #74 und #75 festgehaltene Entscheidung für eigene Repositories ist
abgelöst; diese Issues bauen ihre Provider-Pakete stattdessen hier.

Jeder ebenen-relative Pfad ist umgezogen, und keiner löst sich so auf, wie er
sich liest — der Umzug ist also nur so gut wie seine Prüfung: das volle Gate, ein
Workers-Build mit der Routenklassifizierung und das gepackte Tarball, installiert
in einen Test-Konsumenten.

Eine Änderung am Hook-Vertrag und an seinen Konsumenten landet nun in einem Pull
Request hinter einem Gate, und die Entwicklungs-Website kann einen Provider als
Workspace-Abhängigkeit nutzen.

Ein Monorepo, das mit release-please taggt, kann duxt auf seine eigenen Tags
richten — die Unterstützung präfixierter Tags ist damit eine Funktion für
Konsumenten, nicht nur eine Bequemlichkeit dieses Repositories.

Pfade in den früheren Einträgen beschreiben die Struktur ihrer Zeit. Sie werden
nicht umgeschrieben, denn diese Einträge werden nur ergänzt.
