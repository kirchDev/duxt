---
title: Crédits
description: Ce sur quoi duxt est construit, et ce d’après quoi il l’a été.
icon: lucide:heart
---

duxt est une fine couche posée sur le travail d’autres personnes. Presque rien de
ce qu’il fait n’est de son invention — la lecture des sources, l’analyse, les
composants et le style viennent tous de projets qui ont résolu ces problèmes les
premiers, et la description honnête de ce dépôt, c’est la colle entre eux plus
une poignée de partis pris.

## Construit sur

| Projet                                              | Ce qu’il fait ici                                                      |
| :-------------------------------------------------- | :---------------------------------------------------------------------- |
| [Vue](https://vuejs.org)                             | Le modèle de composants dans lequel tout ici est écrit                   |
| [Nuxt](https://nuxt.com)                             | Le framework, et le mécanisme de couches sur lequel repose toute l’idée  |
| [Nuxt Content](https://content.nuxt.com)             | Lecture des sources, analyse, requêtes — dépôts git natifs compris       |
| [shadcn-vue](https://www.shadcn-vue.com)             | La base de composants, copiée dans la couche plutôt qu’importée          |
| [reka-ui](https://reka-ui.com)                       | Les primitives en dessous : focus, roving tabindex, ARIA                 |
| [Tailwind CSS](https://tailwindcss.com)              | Le système de style et la couche de tokens                               |
| [Shiki](https://shiki.style)                         | La coloration syntaxique, à la compilation                               |
| [Les jeux d’icônes](#icones)                         | Quatre collections, une par nature de marque                             |
| [MDC](https://content.nuxt.com/docs/files/markdown)  | Des composants appelables depuis le Markdown                             |

La version de chacun est dans `package.json`, là où un numéro a sa place — une
seconde copie en prose est une copie qui se périme en silence.


## Icônes

Quatre collections, parce que monochrome et coloré sont deux métiers différents —
la règle qui décide laquelle dessine quoi est écrite dans
[Conventions](/conventions/icons).

| Jeu                                                          | Dessine                                      | Licence  |
| :------------------------------------------------------------ | :------------------------------------------- | :------- |
| [Lucide](https://lucide.dev)                                  | l’interface                                   | ISC      |
| [vscode-icons](https://github.com/vscode-icons/vscode-icons)  | fichiers, langages de bloc, outils            | MIT      |
| [Simple Icons](https://simpleicons.org)                       | les marques que vscode-icons ne porte pas     | CC0-1.0  |
| [flag-icons](https://github.com/lipis/flag-icons)             | le drapeau à côté de chaque locale            | MIT      |

La licence est nommée ici plutôt que laissée au seul `package.json`, car la
compilation intègre ces SVG dans ce qui est livré : le paquet transporte les
œuvres, donc il transporte les mentions.

Une licence sur un fichier n’est pas une licence sur une marque. Les
gestionnaires de paquets, GitHub, Discord, Claude et OpenAI sont des marques de
leurs titulaires ; elles sont dessinées ici pour nommer ce qu’elles identifient,
et pour rien d’autre.
## Construit d’après

Des idées que duxt a prises à des projets sur lesquels il n’est pas construit. Ce
sur quoi il *est* construit, c’est le tableau ci-dessus — rien n’est nommé deux
fois.

- [**shadcn/ui**](https://ui.shadcn.com) — l’idée d’origine : des composants que
  vous possédez comme fichiers plutôt que d’importer comme dépendance. Chaque
  composant de cette couche est là grâce à lui.
- [**shadcn-docs-nuxt**](https://shadcn-docs-nuxt.vercel.app) — le voisin le plus
  proche, et la preuve qu’un modèle de documentation sur Nuxt Content et
  shadcn-vue vaut la peine d’exister.
- [**Docus**](https://docus.dev) — l’ergonomie d’origine « étendez une couche,
  obtenez un site de documentation » dans l’écosystème Nuxt.
- [**Nuxt UI**](https://ui.nuxt.com) — pour le versant lisible par la machine :
  `llms.txt` et un point de terminaison de documentation qu’un agent peut
  appeler, traités comme une sortie de compilation et non comme un ajout.
- [**VitePress**](https://vitepress.dev) et
  [**Starlight**](https://starlight.astro.build) — pour ce qu’un thème de
  documentation doit à un lecteur par défaut : un sélecteur de version qui
  survit à la navigation, une table des matières qui suit, une recherche
  présente sans configuration.

::callout{type="tip" title="Là où duxt diffère"}
Chaque projet ci-dessus documente un dépôt à une version. La raison d’être propre
de duxt commence là où cela s’arrête : plusieurs dépôts, plusieurs versions de
chacun, et une seule liste `sources` générant les collections de tous — voir
[Sources](/concepts/sources).
::

## Non crédités ici

Deux choses sont délibérément absentes. Les dépendances propres à la couche sont
listées dans `package.json` et n’ont pas besoin d’une seconde copie tenue à la
main ; et les personnes qui ont écrit une page donnée sont nommées sur cette
page, à partir de l’historique git qui la porte, plutôt que dans une liste ici
qui serait périmée dès le commit suivant.
