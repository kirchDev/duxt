---
title: Construire duxt comme une couche portant un module
description: Distribuer le thème comme une couche Nuxt dont la racine est le paquet, plutôt que comme un modèle de départ.
status: accepted
date: 2026-09-06
---

## Contexte

Un thème de documentation se distribue de deux manières. Un **modèle de départ**
est généré dans le dépôt du consommateur, où chaque fichier lui appartient et où
plus aucune amélioration ne lui parvient jamais, sinon comme un diff que
quelqu’un applique à la main. Une **couche** reste une dépendance : le
consommateur l’étend, surcharge les fichiers avec lesquels il n’est pas
d’accord, et emporte le reste des améliorations avec un changement de version.

Une partie de ce que le thème doit faire n’est pas quelque chose qu’une couche
puisse exprimer en fichiers. Générer des collections, résoudre une liste de
sources en préfixes d’URL, transformer le frontmatter en règles de route et
valider le résultat sont du travail de compilation, et le travail de compilation
dans Nuxt, c’est un module.

## Décision

Nous distribuons duxt comme une **couche Nuxt qui porte ses propres modules**,
consommée avec une seule entrée `extends`. La racine du dépôt *est* la couche :
la configuration Nuxt, la configuration content et `app/` sont à la racine, et
le manifeste du paquet pointe vers eux, si bien que `extends: ['@kirchdev/duxt']`
se résout sans étape de compilation. Le site consommateur vit à côté, dans le
même dépôt, et c’est la cible de développement.

## Conséquences

Un consommateur hérite du thème, des pages, des composants, des valeurs de
configuration par défaut et des collections, et surcharge n’importe lequel en
créant un fichier du même nom. Mettre à jour est un changement de version.

Rien de relatif à la couche ne se résout comme cela se lit. Un chemin écrit dans
la couche est lu depuis le répertoire du consommateur, sauf s’il a été résolu par
rapport à l’emplacement de la couche elle-même, et l’alias `@` appartient à celui
qui étend la couche, pas à la couche — les imports propres à la couche ont donc
besoin de leur propre alias. Cela a coûté de vrais bugs, et c’est le prix de
l’arrangement plutôt qu’un oubli.

Les noms surchargeables deviennent une surface publique. Un composant, une page
ou une clé de configuration qu’un consommateur peut masquer est un nom dont il
dépend : en renommer un est donc une publication cassante, et c’est la surface
documentée qui la fige.

Le site de développement et un modèle de départ sont des artefacts distincts. Le
site posé à côté de la couche veut des cas limites, du frontmatter laid,
plusieurs sources et un tag à lire ; un inconnu qui clone un modèle veut
l’inverse. Les confondre rendrait mauvais l’un des deux.

## Alternatives envisagées

**Un modèle de départ.** Liberté totale pour le consommateur, aucun chemin de
mise à jour pour personne — la raison pour laquelle la couche l’a emporté.

**Un module sans couche.** Un module peut enregistrer des composants et des
routes, mais la substance du thème, ce sont des fichiers qu’un consommateur doit
pouvoir masquer, et les livrer par un module signifie les injecter au lieu de
laisser faire la résolution de couches propre à Nuxt.
