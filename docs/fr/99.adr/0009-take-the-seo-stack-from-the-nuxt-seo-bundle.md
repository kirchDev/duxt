---
title: Prendre le socle SEO dans le bundle Nuxt SEO
description: La couche installe @nuxtjs/seo et lui confie les balises de head et les données structurées qu'elle écrivait à la main, ne gardant que les règles qui dépendent des versions et des traductions.
status: accepted
date: 2026-09-08
---

## Contexte

La couche embarquait déjà trois des modules de Nuxt SEO — robots, sitemap et
image OG —, choisis un à un au fil des besoins. Tout ce qu'ils ne couvrent pas
était écrit à la main : un lien canonique, un bloc `og:`/`twitter:` par page et un
`@graph` JSON-LD assemblé dans une chaîne de gabarit au sein de `[...slug].vue`.

Cela fonctionnait et restait invisible. C'est précisément le problème : rien de
tout cela n'était couvert par un test, parce que le SEO vit dans le HTML rendu et
non dans la logique, et que les tests de ce dépôt ne couvrent délibérément que la
logique pure. La page d'accueil — celle qu'on partage le plus volontiers —
n'avait aucune carte sociale, la page d'erreur était indexable, et sept langues
étaient publiées sans un seul `og:locale`. Chacune de ces lacunes était un oubli
que personne ne pouvait voir.

La moitié écrite à la main était aussi celle qui grossit. Les données structurées
forment une spécification à large surface, dotée de ses propres validateurs ;
chaque nœud ajouté à la main est un nœud dont il faut deviner la forme en lisant
la spécification.

## Décision

La couche dépend de `@nuxtjs/seo` et le charge comme un seul module, à la place
qu'occupaient les trois modules nommés — avant `@nuxt/content`, parce que
l'intégration de la sitemap avec Content l'exige.

Le bundle est un alias, pas une surcouche : sa propre documentation indique qu'il
« ne contient aucune logique propre ». Ce qu'il apporte, ce sont les quatre
modules manquants — `nuxt-schema-org` pour le graphe, `nuxt-seo-utils` pour le
canonique automatique et les balises sociales dérivées, `nuxt-link-checker`, et
`nuxt-site-config` comme unique endroit d'où `site.url` est lu — ainsi que le
panneau devtools partagé, qui rend compte de ceux qui sont installés.

Trois valeurs par défaut de `nuxt-seo-utils` sont désactivées, chacune pour une
raison que la couche ne peut pas contourner par conception :
`canonicalLowercase`, parce qu'un préfixe de langue est sensible à la casse et que
`/de-DE/` n'est pas `/de-de/` ; `fallbackTitle`, parce qu'un titre inventé à
partir d'un slug masquerait le validateur de build qui échoue sur une page sans
titre ; et `mergeWithSiteConfig`, parce que `app.vue` est propriétaire du gabarit
de titre.

Reste écrit à la main ce que les modules ne peuvent pas savoir : le canonique
d'une page versionnée pointe vers la version courante et non vers la page en
cours de rendu, et `noindex` découle du fait qu'une version est ancienne ou qu'une
page est servie dans une langue vers laquelle elle n'a pas été traduite.

La vérification des liens signale au lieu d'échouer. `modules/validate.ts` fait
déjà échouer un build sur un lien qui ne mène nulle part, et c'est la
vérification qui comprend les versions et les replis de langue.

## Conséquences

Chaque consommateur de la couche installe sept modules là où il en installait
trois. C'est le prix de la décision, et il est payé aussi par les sites qui
n'utiliseront aucun des quatre nouveaux.

Les règles qui n'étaient que des affirmations dans un commentaire sont désormais
des assertions dans `scripts/check-seo.ts`, qui lit les pages construites et
échoue sur un second canonique, un `hreflang` absent, une page d'erreur
indexable, ou un graphe qui ne s'analyse pas. Il tourne dans `check` à côté de
`check:a11y`, pour la même raison : ces balises n'existent que dans le HTML rendu.

Deux de ces règles n'étaient pas vérifiables auparavant, car elles n'existent que
lorsque le site connaît sa propre origine, et `www` ne déclare volontairement
aucun domaine. La vérification remet donc au serveur construit sa propre adresse,
via les variables d'environnement que les modules lisent déjà, plutôt qu'un
domaine figé dans une configuration qu'un consommateur recopierait.

Publier une `Organization` exige un fait que la couche ne doit pas inventer :
elle attend donc une nouvelle clé `duxt.organization` et reste absente tant qu'un
consommateur ne l'a pas renseignée — la même position que l'ADR-0005.

## Alternatives envisagées

**Garder les trois modules et n'ajouter que `nuxt-schema-org`.** Le changement le
plus étroit, écarté à cause du canonique : la règle de version et le canonique
automatique doivent de toute façon être conciliés, et le faire sans
`nuxt-seo-utils` revient à conserver le bloc `og:`/`twitter:` écrit à la main,
déjà oublié sur deux pages.

**Écrire les données structurées à la main et les garder.** Cela fonctionnait,
sans dépendance, et a été écarté parce que le graphe était déjà la partie la plus
susceptible d'être fausse et la moins susceptible d'être remarquée — et parce
qu'une deuxième page réclamant un deuxième nœud aurait signifié une deuxième copie
de l'identité du site enfouie dedans.

**Laisser le vérificateur de liens casser le build.** Écarté parce que deux
gardiens sur une même règle laissent le plus laxiste décider du moment où un
build casse. La vérification qui comprend les versions et les replis de langue de
cette couche est la sienne.
