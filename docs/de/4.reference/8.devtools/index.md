---
title: Devtools
description: Zehn Panels, die zeigen, was aus deinen Quellen geworden ist. Nur im Dev-Modus.
icon: lucide:wrench
---

`sources` ist eine kompakte Liste. Was die Seite ausliefert, ist eine Menge aus
Collections, URL-Präfixen, Weiterleitungen, Nachrichtenkatalogen und einem
Download-Cache, die der Build daraus berechnet hat — und bis es diesen Tab gab,
konnte man das alles nur sehen, indem man den Code las, der es erzeugt.

## Öffnen

Starte den Dev-Server und öffne die Nuxt Devtools (`Shift` + `Alt` + `D` oder
den Button in der Ecke). Der Tab heißt **duxt**; die Panels liegen hinter der
Tab-Zeile an seinem oberen Rand. Dieselben Seiten antworten direkt unter
`/_duxt/devtools`, wenn du sie lieber in einem eigenen Fenster hättest.

::callout{type="danger" title="Wird in einem Build nie registriert"}
Die Panels legen die aufgelöste Konfiguration offen, die Dateisystempfade
dahinter und einen Button, der ein Cache-Verzeichnis löscht. Nichts davon geht
in der Produktion irgendjemanden etwas an — deshalb kehrt `modules/devtools.ts`
zurück, bevor außerhalb eines Dev-Servers irgendetwas registriert wird: Die
Route existiert in einem Build gar nicht, statt zu existieren und abzulehnen.
::

## Die Panels

::page-cards
::

## Zu den Vorschauen auf diesen Seiten

Jedes Panel unten ist so eingebettet, wie es rendert — nicht als Screenshot. Die
Seiten führen die Renderfunktionen der Panels selbst über eine Fixture-Seite aus
und speichern das Ergebnis, sodass ein Panel, das eine Spalte bekommt, sie im
selben Commit auch in dieser Dokumentation bekommt.

Diese Fixture-Seite ist ein ausgedachtes Projekt: `acme/sdk`, veröffentlicht in
zwei Versionen (`v2` aus `main`, `v1.9` aus einem Tag) auf Englisch und Deutsch,
dazu `acme/cli` in einer. Sie hat absichtliche Lücken — einen Guide, der älter
ist als die alte Version, zwei Seiten, bei denen die Übersetzung nicht
nachgekommen ist, eine Seite ohne Frontmatter — denn ein Panel, das nichts zu
melden hat, bringt niemandem bei, wie es aussieht, wenn etwas nicht stimmt.

## Ohne Dev-Server

`pnpm exec duxt report` druckt die Quellen, die Prüfungen und die Weiterleitungen
als Markdown — dieselben Daten, die diese Panels zeichnen, in einer Form, die du
in ein Ticket einfügen oder einem Modell geben kannst. `--json` gibt sie
unaufbereitet. Siehe [Was der Build prüft](/concepts/build-checks).

Die Vorschauen sind unbeweglich: Ihre Tabs wechseln zwischen den Panels, und
alles andere — die Editor-Links, der Drop-Button, das Suchformular — tut nichts.
