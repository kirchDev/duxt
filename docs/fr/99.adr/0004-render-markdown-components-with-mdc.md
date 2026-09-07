---
title: Rendre les composants Markdown avec MDC
description: Utiliser la syntaxe MDC propre à Content pour les composants dans le Markdown plutôt que d’adopter MDX.
status: accepted
date: 2026-09-06
---

## Contexte

Un thème de documentation a besoin de composants au milieu de la prose —
encadrés, code à onglets, champs de paramètres, arborescences. Deux syntaxes
étaient disponibles. **MDX** compile le Markdown en un module de composant et
laisse une page importer et écrire du JSX ; **MDC** est la syntaxe de composants
en bloc et en ligne que Content livre et analyse déjà.

Les pages sont aussi lues par autre chose qu’un navigateur. Le thème publie la
source Markdown de chaque page à destination des modèles : la syntaxe dans
laquelle les pages sont écrites est donc celle qu’un modèle reçoit.

## Décision

Les composants dans le Markdown sont du **MDC**. Les composants appelables
depuis une page vivent dans un répertoire de contenu dédié, où le fichier du
même nom d’un consommateur remplace celui de la couche.

## Conséquences

Rien n’a besoin d’être installé ni configuré pour qu’une page appelle un
composant, et une page reste un fichier Markdown au lieu de devenir un module.

Un bloc MDC survit au fait d’être remis à un modèle sous forme de texte : il se
lit comme un appel de composant avec des arguments nommés. Du JSX compilé, non.

La syntaxe est celle de Content : ses capacités et ses limites sont donc aussi
celles de Content. Tout ce qu’une page voudrait et que MDC ne sait pas exprimer
doit être résolu comme un composant plutôt que comme une expression dans la page
— ce qui est une contrainte pour les auteurs et, pour un site de documentation,
une contrainte souhaitable.

Les noms de composants du répertoire de contenu font partie de la surface
publique, puisqu’une page écrite pour l’un d’eux est un fichier de consommateur.

## Alternatives envisagées

**MDX.** Plus expressif, et chaque parcelle de cette expressivité est du
JavaScript dans une page de documentation. Il faudrait en plus un module et un
chemin de compilation que Content n’a pas, pour aboutir à des pages moins bonnes
à remettre à un modèle.
