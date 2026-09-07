---
title: Recompiler de façon planifiée plutôt que rafraîchir à l’exécution
description: Un site qui lit un autre dépôt en récupère les changements quand il compile, et aucun rafraîchissement à l’exécution n’est proposé.
status: accepted
date: 2026-09-06
---

## Contexte

Un site qui lit sa documentation dans d’autres dépôts a un souhait évident :
récupérer un push sans déploiement. Content, lui, télécharge un dépôt distant à
la compilation et le compile dans la base de données que la compilation livre.
Rafraîchir cela dans un serveur en fonctionnement reviendrait à reconstruire la
base sur place — ce pour quoi Content n’offre aucune voie prise en charge, et la
seule disponible est cette même base de données client que lit la recherche.

## Décision

Content est lu à la compilation et n’est jamais rafraîchi à l’exécution. Un site
dont les sources ont avancé est recompilé : de façon planifiée, ou déclenché
depuis le dépôt source.

## Conséquences

Un déploiement est immuable et une compilation reproductible — les pages servies
sont exactement les pages qui ont été compilées, et le même commit produit le
même site. La sortie statique reste possible, ce qui est la bonne valeur par
défaut pour de la documentation.

La documentation est en retard sur sa source de l’intervalle de recompilation,
et un dépôt source qui veut sa documentation en direct doit déclencher la
compilation du site. C’est le coût, et il se paie en exploitation plutôt que
dans la couche.

Rien dans le thème ne peut supposer qu’il lui est possible de relire une source.
Une fonctionnalité qui voudrait du contenu plus frais que celui de la
compilation demande une autre architecture, pas un réglage.
