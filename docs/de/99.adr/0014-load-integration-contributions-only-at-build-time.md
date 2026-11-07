---
title: Integrationsbeiträge nur beim Build laden
description: Parser aus der Client-Konfiguration halten und Nuxt-Layer Collections und Seitenmetadaten beitragen lassen.
status: accepted
date: 2026-11-07
---

# ADR-0014 — Integrationsbeiträge nur beim Build laden

## Kontext

Parser und erzeugte Seitenmetadaten müssen sowohl die Content-Konfiguration als auch Nuxt-Module erreichen. Ausführbare Build-Beiträge in der Laufzeitkonfiguration koppeln den Browser an Build-Abhängigkeiten. Anbieterspezifische Navigation bindet außerdem einen Quelldialekt an das Theme.

## Entscheidung

Wir entschieden uns für eine reine Build-Datei, die über Nuxt-Layer aufgelöst wird; die Site hat Vorrang. Eingebaute Integrationen verwenden denselben Vertrag. Quelldialekte schreiben allgemeine Navigationsmetadaten; der Kern sortiert und gruppiert Seiten unabhängig von ihrer Herkunft.

## Folgen

Erweiterungen können das Schema ergänzen, ohne anderen Sites ihre Felder aufzuerlegen. Reine Inhaltsaktualisierungen behalten denselben Parse-Pfad. Eine Schemaänderung verlangt vor neuen kompatiblen Bundles ein neues Anwendungsimage. Für die Prüfung der Extraktionsgrenze haben wir einen instabilen Helfer-Export geöffnet und Änderungen daran vor der Bestätigung durch separate Pakete akzeptiert.
