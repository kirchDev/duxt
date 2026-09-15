---
title: Héberger les couches fournisseurs dans un monorepo Turborepo
description: La couche passe dans packages/duxt et le site dans apps/www, chaque paquet publié se versionne et s'étiquette seul en <name>@vX.Y.Z, et la décision de dépôts dédiés consignée dans #74 et #75 est remplacée.
status: accepted
date: 2026-09-15
---

## Contexte

#74 et #75 ont chacune décidé que les fournisseurs de recherche officiels sont
publiés comme couches compagnons indépendantes **dans des dépôts dédiés** —
`@kirchdev/duxt-typesense`, `@kirchdev/duxt-meilisearch`. Aucun de ces dépôts
n’existe, et ici un nouveau dépôt open source n’est pas à une commande près : il
est provisionné via OpenTofu, puis porte toute la couche méta lui-même — stubs de
workflows, release-please, Dependabot, CodeQL, une licence, un README et une
configuration d’agents. C’est le prix permanent de deux adaptateurs minces
au-dessus d’un seul hook de build.

Le contrat que les deux consomment, `duxt:search:records`, vit dans ce dépôt.
Réparti sur trois, chaque changement deviendrait une valse des versions — monter
la couche, publier, élargir la plage de chaque fournisseur, publier — sans une
seule barrière qui exécute le hook face à un consommateur. Le site de
développement ne pouvait pas essayer un fournisseur sans dépendre d’une version
publiée.

Le dépôt était en outre taillé pour un seul paquet : sa racine **était** la
couche, et trente modules de build s’étalaient à côté de la configuration méta,
séparés d’elle par la seule liste `files`.

## Décision

**Un dépôt, un workspace pnpm piloté par Turborepo.**

- `packages/duxt` est `@kirchdev/duxt`. Ses modules de build quittent la racine
  plate pour des dossiers thématiques sous `build/` — `sources/`, `sections/`,
  `bruno/`, `openapi/`, `search/`, `content/`, `og-image/`, `git/`, `config/`,
  `cli/` — et la liste `files` se réduit à des répertoires. La table `exports`
  garde tous ses noms de sous-chemin.
- `apps/www` est le site qui développe la couche, avec les vérifications qui
  lisent son build.
- La racine n’est pas un paquet. Elle garde la configuration du workspace et la
  méta, ainsi que `docs/`, que `apps/www` publie.
- Les paquets fournisseurs arrivent à côté de la couche en
  `packages/duxt-typesense` et `packages/duxt-meilisearch`, avec #74 et #75.

**Chaque paquet publié est sa propre unité de version.** release-please tourne
en mode manifeste avec une entrée par paquet, chacune avec sa version et son
changelog, et une version ne publie que les paquets qu’elle a montés. Une version
partagée a été écartée, car elle republie des paquets inchangés sous un nouveau
numéro.

**Chaque paquet étiquette `<name>@vX.Y.Z`, la couche comprise** —
`include-component-in-tag` avec `tag-separator: "@"`, si bien que `duxt@v0.5.0`
côtoie `duxt-typesense@v0.1.0`. La version elle-même reste un simple nombre dans
`package.json` et sur npm. Les tags simples `v0.1.0`…`v0.4.0` restent tels quels,
et `last-release-sha` pointe une fois sur le commit de la version `v0.4.0`, pour
que release-please retrouve la version précédente de la couche malgré le nouveau
motif.

**Le changelog de la couche reste à la racine du dépôt**, en
`changelog-path: "/CHANGELOG.md"`. Le site publie le changelog de chaque version
qu’il sert, lu dans le checkout de cette version, et chaque tag existant a le
fichier à cet endroit. Le déplacer dans le paquet aurait laissé chaque édition
antérieure sans ses pages de versions. Le changelog d’un fournisseur vit dans son
propre répertoire ; il n’a pas d’historique à préserver.

**Le versionnage par tags de duxt apprend les tags par composant**, et doit
arriver avant la première version qui suit le déménagement. `latest`, la
découverte des versions et l’ordre du sélecteur lisent `<name>@vX.Y.Z` comme
`vX.Y.Z` ; le libellé et le segment d’URL n’affichent que la version ; et une
source peut nommer un `tagComponent` pour se limiter aux tags d’un paquet, les
tags simples comptant comme son historique antérieur. Sans cela, `latest` dans
`apps/www` serait resté sur `v0.4.0` après `duxt@v0.5.0` sans qu’aucun build
n’échoue.

**C’est le registre qui décide d’une publication.** Un paquet est publié quand
sa version a un tag `<component>@v<version>` et que npm n’a pas cette version.
Le `_publish-npm.yml` central publie la racine du dépôt et le
`_release-please.yml` central ne transmet que les sorties du paquet racine : les
jobs de publication appartiennent donc au dépôt jusqu’à ce que les corps centraux
acceptent un répertoire de travail.

**Les fournisseurs dépendent en peer de `@kirchdev/duxt` avec une plage large,
`>=0.4.0 <1`**, la borne inférieure étant ce dont le fournisseur a besoin en
premier — jamais `^0.x`, qui obligerait chaque fournisseur à publier à chaque
mineure de la couche. La barrière du monorepo prouve la compatibilité, et la borne
inférieure ne monte que lorsque le contrat du hook change de façon incompatible.

**Le cache de Turborepo est uniquement local** — pas de cache distant, pas de
compte, pas de jeton. Une tâche n’est mise en cache que là où ses entrées
déclarées déterminent son résultat : c’est le cas des tests unitaires ; le
typecheck, le build et chaque vérification d’un build résolvent `latest` auprès
d’un distant et ne le sont pas.

## Conséquences

La décision de dépôts dédiés consignée dans #74 et #75 est remplacée ; ces issues
construisent leurs paquets fournisseurs ici.

Chaque chemin relatif à la couche a bougé, et aucun ne se résout comme il se lit :
le déménagement ne vaut donc que par sa vérification — la barrière complète, un
build Workers avec la vérification du classement des routes, et le tarball
empaqueté installé dans un consommateur de test.

Un changement du contrat du hook et de ses consommateurs arrive désormais dans une
seule pull request derrière une seule barrière, et le site de développement peut
prendre un fournisseur comme dépendance du workspace.

Un monorepo qui étiquette avec release-please peut pointer duxt vers ses propres
tags, ce qui fait du support des tags préfixés une fonctionnalité pour les
consommateurs et non une simple commodité de ce dépôt.

Les chemins des enregistrements précédents décrivent la structure de leur époque.
Ils ne sont pas réécrits, car ces enregistrements ne font que s’allonger.
