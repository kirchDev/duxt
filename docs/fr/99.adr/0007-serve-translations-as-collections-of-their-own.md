---
title: Servir les traductions comme des collections à part
description: Ajouter une dimension de locale à une source plutôt qu’un segment de locale au chemin de contenu.
status: accepted
date: 2026-09-06
---

## Contexte

La couche traduisait son interface en sept locales et servait un seul jeu de
pages à toutes : `useDuxtPath()` retirait le segment de locale avant chaque
recherche de contenu, si bien que `/de-DE/guides/deploying` et
`/guides/deploying` se résolvaient vers le même fichier. Content v3 n’a aucune
notion de locale — une collection est un arbre — les pages traduites appelaient
donc une décision plutôt qu’un réglage.

Ce que font les générateurs comparables a été lu plutôt que supposé. Starlight,
VitePress, Docusaurus et MkDocs placent toutes leurs traductions dans un dossier
par langue ; seul Starlight a un repli documenté pour une page qui manque à une
langue. Passé une certaine taille, la traduction quitte l’outil entièrement :
React fait tourner `de.react.dev` comme son propre dépôt, Vue toute une
organisation `vuejs-translations`, parce que les traducteurs travaillent selon
leur propre calendrier et leur propre relecture. OpenCode a construit un agent
qui traduisait sa documentation en CI, l’a exécuté, puis l’a coupé ; dix-sept
langues sont immobiles depuis.

Le coût a été mesuré avant que la forme ne soit choisie : les compilations sur
1 … 200 collections évoluent linéairement, à environ 2,2 s et 0,63 Mo de base de
données chacune, sans coude. La matrice n’a pas de plafond qui forcerait la main
à la conception.

## Décision

Une source gagne une liste `locales`, et une ref aussi, résolue comme l’est déjà
`status` (`ref.locales ?? source.locales`). Une chaîne est un dossier à
l’intérieur du `path` de la source ; un objet déplace cette langue dans son
propre dossier, dépôt ou ref.

**La locale par défaut est l’arbre de `path` lui-même, sans dossier**, si bien
qu’ajouter la clé ne déplace aucune URL qu’un site sert déjà.

**La locale ne fait pas partie du chemin de contenu.** Elle appartient au
routage d’i18n, qui la place de toute façon devant le chemin. L’original et la
traduction vivent donc sous des chemins de contenu identiques, dans des
collections distinctes.

Une page absente d’une langue retombe le long d’une chaîne — la locale, sa
langue de base, une région sœur, le `fallbackLocale` de vue-i18n, l’original non
traduit — et le lecteur est informé, par un bandeau, de la langue qui lui est
montrée.

## Conséquences

Aucune comparaison de chemin du thème n’est touchée : la navigation, les
redirections, le fil d’Ariane, le score de page la plus proche de la 404 et le
sélecteur de langue continuent tous de fonctionner sur un chemin qui n’a jamais
porté de locale. Le repli est une requête de plus pour le même chemin plutôt
qu’une redirection ou un second schéma de résolution.

`useDuxtNavigation` et la recherche suivent `useDuxtCollection` : les deux sont
donc devenus sensibles à la locale sans être modifiés.

Un site qui ne règle rien obtient exactement ce qu’il avait : une collection
nommée `docs`, une entrée dans le manifeste, une requête par page.

Deux configurations peuvent désormais diverger d’une manière qui produit une
page vide plutôt qu’une erreur — `content.config.ts` résout la locale par défaut
sans accès à la configuration Nuxt. Le module duxt vérifie donc
`sourceOptions.defaultLocale` contre `i18n.defaultLocale` et fait échouer la
compilation lorsqu’elles diffèrent, au lieu d’injecter l’une dans l’autre et de
laisser Content calculer l’autre réponse.

Les traductions multiplient les collections, et la compilation paie chacune
linéairement. Le chiffre a sa place dans la documentation, parce que c’est le
consommateur qui décide de la matrice.

Les fragments suivent les pages. `_partials/` est une collection PAR LANGUE,
nommée comme les collections de pages — `duxt_partials` pour l’original,
`duxt_partials_de` à côté — et `:partial{name}` parcourt la même chaîne de repli
que la page. Ce doit être la même chaîne : qu’une page et les blocs qu’elle
inclut se replient sur des langues différentes, c’est exactement ainsi qu’on
obtient une page à moitié traduite sans que rien ne le signale.

La première version de cette décision partageait UNE collection de fragments non
traduits entre toutes les langues. C’était défendable tant que rien ne traduisait
un fragment, et cela a cessé de l’être au moment où une passe de traduction a
produit `docs/de/_partials/` — des fichiers qu’aucune collection ne lisait, et
une page allemande affichant une note d’installation en anglais sans que rien
n’indique que cela s’était produit.

## Alternatives envisagées

**Un segment de locale dans le préfixe de contenu.** Symétrique avec `repo` et
`version`, et cela aurait obligé chaque comparaison de chemin du thème à
apprendre les locales — pour une URL qu’i18n préfixe déjà, et qui serait donc
écrite deux fois.

**Un suffixe de fichier — `installation.de-DE.md` à côté de l’original.** Aucune
multiplication des collections, et cela échoue sur le cas qu’ont réellement les
gros projets : cela force la traduction dans le même dépôt et la même ref que
l’original.

**Une 404 pour une traduction manquante.** Ce que fait VitePress par omission.
Cela punit le lecteur pour un trou laissé par l’auteur, et cela cache à tous les
autres que la traduction est incomplète.
