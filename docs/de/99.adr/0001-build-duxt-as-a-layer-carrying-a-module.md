---
title: duxt als Ebene bauen, die ein Modul trägt
description: Das Theme als Nuxt-Ebene ausliefern, deren Wurzel das Paket ist, statt als Starter-Vorlage.
status: accepted
date: 2026-09-06
---

## Kontext

Ein Dokumentations-Theme lässt sich auf zwei Arten ausliefern. Eine
**Starter-Vorlage** wird in das Repository des Konsumenten kopiert, wo jede
Datei ihm zum Bearbeiten gehört und keine Verbesserung ihn je wieder erreicht,
außer als Diff, den jemand von Hand anwendet. Eine **Ebene** bleibt eine
Abhängigkeit: Der Konsument erweitert sie, überschreibt die Dateien, denen er
widerspricht, und nimmt den Rest der Verbesserungen mit einem Versionssprung mit.

Ein Teil dessen, was das Theme tun muss, lässt sich von einer Ebene nicht als
Dateien ausdrücken. Collections zu erzeugen, eine Quellenliste in URL-Präfixe
aufzulösen, Frontmatter in Routenregeln zu übersetzen und das Ergebnis zu prüfen
ist Arbeit zur Build-Zeit, und Arbeit zur Build-Zeit ist in Nuxt ein Modul.

## Entscheidung

Wir liefern duxt als **Nuxt-Ebene aus, die ihre eigenen Module trägt**,
konsumiert mit einem einzigen `extends`-Eintrag. Die Wurzel des Repositories
*ist* die Ebene: Die Nuxt-Konfiguration, die Content-Konfiguration und `app/`
liegen in der Wurzel, und das Paketmanifest zeigt auf sie, sodass
`extends: ['@kirchdev/duxt']` ohne Build-Schritt auflöst. Die konsumierende
Seite liegt daneben im selben Repository und ist das Entwicklungsziel.

## Konsequenzen

Ein Konsument erbt Theme, Seiten, Komponenten, Konfigurationsstandards und
Collections und überschreibt jedes davon, indem er eine Datei gleichen Namens
anlegt. Ein Upgrade ist ein Versionssprung.

Nichts Ebenen-Relatives löst so auf, wie es sich liest. Ein in der Ebene
geschriebener Pfad wird aus dem Verzeichnis des Konsumenten gelesen, sofern er
nicht gegen den eigenen Ort der Ebene aufgelöst wurde, und der `@`-Alias gehört
dem, der die Ebene erweitert, nicht der Ebene — die eigenen Importe der Ebene
brauchen deshalb einen eigenen Alias. Das hat echte Fehler gekostet, und es ist
der Preis dieser Anordnung, kein Versehen.

Überschreibbare Namen werden zu einer öffentlichen Oberfläche. Eine Komponente,
eine Seite oder ein Konfigurationsschlüssel, den ein Konsument überdecken kann,
ist ein Name, von dem er abhängt — einen davon umzubenennen ist deshalb ein
brechendes Release, und festgezurrt wird das durch die dokumentierte Oberfläche.

Die Entwicklungsseite und eine Starter-Vorlage sind getrennte Artefakte. Die
Seite neben der Ebene will Grenzfälle, hässliches Frontmatter, mehrere Quellen
und einen Tag, aus dem sie liest; ein Fremder, der einen Starter klont, will das
Gegenteil. Die beiden zu vermengen würde eines von ihnen schlecht machen.

## Erwogene Alternativen

**Eine Starter-Vorlage.** Völlige Freiheit für den Konsumenten, kein
Upgrade-Pfad für irgendwen — der Grund, warum die Ebene gewonnen hat.

**Ein Modul ohne Ebene.** Ein Modul kann Komponenten und Routen registrieren,
aber die Substanz des Themes sind Dateien, die ein Konsument überdecken können
muss, und diese durch ein Modul auszuliefern heißt, sie zu injizieren, statt
Nuxts eigene Ebenen-Auflösung das tun zu lassen.
