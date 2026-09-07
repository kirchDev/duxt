---
title: Die Collections aus einer Quellenliste erzeugen
description: Content-Collections zur Ladezeit der Konfiguration aus einer kompakten Quellenliste berechnen, statt Konsumenten sie deklarieren zu lassen.
status: accepted
date: 2026-09-06
---

## Kontext

Nuxt Content bezieht eine Collection aus einem git-Repository an einem Branch
oder einem Tag, authentifiziert sich gegen ein privates und cacht den Download
über einen Hash. Das wurde durch das Lesen von Content selbst verifiziert, bevor
irgendetwas hiervon gebaut wurde, und es heißt, dass die schwere Hälfte
versionierter Dokumentation über mehrere Repositories bereits existierte und
nicht neu gebaut werden musste.

Was nicht existierte, war die Ergonomie. Eine Seite, die mehrere Versionen
mehrerer Projekte ausliefert, deklariert eine Collection je Repository × Ref,
von Hand: Drei Versionen über vierzehn Repositories sind zweiundvierzig
Deklarationen, und ein Release zu schneiden bearbeitet alle vierzehn. Content
bietet auch keinen Hook, um Collections einzuschleusen — aber es lädt die
Content-Konfiguration jeder Ebene über c12, was heißt, dass diese Datei
ausgeführter Code ist statt einer Datendatei, und ihre Collections beim Laden
berechnen darf.

## Entscheidung

Konsumenten deklarieren eine kompakte **Quellenliste** — ein Ordner, optional
ein Repository, optional Refs — in der eigenen App-Konfiguration der Seite, und
die Content-Konfiguration der Ebene berechnet daraus zur Ladezeit eine
Collection je Quelle × Ref. Dieselbe Liste wird vom Build ein zweites Mal
aufgelöst, zu einem Manifest, das benennt, welche Collection welches URL-Präfix
bedient, und dieses Manifest ist das, was das Theme liest.

## Konsequenzen

Die Liste hat die Länge der Anzahl der Projekte statt des Produkts aus Projekten
und Versionen, und der einzelne unversionierte Ordner braucht überhaupt keine
Konfiguration.

Die Kurzform drückt weniger aus als eine handgeschriebene Collection, und das
wird immer so bleiben. Überlebbar ist das nur, weil Content die
Content-Konfiguration jeder Ebene zusammenführt, wobei die spätere gewinnt: Ein
Konsument, der etwas braucht, das die Kurzform nicht sagen kann, schreibt seine
eigene Datei und übernimmt vollständig.

Mehrere Funktionen brauchen keine eigene Konfiguration mehr, weil eine Quelle
bereits ein Repository, einen Ref und einen Ordner benennt — Links zurück zur
Quelle, das Datum der letzten Aktualisierung und die Liste der Mitwirkenden
fallen alle daraus ab.

Collection-Namen werden zu Daten. Eine Seite mit zwei Repositories hat keine
Collection namens `docs`, nichts in der Ebene darf also eine so benennen, und
das Theme liest den Namen stattdessen aus dem Manifest. Code, der einen
Collection-Namen fest verdrahtet, funktioniert auf einer Seite mit einer
einzigen Quelle und bricht auf jeder anderen.

Die Collection-Pfade lösen gegen die Ebene auf statt gegen den Konsumenten, weil
Content die Ebene, die eine Collection deklariert hat, als deren Wurzel
vermerkt. Die Ebene berechnet deshalb absolute Pfade, was nur möglich ist, weil
die Konfiguration ausgeführter Code ist — dieselbe Eigenschaft, auf der die
ganze Kurzform ruht.
