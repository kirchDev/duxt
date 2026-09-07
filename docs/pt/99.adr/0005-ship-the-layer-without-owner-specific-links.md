---
title: Entregar a camada sem ligações específicas do proprietário
description: Toda a predefinição que nomearia um projeto concreto — repositório, gestor de issues, comunidade, aviso legal — é entregue vazia.
status: accepted
date: 2026-09-06
---

## Contexto

Um tema de documentação desenha várias linhas de ligações: ligações com ícone na
barra de navegação, um bloco de comunidade ao lado do índice, ligações legais no
rodapé, botões na página inicial. Preenchê-las com o projeto do próprio tema faz
um site de demonstração parecer acabado — e entrega a quem o consome um botão
«dar estrela a este repositório» que marca o trabalho de outra pessoa, uma
comunidade que não é a sua e um aviso legal que é juridicamente errado para si.

Foi a linha legal do rodapé que fixou o princípio primeiro, porque um site alemão
tem de mostrar um aviso legal e fornecê-lo não cabe, sem margem para dúvidas, ao
modelo.

## Decisão

Qualquer predefinição que nomeasse um projeto ou uma organização concretos é
entregue **vazia**. As ligações do próprio tema vivem na configuração do site que
o consome, onde são um exemplo e não uma predefinição. Os elementos genéricos da
interface que não nomeiam ninguém — um cabeçalho de coluna, uma ação «ler a
documentação» — ficam na camada.

## Consequências

Um estranho que estenda a camada recebe uma linha vazia em vez de uma errada,
e uma linha vazia nota-se em falta enquanto uma ligação errada parece correta.

O site de demonstração transporta mais configuração do que precisa quem a consome
de forma mínima, e é essa a função do site: é o exemplo resolvido de cada linha
que quem a consome tem de preencher.

As chaves de mensagens da própria camada ficam para trás quando as suas ligações
saem, e essas chaves são internas. Quem a consome e lhes fosse buscar valores
ficaria dependente de um nome que pode ser renomeado sem um lançamento maior, e
uma chave em falta é impressa como a própria chave — por isso a quebra chegaria a
um leitor antes de chegar a uma compilação. Quem a consome escreve as suas
próprias cadeias de texto; a
[página de configuração](/getting-started/configuration) diz como.
