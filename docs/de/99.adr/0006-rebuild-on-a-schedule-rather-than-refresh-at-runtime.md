---
title: Nach Zeitplan neu bauen statt zur Laufzeit aktualisieren
description: Eine Seite, die ein anderes Repository liest, übernimmt dessen Änderungen beim Bauen, und eine Aktualisierung zur Laufzeit wird nicht angeboten.
status: accepted
date: 2026-09-06
---

## Kontext

Eine Seite, die Dokumentation aus anderen Repositories liest, hat einen
offensichtlichen Wunsch: einen Push ohne Deploy übernehmen. Content lädt ein
entferntes Repository jedoch während des Builds herunter und kompiliert es in
die Datenbank, die der Build ausliefert. Das in einem laufenden Server zu
aktualisieren hieße, die Datenbank an Ort und Stelle neu zu bauen — wofür
Content keinen unterstützten Weg anbietet, und der einzige verfügbare Weg ist
dieselbe clientseitige Datenbank, die die Suche liest.

## Entscheidung

Content wird zur Build-Zeit gelesen und nie zur Laufzeit aktualisiert. Eine
Seite, deren Quellen weitergezogen sind, wird neu gebaut: nach Zeitplan oder
ausgelöst aus dem Quell-Repository.

## Konsequenzen

Ein Deployment ist unveränderlich und ein Build reproduzierbar — die
ausgelieferten Seiten sind genau die Seiten, die kompiliert wurden, und derselbe
Commit erzeugt dieselbe Seite. Statische Ausgabe bleibt möglich, und das ist der
richtige Standard für Dokumentation.

Dokumentation hinkt ihrer Quelle um das Neubau-Intervall hinterher, und ein
Quell-Repository, das seine Doku live haben will, muss den Build der Seite
auslösen. Das ist der Preis, und er wird im Betrieb bezahlt und nicht in der
Ebene.

Nichts im Theme darf annehmen, dass es eine Quelle erneut lesen kann. Ein
Feature, das frischeren Inhalt will, als der Build hat, verlangt nach einer
anderen Architektur und nicht nach einer Einstellung.
