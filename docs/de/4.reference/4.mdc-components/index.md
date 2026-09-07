---
title: MDC-Komponenten
description: Die Blöcke, die eine Markdown-Seite aufrufen kann, je eine Seite, mit ihren Props.
icon: lucide:blocks
---

Alles in `app/components/content/` ist aus Markdown mit MDC-Syntax aufrufbar —
kein Modul, kein MDX. Diese hier liefert die Ebene mit; deine eigene Datei
gleichen Namens ersetzt eine davon.

Jede Seite hier ist gleich gebaut: was der Block ist, ein Beispiel, gerendert
so, wie diese Seite es rendert, daneben das Markdown, das es erzeugt hat, dann
seine Props, Slots und Events.

::page-cards
::

::callout{type="tip" title="Verschachteln kostet einen Doppelpunkt mehr"}
Ein Block in einem Block öffnet mit einem Doppelpunkt mehr als sein Elternteil —
`:::accordion` um `::accordion-item`. Der schließende Fence entspricht dem
öffnenden.
::
