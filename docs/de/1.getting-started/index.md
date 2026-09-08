---
title: Einführung
description: Was duxt ist, und was mit einer einzigen Konfigurationszeile ankommt.
icon: lucide:rocket
---

duxt ist eine Nuxt-Ebene. Du erweiterst sie, legst Markdown in `docs/` — und hast
eine Dokumentationsseite: Navigation, Inhaltsverzeichnis, Suche, Theme,
`llms.txt` und ein MCP-Server inbegriffen.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  extends: ['@kirchdev/duxt']
});
```

Das ist der Fall mit einem einzelnen Ordner, vollständig. Keine Collection, kein
Layout, keine `content.config.ts`.

## Was es nicht ist

duxt bezieht keine Inhalte. [Nuxt Content v3](https://content.nuxt.com) lädt ein
git-Repository an einem Branch oder Tag bereits herunter, authentifiziert sich
gegen ein privates und speichert das Ergebnis hash-basiert zwischen — und duxt
nutzt das, statt es nachzubauen.

Was duxt hinzufügt, ist der Teil, der sonst in jedem Dokumentations-Repository
neu getippt wird: eine Collection je Version und Repository, das URL-Schema, das
sie trägt, der Umschalter, der weiß, welche Seite wo existiert, und ein Theme
darüber. All das wird aus einer einzigen Liste erzeugt — siehe
[Quellen](/concepts/sources).

## Wie es weitergeht

::page-cards
::
