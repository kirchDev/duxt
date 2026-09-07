---
title: Composants
description: Les composants propres à la couche, une page chacun — à quoi sert chacun, et ce qu’il prend.
icon: lucide:component
---

Chaque composant ici est **remplaçable** : un fichier du même nom dans votre
projet remplace celui de la couche, sans aucune configuration. Un nom documenté
ici fait partie de la surface publique, il ne sera donc pas renommé sans une
version majeure.

Les pages sont groupées par ce que fait un composant : les deux qui encadrent une
page, les six qui parcourent son arbre, les contrôles qu’actionne un lecteur, et
les composants qui appartiennent à la page elle-même.

::page-cards
::

::callout{type="tip" title="Remplacer le moins possible"}
Avant de remplacer un composant, vérifiez si une clé de configuration, un slot ou
un token CSS ne fait pas déjà ce dont vous avez besoin — voir
[Surcharger le thème](/guides/override-the-theme). Un fichier remplacé cesse de
recevoir les correctifs de la couche.
::
