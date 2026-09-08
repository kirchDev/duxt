---
title: Desenhar os componentes Markdown com MDC
description: Usar a própria sintaxe MDC do Content para componentes dentro do Markdown, em vez de adotar MDX.
status: accepted
date: 2026-09-06
---

## Contexto

Um tema de documentação precisa de componentes dentro da prosa — callouts,
código em separadores, campos de parâmetros, árvores. Havia duas sintaxes
disponíveis. O **MDX** compila o Markdown num módulo de componente e deixa uma
página importar e escrever JSX; o **MDC** é a sintaxe de componentes em bloco e
em linha que o Content já traz e já analisa.

As páginas também são lidas por algo que não é um navegador. O tema publica o
Markdown de origem de cada página para os modelos, por isso a sintaxe em que as
páginas estão escritas é aquilo que um modelo recebe.

## Decisão

Os componentes em Markdown são **MDC**. Os componentes que uma página pode
chamar vivem num diretório de conteúdo dedicado, onde um ficheiro de quem a
consome com o mesmo nome substitui o da camada.

## Consequências

Não é preciso instalar nem configurar nada para uma página chamar um componente,
e uma página continua a ser um ficheiro Markdown em vez de se tornar um módulo.

Um bloco MDC sobrevive a ser entregue a um modelo como texto: lê-se como uma
chamada de componente com argumentos nomeados. JSX compilado não sobreviveria.

A sintaxe é do Content, por isso as suas capacidades e os seus limites também
são do Content. Tudo o que uma página queira e o MDC não consiga exprimir tem de
ser resolvido como um componente e não como uma expressão na página — o que é
uma restrição para quem escreve e, num site de documentação, uma restrição
desejável.

Os nomes dos componentes no diretório de conteúdo fazem parte da superfície
pública, já que uma página escrita para um deles é um ficheiro de quem a
consome.

## Alternativas consideradas

**MDX.** Mais expressivo, e cada bocado dessa expressividade é JavaScript numa
página de documentação. Precisaria ainda de um módulo e de um caminho de
compilação que o Content não tem, para acabar por ter páginas que são piores de
entregar a um modelo.
