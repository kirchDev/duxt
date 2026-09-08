---
title: Contrôles
description: Ce qu’actionne un lecteur — la recherche, les sélecteurs, la fiche des raccourcis et deux indicateurs.
icon: lucide:sliders-horizontal
---

Chacun d’eux est un contrôle que le lecteur actionne, ou un état qu’il lit,
plutôt qu’une partie de la structure de la page. Aucun ne prend de prop : ils
lisent
[`useDuxtConfig()`](/reference/composables/config-and-content/use-duxt-config)
et ne dessinent rien quand la configuration ne leur donne rien à offrir.

C’est ce dernier point qui vaut d’être connu avant d’en remplacer un. Un
sélecteur à un seul choix n’est pas un sélecteur : `DuxtVersion` dessine donc un
badge et `DuxtLocale` ne dessine rien du tout — un site à une seule locale ne
voit jamais que duxt parle sept langues.

::page-cards
::
