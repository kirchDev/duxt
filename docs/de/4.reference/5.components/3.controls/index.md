---
title: Bedienelemente
description: Was ein Leser bedient — die Suche, die Umschalter, die Tastenkürzel-Übersicht und zwei Anzeigen.
icon: lucide:sliders-horizontal
---

Jedes davon ist ein Bedienelement, das der Leser bedient, oder ein Zustand, den
er liest, und nicht ein Teil der Struktur der Seite. Keines nimmt eine Prop: Sie
lesen [`useDuxtConfig()`](/reference/composables/config-and-content/use-duxt-config)
und rendern nichts, wenn die Konfiguration ihnen nichts zu bieten gibt.

Dieser letzte Teil ist das Muster, das man kennen sollte, bevor man eines
ersetzt. Ein Umschalter mit einer einzigen Wahl ist kein Umschalter, also
zeichnet `DuxtVersion` ein Abzeichen und `DuxtLocale` gar nichts — eine
einsprachige Seite erfährt nie, dass duxt sieben Sprachen spricht.

::page-cards
::
