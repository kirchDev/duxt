---
title: Recompilar de forma agendada em vez de atualizar em tempo de execução
description: Um site que lê outro repositório apanha as suas alterações quando compila, e não é oferecida nenhuma atualização em tempo de execução.
status: accepted
date: 2026-09-06
---

## Contexto

Um site que lê documentação a partir de outros repositórios tem um desejo óbvio:
apanhar um push sem um deploy. Só que o Content descarrega um repositório remoto
durante a compilação e compila-o para a base de dados que a compilação entrega.
Atualizar isso num servidor a correr significaria reconstruir a base de dados no
lugar — para o que o Content não oferece nenhum caminho suportado, e a única via
disponível é a mesma base de dados do lado do cliente que a pesquisa lê.

## Decisão

O Content é lido em tempo de compilação e nunca atualizado em tempo de execução.
Um site cujas fontes avançaram é recompilado: de forma agendada, ou desencadeado
a partir do repositório de origem.

## Consequências

Um deployment é imutável e uma compilação é reproduzível — as páginas servidas
são exatamente as páginas que foram compiladas, e o mesmo commit produz o mesmo
site. A saída estática continua possível, o que é a predefinição certa para
documentação.

A documentação fica atrás da sua fonte pelo intervalo de recompilação, e um
repositório de origem que queira a sua documentação em direto tem de desencadear
a compilação do site. É esse o custo, e é pago em operações e não na camada.

Nada no tema pode assumir que consegue reler uma fonte. Uma funcionalidade que
queira conteúdo mais recente do que aquele que a compilação tem está a pedir uma
arquitetura diferente, não uma opção de configuração.
