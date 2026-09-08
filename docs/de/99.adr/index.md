---
title: Architekturentscheidungen
description: Das Entscheidungsprotokoll — jede Architekturentscheidung, die für duxt festgehalten wurde.
icon: lucide:gavel
---

Eine Entscheidung verdient ein ADR, wenn sie spätere Arbeit einschränkt und ihre
Begründung sonst verloren ginge: eine Wahl zwischen echten Alternativen, eine
Konvention, der jeder Teil des Projekts folgen muss, eine Abwägung, die wie ein
Fehler aussieht, bis man den Grund kennt. Aufzeichnungen werden nur angehängt —
eine umgekehrte Entscheidung wird als neues ADR geschrieben, das das alte
ablöst, nie als Änderung daran.

| ADR                                                              | Entscheidung                                      | Status   | Datum      |
| :--------------------------------------------------------------- | :------------------------------------------------ | :------- | :--------- |
| [ADR-0001](/adr/0001-build-duxt-as-a-layer-carrying-a-module)     | duxt als Ebene bauen, die ein Modul trägt         | accepted | 2026-09-06 |
| [ADR-0002](/adr/0002-generate-the-collections-from-one-source-list) | Die Collections aus einer Quellenliste erzeugen | accepted | 2026-09-06 |
| [ADR-0003](/adr/0003-decide-the-url-prefixes-at-build-time)       | Die URL-Präfixe zur Build-Zeit entscheiden       | accepted | 2026-09-06 |
| [ADR-0004](/adr/0004-render-markdown-components-with-mdc)         | Markdown-Komponenten mit MDC rendern             | accepted | 2026-09-06 |
| [ADR-0005](/adr/0005-ship-the-layer-without-owner-specific-links) | Die Ebene ohne betreiberspezifische Links ausliefern | accepted | 2026-09-06 |
| [ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime) | Nach Zeitplan neu bauen statt zur Laufzeit aktualisieren | accepted | 2026-09-06 |
| [ADR-0007](/adr/0007-serve-translations-as-collections-of-their-own) | Übersetzungen als eigene Collections ausliefern | accepted | 2026-09-06 |
| [ADR-0008](/adr/0008-build-the-theme-on-owned-shadcn-vue-components) | Das Theme auf eigenen shadcn-vue-Komponenten bauen | accepted | 2026-09-08 |
| [ADR-0009](/adr/0009-take-the-seo-stack-from-the-nuxt-seo-bundle) | Den SEO-Unterbau aus dem Nuxt-SEO-Bündel nehmen | accepted | 2026-09-08 |
