---
title: Introduction
description: Ce qu’est duxt, et ce qui arrive avec une seule ligne de configuration.
icon: lucide:rocket
---

duxt est une couche Nuxt. Vous l’étendez, vous mettez du Markdown dans `docs/`,
et vous avez un site de documentation : navigation, sommaire, recherche, thème,
`llms.txt` et un serveur MCP compris.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  extends: ['@kirchdev/duxt']
});
```

C’est tout le cas du dossier unique. Aucune collection, aucune mise en page,
aucun `content.config.ts`.

## Ce que ce n’est pas

duxt ne source pas le contenu. [Nuxt Content v3](https://content.nuxt.com)
télécharge déjà un dépôt git sur une branche ou un tag, s’authentifie auprès
d’un dépôt privé et met le résultat en cache par hachage — et duxt s’en sert
plutôt que de le réimplémenter.

Ce que duxt ajoute, c’est la partie autrement retapée dans chaque dépôt de
documentation : une collection par version et par dépôt, le schéma d’URL qui les
porte, le sélecteur qui sait quelle page existe où, et un thème par-dessus. Tout
cela est généré à partir d’une seule liste — voir
[Sources](/concepts/sources).

## Où aller ensuite

::page-cards
::
