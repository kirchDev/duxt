---
title: Den SEO-Unterbau aus dem Nuxt-SEO-Bündel nehmen
description: Die Ebene installiert @nuxtjs/seo und übergibt ihm die Head-Tags und strukturierten Daten, die sie bislang von Hand schrieb — behalten werden nur die Regeln, die von Versionen und Übersetzungen abhängen.
status: accepted
date: 2026-09-08
---

## Kontext

Die Ebene lieferte bereits drei Module aus Nuxt SEO aus — robots, sitemap und
OG-Image —, jedes einzeln gewählt, als der Bedarf auftauchte. Alles, was sie
nicht abdecken, war handgeschrieben: ein Canonical-Link, ein `og:`/`twitter:`-
Block pro Seite und ein `@graph` aus JSON-LD, das in `[...slug].vue` in einem
Template-String zusammengesetzt wurde.

Das funktionierte und war unsichtbar. Genau darin liegt das Problem: Nichts davon
war durch einen Test abgedeckt, weil SEO im gerenderten HTML lebt und nicht in
Logik — und die Tests dieses Repos decken bewusst nur reine Logik ab. Die
Startseite, also die Seite, die am ehesten geteilt wird, hatte überhaupt keine
Social Card, die Fehlerseite war indexierbar, und sieben Locales wurden ohne ein
einziges `og:locale` ausgeliefert. Jede dieser Lücken war ein Versäumnis, das
niemand sehen konnte.

Die handgeschriebene Hälfte war zugleich die, die wächst. Strukturierte Daten
sind eine Spezifikation mit großer Oberfläche und eigenen Validatoren; jeder von
Hand ergänzte Knoten ist ein Knoten, dessen Form man sich aus der Spezifikation
erlesen muss.

## Entscheidung

Die Ebene hängt von `@nuxtjs/seo` ab und lädt es als ein Modul, an der Stelle, an
der die drei benannten Module standen — vor `@nuxt/content`, weil die
Content-Integration der Sitemap das verlangt.

Das Bündel ist ein Alias, kein Wrapper: Seine eigene Dokumentation stellt fest,
es „enthält keine eigene Logik". Was es einbringt, sind die vier fehlenden Module
— `nuxt-schema-org` für den Graphen, `nuxt-seo-utils` für den automatischen
Canonical und die abgeleiteten Social-Tags, `nuxt-link-checker` sowie
`nuxt-site-config` als die eine Stelle, aus der `site.url` gelesen wird — dazu
das gemeinsame Devtools-Panel, das über die jeweils installierten berichtet.

Drei Vorgaben von `nuxt-seo-utils` werden abgeschaltet, jede aus einem Grund, den
die Ebene nicht wegkonstruieren kann: `canonicalLowercase`, weil ein
Locale-Präfix Groß- und Kleinschreibung unterscheidet und `/de-DE/` nicht
`/de-de/` ist; `fallbackTitle`, weil ein aus einem Slug erfundener Titel den
Build-Validator verdecken würde, der über eine Seite ohne Titel fehlschlägt; und
`mergeWithSiteConfig`, weil `app.vue` das Titel-Template besitzt.

Handgeschrieben bleibt, was die Module nicht wissen können: Der Canonical einer
versionierten Seite zeigt auf die aktuelle Version statt auf die gerade
gerenderte Seite, und `noindex` folgt daraus, dass eine Version alt ist oder eine
Seite in einer Sprache ausgeliefert wird, in die sie nicht übersetzt wurde.

Die Link-Prüfung berichtet, statt fehlzuschlagen. `modules/validate.ts` lässt
einen Build bereits über einen ins Leere zeigenden Link scheitern, und es ist
diejenige Prüfung, die Versionen und Sprach-Rückfälle versteht.

## Konsequenzen

Jeder Konsument der Ebene installiert sieben Module statt drei. Das ist der Preis
der Entscheidung, und ihn zahlen auch Sites, die keines der vier neuen nutzen.

Die Regeln, die bisher Behauptungen in einem Kommentar waren, sind jetzt
Zusicherungen in `scripts/check-seo.ts`: Das Skript liest die gebauten Seiten und
schlägt über einen zweiten Canonical fehl, über ein fehlendes `hreflang`, über
eine indexierbare Fehlerseite oder über einen Graphen, der nicht parst. Es läuft
in `check` neben `check:a11y`, aus demselben Grund — die Tags existieren nur im
gerenderten HTML.

Zwei dieser Regeln waren vorher überhaupt nicht prüfbar, weil sie erst
existieren, wenn die Site ihre eigene Herkunft kennt, und `www` bewusst keine
Domain nennt. Die Prüfung übergibt dem gebauten Server dafür seine eigene Adresse
über die Umgebungsvariablen, die die Module ohnehin lesen — statt einer Domain in
einer Konfiguration, die ein Konsument abschreiben würde.

Eine `Organization` zu veröffentlichen braucht eine Tatsache, die die Ebene nicht
erfinden darf, also wartet sie auf einen neuen Schlüssel `duxt.organization` und
bleibt abwesend, bis ein Konsument ihn füllt — dieselbe Haltung wie in ADR-0005.

## Erwogene Alternativen

**Die drei Module behalten und nur `nuxt-schema-org` ergänzen.** Die schmalste
Änderung, verworfen am Canonical: Die Versionsregel und der automatische Canonical
müssen ohnehin miteinander vereinbart werden, und ohne `nuxt-seo-utils` bedeutet
das, den handgeschriebenen `og:`/`twitter:`-Block zu behalten, der auf zwei
Seiten bereits vergessen worden war.

**Die strukturierten Daten von Hand schreiben und behalten.** Es funktionierte, es
hatte keine Abhängigkeit, und es wurde verworfen, weil der Graph ohnehin der Teil
war, der am ehesten falsch und am wenigsten bemerkt wird — und weil eine zweite
Seite mit einem zweiten Knoten eine zweite Kopie der Identität der Site in sich
hinein bedeutet hätte.

**Den Link-Checker den Build brechen lassen.** Verworfen, weil zwei Wächter über
einer Regel bedeuten, dass der laschere entscheidet, wann ein Build bricht. Die
Prüfung, die die Versionen und Sprach-Rückfälle dieser Ebene versteht, ist ihre
eigene.
