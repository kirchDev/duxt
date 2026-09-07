---
title: Composants MDC
description: Les blocs qu’une page Markdown peut appeler, une page chacun, avec leurs props.
icon: lucide:blocks
---

Tout ce qui se trouve dans `app/components/content/` est appelable depuis le
Markdown avec la syntaxe MDC — aucun module, pas de MDX. Ceux-ci sont livrés avec
la couche ; votre propre fichier du même nom en remplace un.

Chaque page ici est bâtie de la même façon : ce qu’est le bloc, un exemple rendu
comme ce site le rend avec, à côté, le Markdown qui l’a produit, puis ses props,
ses slots et ses événements.

::page-cards
::

::callout{type="tip" title="L’imbrication prend un deux-points de plus"}
Un bloc à l’intérieur d’un bloc s’ouvre avec un deux-points de plus que son
parent — `:::accordion` autour de `::accordion-item`. La clôture correspond à
l’ouverture.
::
