---
title: Générer les collections à partir d’une seule liste de sources
description: Calculer les collections Content à partir d’une liste de sources compacte au chargement de la configuration, au lieu de les faire déclarer par les consommateurs.
status: accepted
date: 2026-09-06
---

## Contexte

Nuxt Content alimente une collection depuis un dépôt git, sur une branche ou un
tag, s’authentifie auprès d’un dépôt privé et met le téléchargement en cache par
hachage. Cela a été vérifié en lisant Content lui-même avant que quoi que ce soit
d’ici ne soit construit, et cela signifie que la moitié difficile d’une
documentation multi-dépôts et versionnée existait déjà et n’avait pas besoin
d’être refaite.

Ce qui n’existait pas, c’était l’ergonomie. Un site servant plusieurs versions de
plusieurs projets déclare une collection par dépôt × ref, à la main : trois
versions sur quatorze dépôts font quarante-deux déclarations, et couper une
version les édite toutes les quatorze. Content n’offre pas non plus de hook pour
injecter des collections — mais il charge la configuration content de chaque
couche par c12, ce qui veut dire que ce fichier est du code exécuté et non un
fichier de données, et qu’il peut calculer ses collections au moment où il est
chargé.

## Décision

Les consommateurs déclarent une **liste de sources** compacte — un dossier,
éventuellement un dépôt, éventuellement des refs — dans l’app config du site
lui-même, et la configuration content de la couche en calcule une collection par
source × ref au chargement. La même liste est résolue une seconde fois par la
compilation, en un manifeste nommant quelle collection sert quel préfixe d’URL,
et c’est ce manifeste que le thème lit.

## Conséquences

La liste a la longueur du nombre de projets plutôt que celle du produit des
projets par les versions, et le dossier unique non versionné ne demande aucune
configuration du tout.

Le raccourci exprime moins qu’une collection écrite à la main, et ce sera
toujours le cas. Ce n’est supportable que parce que Content fusionne la
configuration content de chaque couche, la dernière l’emportant : un consommateur
qui a besoin de ce que le raccourci ne sait pas dire écrit son propre fichier et
reprend la main complètement.

Plusieurs fonctionnalités cessent d’avoir besoin de leur propre configuration,
parce qu’une source nomme déjà un dépôt, une ref et un dossier — les liens de
retour vers la source, la date de dernière mise à jour et la liste des
contributeurs en découlent tous.

Les noms de collection deviennent des données. Un site à deux dépôts n’a pas de
collection appelée `docs` : rien dans la couche ne peut donc en nommer une, et le
thème lit le nom dans le manifeste à la place. Du code qui code en dur un nom de
collection fonctionne sur un site à source unique et casse sur tous les autres.

Les chemins des collections se résolvent par rapport à la couche et non au
consommateur, parce que Content enregistre comme racine d’une collection la
couche qui l’a déclarée. La couche calcule donc des chemins absolus, ce qui n’est
possible que parce que la configuration est du code exécuté — la propriété même
sur laquelle repose tout le raccourci.
