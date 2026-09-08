---
title: Die URL-Präfixe zur Build-Zeit entscheiden
description: Ob ein Repository- oder Versionssegment erscheint, entscheidet die Quellenliste vor der ersten Anfrage, nie pro Anfrage.
status: accepted
date: 2026-09-06
---

## Kontext

Eine Seite, die aus mehreren Quellen gebaut ist, muss ein Repository-Segment und
ein Versionssegment in ihren URLs ausliefern, und eine Seite, die aus einem
Ordner gebaut ist, darf das nicht — niemand will
`/my-project/main/guides/deploying` für ein Projekt mit einem einzelnen
unversionierten Doku-Ordner.

Jedes Segment pro Anfrage optional zu machen funktioniert nicht. Wären beide
optional, könnte das erste Segment von `/guides/…` ein Ordner, ein Repository
oder eine Version sein, und erst das Nachschlagen aller drei würde es klären.
Diese Mehrdeutigkeit ist keine Unbequemlichkeit beim Routing; sie macht die
Bedeutung einer URL davon abhängig, was zufällig existiert.

## Entscheidung

Jedes Präfix wird **für die ganze Seite, zur Build-Zeit, aus der Quellenliste**
eingeschaltet: ein Repository-Segment, sobald mehr als ein Repository
veröffentlicht wird oder ein Schalter es erzwingt, ein Versionssegment, sobald
eine Quelle mehr als einen Ref veröffentlicht oder ein Schalter es erzwingt. Ein
Ref je Repository wird ganz ohne Versionssegment ausgeliefert.

## Konsequenzen

Die Form jeder URL steht vor der ersten Anfrage fest, der Router muss also nie
raten, und ein in einer Seite geschriebener Link kann von einer Prüfung im Build
aufgelöst werden, statt ihn auszuprobieren.

Ein einzelner unversionierter Ordner liefert Pfade aus, die nichts darüber
verraten, dass Repositories oder Versionen überhaupt existieren, und genau das
macht den einfachsten Fall kostenlos.

Eine Seite von einer Quelle auf zwei umzustellen ändert jede URL, die sie
ausliefert. Das ist eine Migration, und überlebbar macht sie die
Weiterleitungs-Maschinerie.

Eine Kollision bleibt und lässt sich nicht wegentwerfen: ein Doku-Ordner, der
wie ein Repository- oder Versionssegment heißt, wobei das Präfix gewinnt und der
Ordner unerreichbar ist. Der Build weist das mit einer Meldung zurück, statt es
stillschweigend in eine Richtung aufzulösen.

Weil das eigene Präfix einer Seite nur dem Build bekannt ist, werden Links in
Seiten als nackte Dokumentationspfade geschrieben und beim Rendern gegen die
Quelle der Seite aufgelöst. Eine Seite, die ihr eigenes Präfix fest verdrahtet,
ist auf genau einer Site richtig.
