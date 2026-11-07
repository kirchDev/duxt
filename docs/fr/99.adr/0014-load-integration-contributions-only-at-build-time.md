---
title: Charger les contributions des intégrations uniquement à la compilation
description: Garder les analyseurs hors de la configuration cliente tout en permettant aux couches de contribuer des collections et métadonnées.
status: accepted
date: 2026-11-07
---

# ADR-0014 — Charger les contributions des intégrations uniquement à la compilation

## Contexte

Les analyseurs et métadonnées doivent atteindre la configuration de Content et les modules Nuxt. Des contributions exécutables dans la configuration cliente lient le navigateur aux dépendances de compilation. Une navigation propre à un fournisseur lie aussi son dialecte au thème.

## Décision

Nous avons choisi un fichier réservé à la compilation, découvert par la résolution des couches Nuxt, avec priorité au site. Les intégrations intégrées utilisent le même contrat. Les dialectes écrivent des métadonnées génériques de navigation; le noyau classe et regroupe les pages sans connaître leur origine.

## Conséquences

Une extension peut enrichir le schéma sans imposer ses champs aux autres sites. Les mises à jour de contenu conservent le même chemin d’analyse. Une modification du schéma exige une nouvelle image avant le déploiement de bundles compatibles. Nous avons exposé un seul chemin d’utilitaires instable pendant l’évaluation de la frontière d’extraction, en acceptant ses changements avant sa confirmation par des paquets séparés.
