---
title: Charger les modules Nuxt SEO par leur nom
description: La couche abandonne le paquet @nuxtjs/seo et charge par leur nom les sept modules qu'elle utilise, car la v6 du paquet ajoute des modules qui doublent le llms.txt, le Markdown et le MCP de la couche. Remplace la manière dont ADR-0009 les installe, pas leur choix.
status: accepted
date: 2026-10-29
---

## Contexte

ADR-0009 a pris la base SEO de `@nuxtjs/seo` : robots, sitemap, image OG,
schema.org, les utilitaires SEO, le vérificateur de liens et site config,
installés via un paquet qui « ne contient aucune logique propre ».

La version 6 du paquet installe deux modules de plus. `nuxt-ai-ready` sert
`llms.txt`, `llms-full.txt`, des versions Markdown de chaque page et ses propres
outils MCP : exactement la surface pour laquelle cette couche existe, à travers
sources, versions et langues. Chargé à côté de celle de la couche, il revendique
les mêmes routes, et ses outils MCP exigent une base de données que la couche ne
fournit pas : la compilation échoue en réclamant `drizzle-orm`.
`nuxt-skew-protection` arrive avec lui sans avoir été demandé.

Un site qui étend la couche hérite de tous les modules qu'elle charge. Un paquet
qui grandit à chaque version majeure fait grandir chaque consommateur sans que la
couche ait rien décidé.

## Décision

La couche dépend des sept modules choisis par ADR-0009 et les charge par leur
nom, dans l'ordre où le paquet les installe — `@nuxtjs/robots`,
`@nuxtjs/sitemap`, `nuxt-link-checker`, `nuxt-og-image`, `nuxt-schema-org`,
`nuxt-seo-utils`, `nuxt-site-config` —, toujours avant `@nuxt/content`, pour
l'intégration Content du sitemap.

Le choix des modules et leur configuration restent tels qu'ADR-0009 les a
décidés. Seule l'installation change : par leur nom au lieu du paquet.

## Conséquences

La couche porte sept dépendances au lieu d'une, et leurs versions doivent avancer
ensemble ; jusqu'ici, les vérifications de version du paquet le signalaient
quand ce n'était pas le cas. Un nouveau module de la famille Nuxt SEO n'atteint
la couche que si quelqu'un l'ajoute délibérément.

Le panneau devtools partagé indique comme manquants les modules du paquet que la
couche ne charge pas. C'est la vue du panneau sur le paquet, pas un défaut du
site.

## Alternatives envisagées

**Garder le paquet et désactiver `nuxt-ai-ready`.** Une ligne, et la compilation
passe. Écartée, car le prochain module ajouté au paquet atteindrait de nouveau
chaque consommateur en silence, et `nuxt-skew-protection` arriverait quand même.

**Remplacer les routes llms.txt, Markdown et MCP propres à la couche par
`nuxt-ai-ready`.** Cela abandonnerait ce que la couche apporte en plus — sources,
versions et langues dans chacune de ces surfaces — pour moins de code.

**Rester sur la v5 du paquet.** Cela bloque aussi le sitemap sur son ancienne
version majeure et ne fait que repousser la même décision.
