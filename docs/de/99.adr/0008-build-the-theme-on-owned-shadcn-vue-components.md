---
title: Das Theme auf eigenen shadcn-vue-Komponenten bauen
description: Die Ebene hält den Quelltext ihrer Interface-Komponenten selbst, statt sie aus einer Komponentenbibliothek oder einem fertigen Dokumentations-Theme zu importieren.
status: accepted
date: 2026-09-08
---

## Kontext

Eine Dokumentationsebene besteht überwiegend aus Oberfläche: Kopfbereich,
Seitenleiste, Inhaltsverzeichnis, Codeblöcke, Suchdialog. Irgendetwas muss sie
zeichnen, und die Wahl entscheidet darüber, wie viel ein Konsument ändern kann,
ohne zu forken.

Der ganze Anspruch der Ebene ist, erweitert statt generiert zu werden —
`extends: ['@kirchdev/duxt']`, und jede Datei bleibt überschreibbar. Ein Theme,
dessen Erscheinung nur über die Optionen erreichbar wäre, an die seine Autorin
gedacht hat, widerspräche dem beim ersten Ding, das ein Konsument anders haben
will. Nuxts Layer-Auflösung schenkt einem Konsumenten die Überschreibung auf
Dateiebene bereits — die Frage war also, was diese Dateien sein sollen.

## Entscheidung

Die Ebene besitzt den Quelltext ihrer Komponenten. shadcn-vue dient als Quelle
der Primitive: sein CLI schreibt den Code einer Komponente ins Repository, und ab
diesem Punkt gehört die Datei der Ebene und keiner Abhängigkeit.
`components.json` zeigt das CLI auf den eigenen Alias der Ebene, ein Primitiv
hinzuzufügen ist also ein Befehl, und Tailwind liefert das Styling darunter.

Die Palette besteht aus CSS-Custom-Properties. Komponenten lesen Tokens und
halten keine Farben — genau das lässt eine einzeilige Überschreibung jede Fläche
erreichen.

## Konsequenzen

Ein Konsument kann jeden Teil der Oberfläche ändern, in der Tiefe, die die
Änderung braucht: ein Token neu definieren, eine Komponente per Namen
überschatten oder ein eigenes Primitiv hinzufügen. Nichts davon verlangt einen
Fork, und nichts davon wartet darauf, dass die Ebene eine Option dafür freilegt.

Der Preis ist Pflege. Eine Korrektur an einem Primitiv kommt nicht mit einem
Versionssprung — sie kommt, wenn jemand das CLI für diese Komponente erneut
aufruft. Die Ebene trägt das für die Primitive, die sie ausliefert; ein Konsument,
der eines überschreibt, trägt es ab dann selbst. Um diesen Tausch herum ist die
Überschreib-Anleitung gebaut, und er ist der Grund, dass es sie überhaupt gibt.

Übernommene Dateien, die das CLI nicht erreicht, sind die scharfe Kante desselben
Tauschs: ein Stylesheet ohne Registry-Eintrag lässt sich nur durch erneutes
Herunterladen aktualisieren, lokale Änderungen daran gehen also still verloren,
statt laut zu kollidieren.

## Erwogene Alternativen

**Ein fertiges Dokumentations-Theme.** Docus ist die naheliegende Wahl — das
eigene Theme von Nuxt Content, und alles, was eine Dokumentationsseite beim
ersten Start braucht. Abgelehnt aus demselben Grund, aus dem es reizvoll ist: die
Seite, die es erzeugt, gehört seiner Autorin, und Umformen heißt entweder eine
Option, die es gibt, oder einen Fork. Eine Ebene, deren Konsumenten sich
voneinander unterscheiden sollen, konnte diese Decke nicht akzeptieren.

**Eine Komponentenbibliothek als Abhängigkeit.** Nuxt UI hätte die Primitive ohne
den Pflegeaufwand geliefert, und die Ebene wäre seinen Releases gefolgt, statt
Code zu kopieren. Abgelehnt, weil sich die Komponenten einer Abhängigkeit nur so
weit ändern lassen, wie ihre Props es zulassen — die Ebene hätte dann einen
zweiten Überschreib-Mechanismus für den Rest erfinden müssen, und bei zweien wäre
keiner der offensichtliche gewesen, zu dem man greift.

**Handgeschriebene Komponenten ganz ohne Upstream.** Das räumt die
Abhängigkeitsfrage vollständig aus und wurde wegen der Kosten abgelehnt:
zugängliche Primitive sind genau dort schwierig, wo man sie leicht falsch macht,
und ein von Grund auf geschriebener Dialog oder eine Combobox wäre schlechter als
eine, die von einer Quelle übernommen ist, die das bereits gelöst hat.
