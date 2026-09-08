---
title: Markdown-Komponenten mit MDC rendern
description: Für Komponenten in Markdown Contents eigene MDC-Syntax nutzen, statt MDX einzuführen.
status: accepted
date: 2026-09-06
---

## Kontext

Ein Dokumentations-Theme braucht Komponenten im Fließtext — Callouts, Code in
Reitern, Parameterfelder, Bäume. Zwei Syntaxen standen zur Verfügung. **MDX**
kompiliert Markdown zu einem Komponentenmodul und lässt eine Seite JSX
importieren und schreiben; **MDC** ist die Block- und Inline-Komponentensyntax,
die Content ohnehin mitbringt und parst.

Die Seiten werden auch von etwas anderem als einem Browser gelesen. Das Theme
veröffentlicht die Markdown-Quelle jeder Seite für Modelle, ein Modell bekommt
also genau die Syntax, in der die Seiten geschrieben sind.

## Entscheidung

Komponenten in Markdown sind **MDC**. Die aus einer Seite aufrufbaren
Komponenten liegen in einem eigenen Content-Verzeichnis, in dem die gleichnamige
Datei eines Konsumenten die der Ebene ersetzt.

## Konsequenzen

Es muss nichts installiert und nichts konfiguriert werden, damit eine Seite eine
Komponente aufruft, und eine Seite bleibt eine Markdown-Datei, statt ein Modul
zu werden.

Ein MDC-Block übersteht es, einem Modell als Text übergeben zu werden: Er liest
sich als Komponentenaufruf mit benannten Argumenten. Kompiliertes JSX täte das
nicht.

Die Syntax ist Contents, also sind auch ihre Fähigkeiten und ihre Grenzen
Contents. Alles, was eine Seite will und MDC nicht ausdrücken kann, muss als
Komponente gelöst werden statt als Ausdruck in der Seite — eine Einschränkung
für Autoren und, für eine Dokumentationsseite, eine erwünschte.

Die Komponentennamen im Content-Verzeichnis gehören zur öffentlichen Oberfläche,
denn eine Seite, die gegen einen von ihnen geschrieben ist, ist die Datei eines
Konsumenten.

## Erwogene Alternativen

**MDX.** Ausdrucksstärker, und jedes Stück dieser Ausdrucksstärke ist JavaScript
in einer Dokumentationsseite. Es bräuchte zudem ein Modul und einen Build-Pfad,
den Content nicht hat, um am Ende Seiten zu haben, die einem Modell schlechter
zu übergeben sind.
