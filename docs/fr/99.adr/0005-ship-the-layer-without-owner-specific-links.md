---
title: Livrer la couche sans liens propres à un propriétaire
description: Toute valeur par défaut qui nommerait un projet précis — dépôt, gestionnaire de tickets, communauté, mentions légales — est livrée vide.
status: accepted
date: 2026-09-06
---

## Contexte

Un thème de documentation dessine plusieurs rangées de liens : des liens en
icône dans la barre de navigation, un bloc communauté à côté du sommaire, des
liens légaux dans le pied de page, des boutons sur la page d’accueil. Les
remplir avec le projet du thème lui-même donne à un site de démonstration l’air
fini — et remet à chaque consommateur un bouton « mettre une étoile à ce dépôt »
qui met une étoile au travail de quelqu’un d’autre, une communauté qui n’est pas
la sienne, et des mentions légales juridiquement fausses pour lui.

La rangée légale du pied de page a tranché le principe la première : un site
allemand doit afficher des mentions légales, et ce n’est indubitablement pas au
thème de les fournir.

## Décision

Toute valeur par défaut qui nommerait un projet ou une organisation précise est
livrée **vide**. Les liens du thème lui-même vivent dans la configuration du
site consommateur, où ils sont un exemple plutôt qu’une valeur par défaut.
Le texte d’interface générique qui ne nomme personne — un titre de colonne, une
action « lire la documentation » — reste dans la couche.

## Conséquences

Un inconnu qui étend la couche obtient une rangée vide plutôt qu’une rangée
fausse, et une rangée vide manque visiblement là où un lien faux a l’air
correct.

Le site de démonstration porte plus de configuration qu’il n’en faut à un
consommateur minimal, et c’est le rôle de ce site : il est l’exemple travaillé
de chaque rangée qu’un consommateur doit remplir.

Les clés de message de la couche restent en place quand ses liens s’en vont, et
ces clés sont internes. Un consommateur qui irait y puiser dépendrait d’un nom
qui peut être renommé sans version majeure, et une clé absente s’affiche comme
la clé — la rupture atteindrait donc un lecteur avant d’atteindre une
compilation. Les consommateurs écrivent leurs propres chaînes ; la
[page de configuration](/getting-started/configuration) dit comment.
