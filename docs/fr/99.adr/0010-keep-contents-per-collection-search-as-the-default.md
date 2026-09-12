---
title: Conserver la recherche par collection de Content comme défaut
description: Un index unique sur toutes les sources a été mesuré face à la recherche à un index par collection de Content et n'est pas le défaut de la couche ; le hook de build en fait plutôt une couche fournisseur.
status: accepted
date: 2026-09-12
---

## Contexte

La recherche, c'est un index par collection. `useDuxtSearch()` appelle le
`useSearchCollection()` de Content une fois par source active, ce qui télécharge
le `sql_dump.txt` de cette collection et construit un index FTS5 dans le
navigateur au-dessus de SQLite en WASM. Trois reproches découlent de cette seule
forme :

- **La charge grandit avec le modèle.** Un dump par collection active, et les
  collections se multiplient en sources × versions × langues. Le multi-source
  est la proposition de duxt, et la recherche la paie linéairement.
- **Les sources ne peuvent pas être classées les unes contre les autres.**
  Chaque base classe à l'intérieur d'elle-même, d'où `interleave()` qui alterne
  les listes par source : la position est la seule chose comparable qui existe.
- **Aucune tolérance aux fautes de frappe sur le chemin principal.** FTS5 fait
  correspondre des termes et des préfixes, jamais des approximations, si bien
  que `useFuzzySearch()` porte un second index sur les mêmes sections et se
  charge à chaque échec.

[Pagefind](https://pagefind.app/) répond en principe aux trois : un index
découpé dont le navigateur ne prend qu'une tranche, une liste classée unique
avec des filtres et — en tant que défaut de Starlight — la réponse du projet
comparable le plus proche. Son API Node prend des enregistrements plutôt que du
HTML construit, donc `addCustomRecord` consomme directement
`duxt:search:records`, et la couche n'a jamais à imposer une stratégie de rendu
aux sites qui l'étendent.

Cela a été mesuré plutôt que débattu, sur le contenu réel de `www/` : 33
collections, 2 918 pages, **11 937 enregistrements** en cinq langues et quatre
versions. `scripts/search-index-bench.ts` a calculé les chiffres ci-dessous, et
`tests/search-index-bench.test.ts` fixe la règle avec laquelle ils ont été lus.

### Ce que la mesure a trouvé

**Charge — Pagefind gagne, nettement.** La première requête d'une lectrice
anglophone coûte aujourd'hui **1 448 Ko** (1 108 Ko de SQLite en WASM et son
worker, 340 Ko de dumps sur les sept collections concernées) et chaque requête
suivante est gratuite. La même requête contre un index Pagefind coûte **150
Ko**, et chaque suivante **13 Ko**. Même en retirant entièrement le moteur de
base de données — Content le charge à la demande, et un `queryCollection` côté
client lors d'un changement de route peut l'invoquer aussi — cela fait 340 Ko
contre 150 Ko, et les 340 Ko sont la moitié qui grandit avec chaque source
ajoutée, quand les 150 Ko ne bougent pas.

**Classement — Pagefind gagne, par langue.** Un index sur toutes les sources a
renvoyé une liste classée unique, et les filtres sont sortis du contrat
d'enregistrement sans la moindre adaptation : `source` contenait `/`, `/demo`,
`/demo/api`, `/demo/changelog`, `/demo/changelog-flat`, `/demo/collection`,
`/releases`, `/tf`, et `version` contenait `main`, `v0.1.0`, `v0.2.0`, `v0.2.6`,
`v0.3.4`, `v1.x`, `v2.x`, `v3.x`. `interleave()` disparaîtrait — pour les
sources. Pas entièrement : Pagefind indexe chaque langue séparément et en
sélectionne une à l'exécution, sa documentation ne décrit aucun moyen d'en
chercher deux ensemble, et `mergeIndex` contre le même chemin de base est
ignoré ; le repli linguistique dont dépend une page non traduite réclame donc
toujours une seconde instance et deux espaces de score incomparables.

**Tolérance aux fautes — Pagefind perd, et emporte le repli avec lui.** Pagefind
lemmatise par langue et n'a pas de correspondance floue. `collecton` a été
rattrapé par préfixe jusqu'à 360 résultats ; `verison` — une inversion — a
renvoyé **trois pages sans rapport**. C'est pire que le comportement FTS5 qu'il
remplace, car ce n'est pas un résultat vide : `useDuxtSearch()` se rabat sur
Fuse précisément quand la passe exacte ne renvoie rien, donc trois mauvaises
réponses sont trois raisons pour que le repli ne se déclenche jamais. Fuse
devrait rester, et le déclencheur qui l'appelle devrait être réécrit autour d'un
fournisseur qui répond avec assurance et à côté.

**Sortie — un fichier par section indexée.** L'index a émis **12 066 fichiers**
et 6,80 Mio pour 11 937 enregistrements, un fragment par section, contre les
1 414 qu'écrit aujourd'hui un build Cloudflare de `www/`. Cloudflare Workers
plafonne une version à 20 000 fichiers statiques sur l'offre gratuite. Un site
de documentation dont l'index grandit d'un fichier par section, par source, par
version et par langue atteint ce plafond avec quatre-vingt-dix pages de matière
première, et qui ajouterait une langue le découvrirait à un déploiement en
échec.

**L'empaquetage n'est pas un obstacle.** `pagefind@1.5.2` est sous MIT, livre
sept binaires précompilés en `optionalDependencies` couvrant toute plateforme
promise par `engines`, et n'exige ni téléchargement en postinstall ni chaîne
node-gyp — la barre que `better-sqlite3` n'avait pas franchie. Indexer 11 937
enregistrements a pris 6,8 secondes et, à 10,0, l'index entier tenait en
mémoire. Rien là-dedans n'entre en conflit avec
[ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime) :
tout se passe pendant le build.

## Décision

**La recherche par collection de Content reste le défaut de la couche.**
Pagefind n'est pas adopté comme ce que duxt livre.

Des trois problèmes, un index unique en résout un entièrement, un autre
seulement à l'intérieur d'une langue, et il aggrave le troisième — tout en
ajoutant une loi de croissance du nombre de fichiers qui se heurte à la
plateforme où le site de la couche se déploie lui-même. On change un défaut pour
un gain net, pas pour un échange, et deux sur trois est une autre forme, pas une
meilleure.

**Pagefind reste disponible, en couche et non en défaut.**
`duxt:search:records` a été ouvert exactement pour cela, et la mesure a confirmé
que le contrat n'a besoin d'aucune adaptation : `url`, `title`, `content`,
`source`, `version` et `locale` se projettent champ par champ sur
`addCustomRecord`, et les filtres qui en sortent sont les identités de source et
les libellés de version que duxt calcule déjà. Qui veut un index unique écrit
`extends: ['@kirchdev/duxt', 'duxt-pagefind']` et paie le nombre de fichiers en
connaissance de cause.

**La règle survit au candidat.** `searchIndexVerdict`, dans
`scripts/search-index-bench.ts`, énonce les six conditions qu'un remplaçant doit
remplir — charge nettement moindre, sources classées ensemble, tolérance aux
fautes préservée, uniquement au build, binaires couvrant `engines`, sortie sous
le plafond de fichiers du déploiement — et renvoie celles qu'un candidat manque.
Le « non » de cet ADR est une valeur que cette fonction renvoie.

## Conséquences

Les lecteurs gardent une recherche qui télécharge davantage puis répond hors
ligne, et gardent la tolérance aux fautes qu'apporte Fuse. Le reproche sur la
charge reste non résolu : qui rassemble beaucoup de sources paie toujours par
collection active, et c'est la raison la plus forte d'y revenir.

`interleave()` reste, ainsi que le commentaire qui explique pourquoi il n'y a
pas de scores comparables avec quoi classer.

Y revenir coûte peu et les termes sont écrits. Que Pagefind acquière la
correspondance floue, ou émette ses fragments en moins de fichiers, et deux
conditions basculent ; un candidat indexant toutes les langues dans un seul
espace de recherche en ferait basculer une troisième. Relancez le banc d'essai
plutôt que de replaider le dossier — et consignez un nouvel ADR qui remplace
celui-ci, car ces enregistrements ne font que s'ajouter.

Rien de tout cela ne contraint un service externe. Meilisearch et Typesense
répondent aux trois reproches et n'ont jamais été candidats à un *défaut*, parce
qu'un défaut ne peut pas exiger d'un consommateur qu'il opère ou achète un
service ; ils consomment le même hook.
