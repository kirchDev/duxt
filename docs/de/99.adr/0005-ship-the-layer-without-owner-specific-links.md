---
title: Die Ebene ohne betreiberspezifische Links ausliefern
description: Jeder Standard, der ein bestimmtes Projekt benennen würde — Repository, Issue-Tracker, Community, Impressum —, wird leer ausgeliefert.
status: accepted
date: 2026-09-06
---

## Kontext

Ein Dokumentations-Theme zeichnet mehrere Reihen von Links: Icon-Links in der
Navigationsleiste, einen Community-Block neben dem Inhaltsverzeichnis,
rechtliche Links im Fußbereich, Schaltflächen auf der Landeseite. Sie mit dem
eigenen Projekt des Themes zu füllen lässt eine Vorführseite fertig aussehen —
und gibt jedem Konsumenten einen „Gib diesem Repository einen Stern“-Button in
die Hand, der die Arbeit eines anderen mit einem Stern versieht, eine Community,
die nicht seine ist, und ein Impressum, das für ihn rechtlich falsch ist.

Die Rechtszeile des Fußbereichs hat das Prinzip zuerst entschieden, denn eine
deutsche Seite muss ein Impressum zeigen, und es zu liefern steht unverkennbar
nicht der Vorlage zu.

## Entscheidung

Jeder Standard, der ein bestimmtes Projekt oder eine bestimmte Organisation
benennen würde, wird **leer** ausgeliefert. Die Links des Themes selbst liegen
in der Konfiguration der konsumierenden Seite, wo sie ein Beispiel sind und kein
Standard. Generischer Oberflächentext, der niemanden benennt — eine
Spaltenüberschrift, eine „Doku lesen“-Aktion —, bleibt in der Ebene.

## Konsequenzen

Wer die Ebene als Fremder erweitert, bekommt eine leere Reihe statt einer
falschen, und eine leere Reihe fehlt sichtbar, während ein falscher Link richtig
aussieht.

Die Vorführseite trägt mehr Konfiguration, als ein minimaler Konsument braucht,
und genau das ist ihre Aufgabe: Sie ist das durchgearbeitete Beispiel für jede
Reihe, die ein Konsument füllen muss.

Die eigenen Nachrichtenschlüssel der Ebene bleiben zurück, wenn ihre Links
gehen, und diese Schlüssel sind intern. Ein Konsument, der in sie hineingreift,
hinge an einem Namen, der ohne Major-Release umbenannt werden darf, und ein
fehlender Schlüssel wird als der Schlüssel selbst ausgegeben — der Bruch
erreichte also einen Leser, bevor er einen Build erreicht. Konsumenten schreiben
ihre eigenen Zeichenketten; die
[Konfigurationsseite](/getting-started/configuration) sagt wie.
