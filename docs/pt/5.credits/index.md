---
title: Créditos
description: Aquilo em que o duxt assenta, e aquilo de que partiu.
icon: lucide:heart
---

O duxt é uma camada fina sobre o trabalho de outros. Quase nada do que faz é
invenção sua — a recolha das fontes, a análise, os componentes e o estilo vêm
todos de projetos que resolveram esses problemas primeiro, e a descrição honesta
deste repositório é a cola entre eles mais um punhado de opiniões.

## Em que assenta

| Projeto                                              | O que faz aqui                                                       |
| :--------------------------------------------------- | :-------------------------------------------------------------------- |
| [Vue](https://vuejs.org)                             | O modelo de componentes em que tudo isto está escrito                  |
| [Nuxt](https://nuxt.com)                             | A framework, e o mecanismo de camadas em que toda a ideia assenta      |
| [Nuxt Content](https://content.nuxt.com)             | Ir buscar, analisar, consultar — incluindo os repositórios git nativos |
| [shadcn-vue](https://www.shadcn-vue.com)             | A base de componentes, copiada para a camada em vez de importada       |
| [reka-ui](https://reka-ui.com)                       | As primitivas por baixo deles: foco, roving tabindex, ARIA             |
| [Tailwind CSS](https://tailwindcss.com)              | O sistema de estilos e a camada de tokens                              |
| [Shiki](https://shiki.style)                         | Realce de sintaxe, em tempo de compilação                              |
| [Lucide](https://lucide.dev)                         | O conjunto de ícones                                                   |
| [MDC](https://content.nuxt.com/docs/files/markdown)  | Componentes invocáveis a partir do Markdown                            |

A versão de cada um está no `package.json`, que é onde um número pertence — uma
segunda cópia em prosa é uma cópia que envelhece em silêncio.

## De que partiu

Ideias que o duxt tirou de projetos sobre os quais não assenta. Aquilo em que
*assenta* é a tabela acima — nada é nomeado duas vezes.

- [**shadcn/ui**](https://ui.shadcn.com) — a ideia original: componentes que são
  teus como ficheiros em vez de importados como dependência. Cada componente
  desta camada está aqui por causa dela.
- [**shadcn-docs-nuxt**](https://shadcn-docs-nuxt.vercel.app) — o vizinho mais
  próximo, e a prova de que vale a pena ter um modelo de documentação sobre Nuxt
  Content e shadcn-vue.
- [**Docus**](https://docus.dev) — a ergonomia original de «estende uma camada,
  ficas com um site de documentação» no ecossistema Nuxt.
- [**Nuxt UI**](https://ui.nuxt.com) — pelo lado legível por máquinas:
  `llms.txt` e um endpoint de documentação que um agente pode chamar, tratados
  como resultado da compilação e não como um extra.
- [**VitePress**](https://vitepress.dev) e
  [**Starlight**](https://starlight.astro.build) — pelo que um tema de
  documentação deve por omissão a quem lê: um seletor de versões que sobrevive à
  navegação, um índice que acompanha, pesquisa que está lá sem configuração.

::callout{type="tip" title="Onde o duxt difere"}
Todos os projetos acima documentam um repositório numa versão. A razão de existir
do duxt começa onde isso pára: vários repositórios, várias versões de cada um, e
uma lista `sources` a gerar as coleções para todos eles — ver
[Fontes](/concepts/sources).
::

## O que não está creditado aqui

Duas coisas estão deliberadamente ausentes. As dependências da própria camada
estão listadas no `package.json` e não precisam de uma segunda cópia mantida à
mão; e quem escreveu uma dada página é nomeado nessa página, a partir do
histórico git por trás dela, e não numa lista aqui que ficaria desatualizada no
commit seguinte.
