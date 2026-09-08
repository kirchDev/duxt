---
title: Devtools
description: Dix panneaux qui montrent ce que vos sources sont devenues. En développement seulement.
icon: lucide:wrench
---

`sources` est une liste compacte. Ce que le site sert, c’est un ensemble de
collections, de préfixes d’URL, de redirections, de catalogues de messages et un
cache de téléchargement que la compilation en a déduits — et avant cet onglet, la
seule façon d’en voir quoi que ce soit était de lire le code qui le produit.

## L’ouvrir

Lancez le serveur de développement et ouvrez Nuxt Devtools (`Shift` + `Alt` + `D`,
ou le bouton dans le coin). L’onglet s’appelle **duxt** ; les panneaux se trouvent
derrière la rangée d’onglets qu’il contient. Les mêmes pages répondent directement
sous `/_duxt/devtools` si vous les préférez dans une fenêtre à part.

::callout{type="danger" title="Jamais enregistré dans un build"}
Les panneaux exposent la configuration résolue, les chemins de fichiers qui sont
derrière et un bouton qui supprime un répertoire de cache. Rien de tout cela ne
regarde qui que ce soit en production, et c’est pourquoi `modules/devtools.ts`
retourne avant d’enregistrer quoi que ce soit hors d’un serveur de développement —
la route n’existe pas, plutôt que d’exister et de refuser.
::

## Les panneaux

::page-cards
::

## À propos des aperçus de ces pages

Chaque panneau ci-dessous est intégré tel qu’il se rend — ce n’est pas une capture
d’écran. Les pages exécutent les fonctions de rendu des panneaux eux-mêmes sur un
site d’exemple et enregistrent le résultat : un panneau qui gagne une colonne la
gagne dans cette documentation au même commit.

Ce site d’exemple est un projet imaginaire : `acme/sdk` publié en deux versions
(`v2` depuis `main`, `v1.9` depuis un tag) en anglais et en allemand, plus
`acme/cli` en une seule. Il comporte des trous délibérés — un guide que l’ancienne
version précède, deux pages que la traduction n’a pas rattrapées, une page sans
frontmatter — car un panneau qui n’a rien à signaler n’apprend à personne de quoi
il a l’air quand quelque chose cloche.

Les aperçus sont inertes : leurs onglets passent d’un panneau à l’autre, et tout le
reste — les liens vers l’éditeur, le bouton de suppression, le formulaire de
recherche — ne fait rien.
