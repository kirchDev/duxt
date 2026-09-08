---
title: Bâtir le thème sur des composants shadcn-vue possédés
description: La couche détient le code source de ses composants d'interface plutôt que de les importer d'une bibliothèque de composants ou d'un thème de documentation tout fait.
status: accepted
date: 2026-09-08
---

## Contexte

Une couche de documentation, c'est surtout de l'interface : un en-tête, une barre
latérale, un sommaire, des blocs de code, une boîte de recherche. Quelque chose
doit les dessiner, et ce choix décide de ce qu'un consommateur peut changer sans
forker.

Toute la proposition de la couche tient à ce qu'on l'étend au lieu de la générer —
`extends: ['@kirchdev/duxt']`, et chaque fichier reste surchargeable. Un thème
dont l'apparence ne serait atteignable que par les options auxquelles son auteur
a pensé contredirait cela dès la première chose qu'un consommateur voudrait
différente. La résolution de couches de Nuxt offre déjà la surcharge au niveau du
fichier — la question était donc de savoir ce que devaient être ces fichiers.

## Décision

La couche possède le code source de ses composants. shadcn-vue sert de source des
primitives : son CLI écrit le code d'un composant dans le dépôt, et à partir de là
le fichier appartient à la couche, non à une dépendance. `components.json` pointe
le CLI sur l'alias propre à la couche : ajouter une primitive tient en une
commande, et Tailwind fournit la mise en forme en dessous.

La palette est faite de propriétés personnalisées CSS. Les composants lisent des
jetons et ne détiennent aucune couleur, ce qui permet à une surcharge d'une seule
ligne d'atteindre toutes les surfaces.

## Conséquences

Un consommateur peut changer n'importe quelle partie de l'interface, à la
profondeur qu'exige le changement : redéfinir un jeton, occulter un composant par
son nom, ou ajouter une primitive à lui. Rien de tout cela ne demande un fork, et
rien n'attend que la couche expose une option pour cela.

Le coût, c'est l'entretien. Un correctif sur une primitive n'arrive pas avec une
montée de version — il arrive quand quelqu'un relance le CLI pour ce composant. La
couche l'assume pour les primitives qu'elle livre ; un consommateur qui en
surcharge une l'assume ensuite. C'est autour de ce compromis qu'est construit le
guide de surcharge, et c'est la raison de son existence.

Les fichiers repris que le CLI n'atteint pas sont le tranchant du même compromis :
une feuille de style sans entrée de registre ne peut être mise à jour qu'en la
retéléchargeant, si bien que les modifications locales se perdent en silence au
lieu d'entrer bruyamment en conflit.

## Alternatives envisagées

**Un thème de documentation tout fait.** Docus est le choix évident — le thème
propre de Nuxt Content, et tout ce dont un site de documentation a besoin au
premier lancement. Écarté pour la raison même qui le rend attirant : le site qu'il
produit est celui de son auteur, et le remodeler suppose soit une option qui
existe, soit un fork. Une couche dont les consommateurs devaient se distinguer les
uns des autres ne pouvait accepter ce plafond.

**Une bibliothèque de composants en dépendance.** Nuxt UI aurait fourni les
primitives sans l'entretien, et la couche aurait suivi ses versions au lieu de
copier du code. Écarté parce que les composants d'une dépendance ne se changent
que dans les limites de leurs props, et la couche aurait alors dû inventer un
second mécanisme de surcharge pour le reste — avec deux, aucun n'aurait été celui
vers lequel on se tourne d'évidence.

**Des composants écrits à la main, sans amont du tout.** Cela évacue entièrement
la question de la dépendance et a été écarté pour son coût : les primitives
accessibles sont difficiles précisément là où l'on se trompe facilement, et une
boîte de dialogue ou une combobox écrites de zéro seraient moins bonnes que
celles adaptées d'une source qui a déjà résolu le problème.
