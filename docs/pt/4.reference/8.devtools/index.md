---
title: Devtools
description: Dez painéis que mostram no que as tuas fontes se tornaram. Apenas em desenvolvimento.
icon: lucide:wrench
---

`sources` é uma lista compacta. O que o site serve é um conjunto de coleções,
prefixos de URL, redireccionamentos, catálogos de mensagens e uma cache de
descargas que a compilação calculou a partir dela — e antes de este separador
existir, a única forma de ver alguma dessas coisas era ler o código que as produz.

## Abrir

Arranca o servidor de desenvolvimento e abre as Nuxt Devtools (`Shift` + `Alt` +
`D`, ou o botão no canto). O separador chama-se **duxt**; os painéis ficam atrás da
linha de separadores lá dentro. As mesmas páginas respondem directamente em
`/_duxt/devtools`, se preferires tê-las numa janela própria.

::callout{type="danger" title="Nunca registado numa compilação"}
Os painéis expõem a configuração resolvida, os caminhos de ficheiros por trás dela
e um botão que apaga um directório de cache. Nada disso é da conta de ninguém em
produção, e é por isso que `modules/devtools.ts` retorna antes de registar seja o
que for fora de um servidor de desenvolvimento — a rota não existe, em vez de
existir e recusar.
::

## Os painéis

::page-cards
::

## Sobre as pré-visualizações destas páginas

Cada painel abaixo está embebido tal como se desenha — não é uma captura de ecrã.
As páginas executam as próprias funções de desenho dos painéis sobre um site de
exemplo e guardam o resultado, por isso um painel que ganha uma coluna ganha-a
nesta documentação no mesmo commit.

Esse site de exemplo é um projecto imaginado: `acme/sdk` publicado em duas versões
(`v2` a partir de `main`, `v1.9` a partir de uma etiqueta) em inglês e alemão, mais
`acme/cli` numa só. Tem falhas propositadas — um guia que a versão antiga antecede,
duas páginas que a tradução ainda não alcançou, uma página sem frontmatter —
porque um painel sem nada a comunicar não ensina a ninguém o aspecto que tem quando
algo corre mal.

As pré-visualizações são inertes: os seus separadores mudam de painel, e tudo o
resto — as ligações para o editor, o botão de eliminação, o formulário de pesquisa
— não faz nada.
