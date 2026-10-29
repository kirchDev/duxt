---
title: Die Nuxt-SEO-Module einzeln laden
description: Die Ebene verzichtet auf das Bündel @nuxtjs/seo und lädt die sieben Module, die sie nutzt, einzeln — denn ab v6 bringt das Bündel Module mit, die llms.txt, Markdown und MCP der Ebene doppeln. Löst ab, wie ADR-0009 sie installiert, nicht welche.
status: accepted
date: 2026-10-29
---

## Kontext

ADR-0009 nahm den SEO-Unterbau aus `@nuxtjs/seo`: robots, sitemap, OG-Image,
schema.org, die SEO-Utilities, den Link-Checker und Site-Config, installiert über
ein Bündel, das „keine eigene Logik enthält“.

Version 6 des Bündels installiert zwei Module mehr. `nuxt-ai-ready` liefert
`llms.txt`, `llms-full.txt`, Markdown-Fassungen jeder Seite und eigene
MCP-Werkzeuge — genau die Oberfläche, für die es diese Ebene gibt, über Quellen,
Versionen und Sprachen hinweg. Neben der eigenen geladen, beansprucht es dieselben
Routen, und seine MCP-Werkzeuge brauchen eine Datenbank, die die Ebene nicht
mitbringt: Der Build bricht ab und verlangt `drizzle-orm`. `nuxt-skew-protection`
kommt ungefragt mit.

Eine Site, die die Ebene erweitert, erbt jedes Modul, das die Ebene lädt. Ein
Bündel, das mit jeder Major-Version wächst, lässt damit jeden Konsumenten
wachsen, ohne dass die Ebene etwas entschieden hätte.

## Entscheidung

Die Ebene hängt von den sieben Modulen ab, die ADR-0009 gewählt hat, und lädt sie
einzeln, in der Reihenfolge, in der das Bündel sie installiert —
`@nuxtjs/robots`, `@nuxtjs/sitemap`, `nuxt-link-checker`, `nuxt-og-image`,
`nuxt-schema-org`, `nuxt-seo-utils`, `nuxt-site-config` — weiterhin vor
`@nuxt/content`, wegen der Content-Integration der Sitemap.

Welche Module und wie sie konfiguriert sind, bleibt, wie ADR-0009 es entschieden
hat. Nur die Installation ändert sich: einzeln statt über das Bündel.

## Konsequenzen

Die Ebene trägt sieben Abhängigkeiten statt einer, und deren Versionen müssen
zusammen wandern; bisher meldeten die Versionsprüfungen des Bündels, wenn sie es
nicht taten. Ein neues Modul der Nuxt-SEO-Familie erreicht die Ebene nur noch,
wenn es jemand bewusst hinzufügt.

Das gemeinsame Devtools-Panel führt die Module des Bündels, die die Ebene nicht
lädt, als fehlend. Das ist die Sicht des Panels auf das Bündel, kein Fehler der
Site.

## Erwogene Alternativen

**Das Bündel behalten und `nuxt-ai-ready` abschalten.** Eine Zeile, und es baut.
Verworfen, weil das nächste Modul, das das Bündel hinzufügt, wieder still jeden
Konsumenten erreichen würde und `nuxt-skew-protection` trotzdem käme.

**Die eigenen llms.txt-, Markdown- und MCP-Routen der Ebene durch
`nuxt-ai-ready` ersetzen.** Das gäbe auf, was die Ebene darüber hinaus bietet —
Quellen, Versionen und Sprachen in jeder dieser Oberflächen — für weniger Code.

**Bei v5 des Bündels bleiben.** Das hält auch die Sitemap auf ihrer alten
Major-Version fest und schiebt dieselbe Entscheidung nur auf.
