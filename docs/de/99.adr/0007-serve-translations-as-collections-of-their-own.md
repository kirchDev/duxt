---
title: Übersetzungen als eigene Collections ausliefern
description: Einer Quelle eine Locale-Dimension hinzufügen statt dem Content-Pfad ein Locale-Segment.
status: accepted
date: 2026-09-06
---

## Kontext

Die Ebene übersetzte ihre Oberfläche in sieben Locales und lieferte allen
denselben Satz Seiten aus: `useDuxtPath()` entfernte das Locale-Segment vor
jedem Content-Lookup, `/de-DE/guides/deploying` und `/guides/deploying` lösten
also auf dieselbe Datei auf. Content v3 kennt keine Locale — eine Collection ist
ein Baum —, übersetzte Seiten brauchten also eine Entscheidung und keine
Einstellung.

Was die vergleichbaren Generatoren tun, wurde nachgelesen statt angenommen.
Starlight, VitePress, Docusaurus und MkDocs legen Übersetzungen allesamt in
einen Ordner je Sprache; nur Starlight hat einen dokumentierten Rückfall für
eine Seite, die einer Sprache fehlt. Ab einer gewissen Größe verlässt die
Übersetzung das Werkzeug ganz: React betreibt `de.react.dev` als eigenes
Repository, Vue eine ganze `vuejs-translations`-Organisation, weil Übersetzer
nach eigenem Zeitplan und eigenem Review arbeiten. OpenCode baute einen Agenten,
der die Doku in CI übersetzte, ließ ihn laufen und schaltete ihn ab; siebzehn
Sprachen stehen seither still.

Die Kosten wurden gemessen, bevor die Form gewählt wurde: Builds über 1 … 200
Collections skalieren linear mit rund 2,2 s und 0,63 MB Datenbank je Collection,
ohne Knick. Die Matrix hat keine Decke, die dem Entwurf die Hand führen würde.

## Entscheidung

Eine Quelle bekommt eine `locales`-Liste, und ein Ref ebenso, aufgelöst wie
`status` es bereits wird (`ref.locales ?? source.locales`). Eine Zeichenkette
ist ein Ordner innerhalb des `path` der Quelle; ein Objekt verschiebt diese
Sprache in einen eigenen Ordner, ein eigenes Repository oder einen eigenen Ref.

**Die Standard-Locale ist der Baum in `path` selbst, ohne Ordner**, das
Hinzufügen des Schlüssels verschiebt also keine URL, die eine Seite bereits
ausliefert.

**Die Locale gehört nicht in den Content-Pfad.** Sie gehört i18ns Routing, das
sie dem Pfad ohnehin voranstellt. Original und Übersetzung liegen deshalb unter
identischen Content-Pfaden in getrennten Collections.

Eine Seite, die einer Sprache fehlt, fällt entlang einer Kette zurück — die
Locale, ihre Basissprache, eine Geschwisterregion, `fallbackLocale` aus vue-i18n,
das unübersetzte Original — und dem Leser wird in einem Banner gesagt, welche
Sprache er zu sehen bekommt.

## Konsequenzen

Jeder Pfadvergleich im Theme bleibt unberührt: Navigation, Weiterleitungen, der
Breadcrumb, die Bewertung der nächsten Seite im 404 und der Sprachumschalter
arbeiten allesamt weiter auf einem Pfad, der nie eine Locale trug. Der Rückfall
ist eine weitere Abfrage auf denselben Pfad statt einer Weiterleitung oder eines
zweiten Auflösungsschemas.

`useDuxtNavigation` und die Suche folgen `useDuxtCollection`, beide wurden also
locale-bewusst, ohne geändert zu werden.

Eine Seite, die nichts setzt, bekommt genau das, was sie hatte: eine Collection
namens `docs`, einen Eintrag im Manifest, eine Abfrage je Seite.

Zwei Konfigurationen können nun so auseinandergehen, dass eine leere Seite dabei
herauskommt statt eines Fehlers — `content.config.ts` löst die Standard-Locale
ohne Zugriff auf die Nuxt-Konfiguration auf. Das duxt-Modul prüft deshalb
`sourceOptions.defaultLocale` gegen `i18n.defaultLocale` und lässt den Build
scheitern, wenn sie abweichen, statt das eine in das andere zu injizieren und
Content die andere Antwort ausrechnen zu lassen.

Übersetzungen vervielfachen Collections, und der Build zahlt für jede linear.
Die Zahl gehört in die Dokumentation, denn über die Matrix entscheidet ein
Konsument.

Partials werden nicht übersetzt. `_partials/` ist eine Collection, die sich alle
Quellen teilen, und die eigenen Partials eines Sprachordners werden
ausgeschlossen, statt namentlich mit denen des Originals zu kollidieren.

## Erwogene Alternativen

**Ein Locale-Segment im Content-Präfix.** Symmetrisch zu `repo` und `version`,
und es hätte jeden Pfadvergleich im Theme gezwungen, Locales zu lernen — für
eine URL, der i18n ohnehin ein Präfix voranstellt und die dann zweimal
geschrieben stünde.

**Ein Dateisuffix — `installation.de-DE.md` neben dem Original.** Keine
Vervielfachung von Collections, und es scheitert an dem Fall, den die großen
Projekte tatsächlich haben: Es zwingt die Übersetzung in dasselbe Repository und
denselben Ref wie das Original.

**Ein 404 für eine fehlende Übersetzung.** Was VitePress durch Auslassung tut.
Es bestraft den Leser für eine Lücke, die der Schreibende hinterlassen hat, und
es verbirgt vor allen anderen, dass die Übersetzung unvollständig ist.
