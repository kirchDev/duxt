---
title: Danksagungen
description: Worauf duxt aufbaut, und wem es nachempfunden ist.
icon: lucide:heart
---

duxt ist eine dünne Ebene über der Arbeit anderer Leute. Fast nichts davon ist
eigene Erfindung — das Beziehen der Quellen, das Parsen, die Komponenten und das
Styling kommen alle aus Projekten, die diese Probleme zuerst gelöst haben, und
die ehrliche Beschreibung dieses Repositories ist der Kleber dazwischen plus eine
Handvoll Meinungen.

## Aufgebaut auf

| Projekt                                             | Was es hier tut                                                        |
| :-------------------------------------------------- | :--------------------------------------------------------------------- |
| [Vue](https://vuejs.org)                             | Das Komponentenmodell, in dem hier alles geschrieben ist                |
| [Nuxt](https://nuxt.com)                             | Das Framework, und der Ebenen-Mechanismus, auf dem die ganze Idee ruht  |
| [Nuxt Content](https://content.nuxt.com)             | Beziehen, Parsen, Abfragen — inklusive der git-nativen Repositories     |
| [shadcn-vue](https://www.shadcn-vue.com)             | Die Komponentenbasis, in die Ebene kopiert statt importiert             |
| [reka-ui](https://reka-ui.com)                       | Die Primitive darunter: Fokus, roving tabindex, ARIA                    |
| [Tailwind CSS](https://tailwindcss.com)              | Das Styling-System und die Token-Ebene                                  |
| [Shiki](https://shiki.style)                         | Syntax-Hervorhebung, zur Build-Zeit                                     |
| [Lucide](https://lucide.dev)                         | Der Icon-Satz                                                           |
| [MDC](https://content.nuxt.com/docs/files/markdown)  | Aus Markdown aufrufbare Komponenten                                     |

Die Version von jedem steht in `package.json`, wo eine Zahl hingehört — eine
zweite Kopie in Prosa ist eine, die stillschweigend veraltet.

## Nachempfunden

Ideen, die duxt aus Projekten übernommen hat, auf denen es nicht aufbaut.
Worauf es *aufbaut*, steht in der Tabelle oben — nichts wird zweimal genannt.

- [**shadcn/ui**](https://ui.shadcn.com) — die ursprüngliche Idee: Komponenten,
  die dir als Dateien gehören, statt sie als Abhängigkeit zu importieren. Jede
  Komponente in dieser Ebene ist deswegen hier.
- [**shadcn-docs-nuxt**](https://shadcn-docs-nuxt.vercel.app) — der nächste
  Nachbar, und der Beweis, dass eine Dokumentationsvorlage auf Nuxt Content und
  shadcn-vue sich lohnt.
- [**Docus**](https://docus.dev) — die ursprüngliche Ergonomie „eine Ebene
  erweitern, eine Doku-Seite bekommen“ im Nuxt-Ökosystem.
- [**Nuxt UI**](https://ui.nuxt.com) — für das maschinenlesbare Ende:
  `llms.txt` und ein Dokumentations-Endpunkt, den ein Agent aufrufen kann,
  behandelt als Build-Ausgabe statt als Zusatz.
- [**VitePress**](https://vitepress.dev) und
  [**Starlight**](https://starlight.astro.build) — für das, was ein
  Dokumentations-Theme einem Leser standardmäßig schuldet: einen
  Versionsumschalter, der die Navigation überlebt, ein Inhaltsverzeichnis, das
  mitläuft, eine Suche, die ohne Konfiguration da ist.

::callout{type="tip" title="Worin duxt sich unterscheidet"}
Jedes Projekt oben dokumentiert ein Repository in einer Version. duxts eigener
Daseinsgrund fängt da an, wo das aufhört: mehrere Repositories, mehrere
Versionen von jedem, und eine `sources`-Liste, die die Collections für alle
erzeugt — siehe [Quellen](/concepts/sources).
::

## Hier nicht genannt

Zwei Dinge fehlen mit Absicht. Die eigenen Abhängigkeiten der Ebene stehen in
`package.json` und brauchen keine zweite, handgepflegte Kopie; und wer eine
bestimmte Seite geschrieben hat, wird auf dieser Seite genannt, aus der
git-Historie dahinter, statt in einer Liste hier, die beim nächsten Commit
veralten würde.
