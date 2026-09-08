---
title: Komponenten
description: Die eigenen Komponenten der Ebene, je eine Seite — wofür jede da ist, und was sie nimmt.
icon: lucide:component
---

Jede Komponente hier ist **überschattbar**: Eine Datei gleichen Namens in deinem
Projekt ersetzt die der Ebene, ohne Konfiguration. Ein hier dokumentierter Name
ist Teil der öffentlichen Oberfläche, er wird also nicht ohne ein Major-Release
umbenannt.

Die Seiten sind danach gruppiert, was eine Komponente tut: die zwei, die eine
Seite rahmen, die sechs, die durch ihren Baum navigieren, die Bedienelemente,
die ein Leser bedient, und die Komponenten, die zur Seite selbst gehören.

::page-cards
::

::callout{type="tip" title="Ersetze so wenig wie möglich"}
Bevor du eine Komponente überschattest, prüfe, ob ein Konfigurationsschlüssel,
ein Slot oder ein CSS-Token schon tut, was du brauchst — siehe
[Das Theme überschreiben](/guides/override-the-theme). Eine ersetzte Datei
erhält die Korrekturen der Ebene nicht mehr.
::
