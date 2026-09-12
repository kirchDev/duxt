---
title: Die Suche pro Collection von Content als Standard behalten
description: Ein einziger Index über alle Quellen wurde gegen Contents Suche mit einem Index pro Collection gemessen und ist nicht der Standard der Ebene; der Build-Hook macht ihn stattdessen zu einer Provider-Ebene.
status: accepted
date: 2026-09-12
---

## Kontext

Die Suche ist ein Index pro Collection. `useDuxtSearch()` ruft Contents
`useSearchCollection()` einmal je aktiver Quelle auf, lädt damit deren
`sql_dump.txt` herunter und baut im Browser über WASM-SQLite einen
FTS5-Index. Aus dieser einen Form folgen drei Beschwerden:

- **Die Nutzlast wächst mit dem Modell.** Ein Dump je aktiver Collection, und
  Collections vervielfachen sich als Quellen × Versionen × Sprachen.
  Mehrquellenbetrieb ist duxts Versprechen, und die Suche bezahlt ihn linear.
- **Quellen lassen sich nicht gegeneinander bewerten.** Jede Datenbank
  bewertet in sich selbst, deshalb mischt `interleave()` die Listen je Quelle
  im Reihum-Verfahren — die Position ist das Einzige, was vergleichbar ist.
- **Keine Tippfehlertoleranz im Hauptpfad.** FTS5 trifft Terme und Präfixe,
  niemals Beinahetreffer, weshalb `useFuzzySearch()` einen zweiten Index über
  dieselben Abschnitte führt und bei jedem Fehlschlag lädt.

[Pagefind](https://pagefind.app/) beantwortet im Prinzip alle drei: ein
gestückelter Index, von dem ein Browser nur einen Ausschnitt holt, eine
gemeinsame Rangliste mit Filtern und — als Standard von Starlight — die Antwort
des nächstliegenden Vergleichsprojekts. Seine Node-API nimmt Records statt
gebautem HTML, also verarbeitet `addCustomRecord` direkt
`duxt:search:records`, und die Ebene muss den Seiten, die sie erweitern, nie
eine Rendering-Strategie vorschreiben.

Es wurde gemessen statt diskutiert, über den echten Inhalt von `www/`: 33
Collections, 2.918 Seiten, **11.937 Records** in fünf Sprachen und vier
Versionen. `scripts/search-index-bench.ts` hat die Zahlen unten berechnet, und
`tests/search-index-bench.test.ts` hält die Regel fest, nach der sie gelesen
wurden.

### Was die Messung ergab

**Nutzlast — Pagefind gewinnt deutlich.** Die erste Anfrage einer englischen
Leserin kostet heute **1.448 KB** (1.108 KB WASM-SQLite samt Worker, 340 KB
Dumps über die sieben Collections im Umfang), jede weitere ist gratis. Dieselbe
Anfrage gegen einen Pagefind-Index kostet **150 KB** und jede weitere **13 KB**.
Selbst wenn man die Datenbank-Engine ganz herausrechnet — Content lädt sie bei
Bedarf, und ein clientseitiges `queryCollection` beim Routenwechsel kann sie
ebenfalls herbeirufen — stehen 340 KB gegen 150 KB, und die 340 KB sind die
Hälfte, die mit jeder weiteren Quelle wächst, während die 150 KB es nicht tun.

**Rangfolge — Pagefind gewinnt, je Sprache.** Ein Index über alle Quellen
lieferte eine einzige Rangliste, und die Filter ergaben sich ohne Anpassung aus
dem Record-Vertrag: `source` enthielt `/`, `/demo`, `/demo/api`,
`/demo/changelog`, `/demo/changelog-flat`, `/demo/collection`, `/releases`,
`/tf`, und `version` enthielt `main`, `v0.1.0`, `v0.2.0`, `v0.2.6`, `v0.3.4`,
`v1.x`, `v2.x`, `v3.x`. `interleave()` würde entfallen — für die Quellen. Ganz
entfiele es nicht: Pagefind indiziert jede Sprache getrennt und wählt zur
Laufzeit eine aus, seine Dokumentation beschreibt keinen Weg, zwei gemeinsam zu
durchsuchen, und `mergeIndex` gegen denselben Basispfad wird übersprungen. Der
Sprach-Fallback, auf den eine unübersetzte Seite angewiesen ist, braucht also
weiterhin eine zweite Instanz und zwei unvergleichbare Bewertungsräume.

**Tippfehlertoleranz — Pagefind verliert und nimmt den Fallback mit.** Pagefind
stemmt je Sprache und hat keine unscharfe Suche. `collecton` wurde über das
Präfix zu 360 Treffern gerettet; `verison` — ein Dreher — lieferte **drei
unpassende Seiten**. Das ist schlechter als das ersetzte FTS5-Verhalten, denn
es ist kein leeres Ergebnis: `useDuxtSearch()` weicht genau dann auf Fuse aus,
wenn der exakte Durchgang nichts liefert, also sind drei falsche Antworten drei
Gründe, warum der Fallback nie auslöst. Fuse müsste bleiben, und der Auslöser
müsste um einen Provider herum neu geschrieben werden, der selbstbewusst falsch
antwortet.

**Ausgabe — eine Datei je indiziertem Abschnitt.** Der Index schrieb **12.066
Dateien** und 6,80 MiB für 11.937 Records, ein Fragment je Abschnitt, gegen die
1.414, die ein Cloudflare-Build von `www/` heute schreibt. Cloudflare Workers
begrenzt eine Version im kostenlosen Tarif auf 20.000 statische Dateien. Eine
Dokumentationsseite, deren Index je Abschnitt, Quelle, Version und Sprache um
eine Datei wächst, erreicht das bei neunzig Seiten Ausgangsmaterial, und wer
eine Sprache ergänzt, erführe es an einem fehlgeschlagenen Deploy.

**Die Paketierung ist kein Hindernis.** `pagefind@1.5.2` steht unter MIT,
liefert sieben vorgebaute Binaries als `optionalDependencies` für jede
Plattform, die `engines` zusagt, und braucht weder einen Postinstall-Download
noch eine node-gyp-Toolchain — die Hürde, an der `better-sqlite3` scheiterte.
Das Indizieren von 11.937 Records dauerte 6,8 Sekunden, nach 10,0 lag der ganze
Index im Speicher. Nichts daran widerspricht
[ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime):
alles geschieht während des Builds.

## Entscheidung

**Contents Suche pro Collection bleibt der Standard der Ebene.** Pagefind wird
nicht als das übernommen, was duxt ausliefert.

Von den drei Problemen löst ein einziger Index eines ganz, eines nur innerhalb
einer Sprache, und eines verschlimmert er — während er ein Wachstumsgesetz für
die Dateizahl mitbringt, das mit der Plattform kollidiert, auf die die eigene
Seite der Ebene deployt. Einen Standard ändert man für einen klaren Gewinn,
nicht für einen Tausch, und zwei von drei ist eine andere Form, keine bessere.

**Pagefind bleibt verfügbar — als Ebene, nicht als Standard.**
`duxt:search:records` wurde genau dafür geöffnet, und die Messung bestätigte,
dass der Vertrag keine Anpassung braucht: `url`, `title`, `content`, `source`,
`version` und `locale` bilden Feld für Feld auf `addCustomRecord` ab, und die
entstehenden Filter sind die Quellidentitäten und Versionsbezeichnungen, die
duxt ohnehin berechnet. Wer einen einzigen Index will, schreibt
`extends: ['@kirchdev/duxt', 'duxt-pagefind']` und bezahlt die Dateizahl
wissentlich.

**Die Regel überlebt den Kandidaten.** `searchIndexVerdict` in
`scripts/search-index-bench.ts` nennt die sechs Bedingungen, die ein Ersatz
erfüllen muss — spürbar kleinere Nutzlast, Quellen gemeinsam bewertet,
Tippfehlertoleranz erhalten, ausschließlich zur Bauzeit, Binaries für alles, was
`engines` zusagt, Ausgabe innerhalb der Dateigrenze des Deployments — und gibt
zurück, welche ein Kandidat verfehlt. Das „Nein“ dieses ADR ist ein Wert, den
diese Funktion liefert.

## Konsequenzen

Leser behalten eine Suche, die mehr herunterlädt und danach offline antwortet,
und behalten die Tippfehlertoleranz, die Fuse liefert. Die Beschwerde über die
Nutzlast bleibt ungelöst: wer viele Quellen einbindet, bezahlt weiterhin je
aktiver Collection, und das ist der stärkste Grund, die Sache erneut
aufzunehmen.

`interleave()` bleibt, und mit ihm der Kommentar, der erklärt, warum es keine
vergleichbaren Bewertungen zum Sortieren gibt.

Ein erneuter Anlauf ist billig, und die Bedingungen stehen geschrieben. Bekäme
Pagefind unscharfe Suche oder schriebe es Fragmente in weniger Dateien, kippten
zwei Bedingungen; ein Kandidat, der alle Sprachen in einen durchsuchbaren Raum
indiziert, kippte eine dritte. Lasst den Benchmark erneut laufen, statt den Fall
erneut zu verhandeln — und schreibt ein neues ADR, das dieses ablöst, denn diese
Aufzeichnungen werden nur angehängt.

Nichts hiervon schränkt einen externen Dienst ein. Meilisearch und Typesense
beantworten alle drei Beschwerden und waren nie Kandidaten für einen *Standard*,
weil ein Standard niemandem abverlangen darf, einen Dienst zu betreiben oder zu
kaufen; sie verarbeiten denselben Hook.
