---
title: Content-Bundles zur Laufzeit laden
description: Den reinen Neubau als Standard für ausdrücklich aktivierte Node- und SQLite-Deployments eingrenzen, gestützt auf den Vergleich eines Content-Packs mit einem vollständigen Build.
status: accepted
date: 2026-11-04
---

## Kontext

Ein Wiki kann sein Markdown häufiger ändern als seinen Anwendungscode. Ein neues
Image für jede Änderung bindet Inhalte an die Release-Pipeline; ein Pod ohne
Netzwerkausgang kann die Quellen nicht selbst abrufen.
[ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime)
entschied sich für unveränderliche Deployments, einen sinnvollen Standard für
statische Sites und Workers.

Für die Ausnahme musste nachgewiesen werden, dass Inhalte ohne Kompilierung der
Anwendung gepackt werden können. Der Spike vom 2026-11-04 nutzte `apps/www` bei
`725534546886f06220f62a99525070ee63978a50`, Node 26.11.1, Nuxt 4.6.2 und
Content 3.16.2: 96 Collections, 9.603 Dateien und 95 öffentliche Collection-Dumps.

Beide Prozesse liefen aus `apps/www` auf derselben Maschine mit acht CPUs,
denselben Quellen und installierten Abhängigkeiten. Feste öffentliche Git-Spiegel
lieferten die entfernten Quellen über isoliertes Loopback-HTTPS; externer
Netzwerkzugriff war ausgeschaltet. Beide starteten ohne Content-Parse-Datenbank
oder frühere Templates und parsten alle 9.603 Dateien. Runner-Einrichtung und
Kopieren der Eingaben lagen außerhalb der Messung. Beide endeten mit Exitcode `0`.

| Messung | Nur Content packen | Vollständiger `nuxt build` |
| :--- | ---: | ---: |
| Laufzeit | 110.36 s | 278.54 s |
| Anteil am vollständigen Build | 39.62% | 100% |
| Collection-Dumps | 95 | 95 |

Alle 95 komprimierten Collection-Dumps und die Literale von `checksums` und `checksumsStructure` waren byte-identisch. Auch das gesamte `database.compressed.mjs`, `manifest.ts` und `sql_dump.txt` stimmte bytegenau überein; die Manifest-Tabellen enthielten jeweils 96 Einträge.

| File | Bytes | SHA-256 (both runs) |
| :--- | ----: | :----------------- |
| `database.compressed.mjs` | 18,747,182 | `e708db643cc47bc0cd742e910124f5cdd63586e9d06fd4c6301a35d871a2bb1f` |
| `manifest.ts` | 104,380 | `43bd5c30c30e426a117053d9256684aa992c52a9b72493c4af2b95ee1ea8df65` |
| `sql_dump.txt` | 76,747,454 | `eba31689710dc03ce165dfeb9770c666c7f561083336a7fc1ba85828c334fb00` |


Die reine Content-Sequenz lautete:

```js
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { loadNuxt, buildNuxt } from 'nuxt/kit';

const buildDir = await mkdtemp(join(process.cwd(), '.nuxt-pack-'));
const nuxt = await loadNuxt({
  cwd: process.cwd(),
  dev: false,
  overrides: { buildDir }
});
try {
  nuxt.options._prepare = true;
  await buildNuxt(nuxt);
  // Save buildDir/content before disposing the temporary directory.
} finally {
  await nuxt.close();
}
```

Die Initialisierung der Produktionsmodule und das Parsen waren **abgeschlossen,
bevor** `_prepare` gesetzt wurde. Früheres Setzen würde das Parsen überspringen;
ein wiederverwendetes Build-Verzeichnis könnte alte Templates zurückgeben.
Templates wurden ohne Vite- oder Nitro-Bündelung erzeugt. Der Vergleich führte
`build` über die installierte Nuxt-CLI aus `apps/www` ohne Konfigurations-Overrides
aus. Der Spike ergänzte weder einen Produktions-Packer noch einen Runtime-Loader.

`cd apps/www && node node_modules/nuxt/bin/nuxt.mjs build`

## Entscheidung

Content-Bundles werden als ausdrücklich aktivierte Option für Node-Deployments
mit SQLite zugelassen. Das grenzt ADR-0006 nur für dieses Deployment ein;
Neubauten bleiben der Standard und der Weg für Workers und statische Ausgabe.
Der Spike erfüllte beide vereinbarten Kriterien: byte-identische Dumps und
Prüfsummen sowie höchstens die halbe Build-Laufzeit.

Ein Bundle darf Inhalte, Weiterleitungen und Dokumentationsmedien ändern.
Schemaänderungen, neue Quellen oder Versionen und neuer MDC-Komponentencode
brauchen weiterhin ein Image. Kompatibilität und Hashes werden geprüft, bevor
alle Collections in einer SQLite-Transaktion importiert und passende
Content-Prüfsummen veröffentlicht werden. Eine Ablehnung lässt die aktiven
Inhalte bestehen.

Der Transport gehört dem Betreiber: ein Verzeichnis mit atomar ersetztem
`current`-Zeiger. Die Ebene braucht weder Storage-Client noch Zugangsdaten oder
Netzwerkausgang. Der Packer stammt aus dem Commit der Anwendung, mit einem
getesteten zweiten Docker-Target und einer vor Veröffentlichung geprüften
erwarteten Kompatibilitätsprüfsumme. Vorhandene MDC-Komponenten sind im
Bundle-Modus global; Inhalte dürfen eine Teilmenge davon nutzen. Replikate
wechseln unabhängig; eine Abweichung bis zum Poll-Intervall plus Importdauer ist
akzeptiert.

## Konsequenzen

Inhalts- und Anwendungs-Releases werden in diesem Rahmen unabhängig, zum Preis
von Kompatibilitätsprüfung und atomarer Aktivierung. Content-Dumpformat,
Dump-Route und veränderlicher Prüfsummenexport brauchen Vertragstests. Der kalte
Pack verbrachte weiterhin die meiste Zeit mit Parsen; die Messung belegt den
Gewinn für diesen Baum, nicht für jeden Nutzer oder Cache-Zustand. Replikatversatz
und ein Browser, der bis zum vollständigen Neuladen seinen Inhalt behält, sind
akzeptierte Kosten.

## Erwogene Alternativen

**Ein Image für jeden Content-Push neu bauen.** Bleibt der Standard; die gemessene
reine Content-Stufe rechtfertigte eine Ausnahme für das auslösende Wiki.

**ADR-0006 überall ersetzen.** Abgelehnt: statische Sites und Workers behalten
ihr unveränderliches Build-Modell.

**Content verzögert wiederherstellen lassen oder Storage aus der Ebene abrufen.**
Wiederherstellung pro Collection kann nicht alle Collections atomar wechseln.
Ein Storage-Client würde Zugangsdaten und Netzwerkausgang in die Anwendung
bringen, statt den Transport beim Betreiber zu lassen.
