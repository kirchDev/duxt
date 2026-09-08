---
title: Introdução
description: O que é o duxt, e o que chega com uma única linha de configuração.
icon: lucide:rocket
---

O duxt é uma camada Nuxt. Estende-a, coloca Markdown em `docs/` e tem um site de
documentação: navegação, índice, pesquisa, tema, `llms.txt` e um servidor MCP
incluídos.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  extends: ['@kirchdev/duxt']
});
```

É este o caso da pasta única, por inteiro. Sem coleção, sem layout, sem
`content.config.ts`.

## O que não é

O duxt não obtém conteúdo. O [Nuxt Content v3](https://content.nuxt.com) já
descarrega um repositório git num ramo ou numa tag, autentica-se perante um
privado e guarda o resultado em cache por hash — e o duxt usa isso em vez de o
reimplementar.

O que o duxt acrescenta é a parte que de outro modo se volta a escrever em cada
repositório de documentação: uma coleção por versão e repositório, o esquema de
URL que as transporta, o seletor que sabe que página existe onde, e um tema por
cima. Tudo isto é gerado a partir de uma única lista — ver
[Fontes](/concepts/sources).

## Para onde ir a seguir

::page-cards
::
