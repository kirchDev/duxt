---
title: Construir o tema sobre componentes shadcn-vue próprios
description: A camada guarda o código-fonte dos seus componentes de interface em vez de os importar de uma biblioteca de componentes ou de um tema de documentação já feito.
status: accepted
date: 2026-09-08
---

## Contexto

Uma camada de documentação é sobretudo interface: um cabeçalho, uma barra
lateral, um índice, blocos de código, uma caixa de pesquisa. Alguma coisa tem de
os desenhar, e essa escolha decide quanto um consumidor pode alterar sem
bifurcar.

Toda a proposta da camada é ser estendida em vez de gerada —
`extends: ['@kirchdev/duxt']`, e cada ficheiro continua substituível. Um tema cuja
aparência só fosse alcançável pelas opções em que o seu autor pensou contradiria
isso logo na primeira coisa que um consumidor quisesse diferente. A resolução de
camadas do Nuxt já dá ao consumidor a substituição ao nível do ficheiro — a
pergunta era o que deviam ser esses ficheiros.

## Decisão

A camada possui o código-fonte dos seus componentes. O shadcn-vue serve de fonte
das primitivas: a sua CLI escreve o código de um componente no repositório e, a
partir daí, o ficheiro pertence à camada e não a uma dependência. O
`components.json` aponta a CLI ao alias da própria camada, portanto acrescentar
uma primitiva é um comando, e o Tailwind fornece o estilo por baixo.

A paleta são propriedades personalizadas de CSS. Os componentes leem tokens e não
guardam cores, que é o que faz uma substituição de uma linha chegar a todas as
superfícies.

## Consequências

Um consumidor pode alterar qualquer parte da interface, à profundidade que a
alteração exigir: redefinir um token, sombrear um componente pelo nome ou
acrescentar uma primitiva própria. Nada disso exige uma bifurcação, e nada espera
que a camada exponha uma opção para o efeito.

O custo é a manutenção. Uma correção a uma primitiva não chega com uma subida de
versão — chega quando alguém volta a correr a CLI para esse componente. A camada
assume isso pelas primitivas que entrega; um consumidor que substitui uma assume-o
a partir de então. É em torno dessa troca que o guia de substituição está
construído, e é a razão de ele existir.

Os ficheiros copiados que a CLI não alcança são o gume da mesma troca: uma folha
de estilo sem entrada de registo só pode ser atualizada descarregando-a de novo,
pelo que as alterações locais se perdem em silêncio em vez de colidirem
ruidosamente.

## Alternativas consideradas

**Um tema de documentação já feito.** O Docus é o encaixe óbvio — o tema do próprio
Nuxt Content, e tudo o que um site de documentação precisa no primeiro arranque.
Rejeitado pela mesma razão que o torna atraente: o site que produz é o do seu
autor, e remodelá-lo significa ou uma opção que existe ou uma bifurcação. Uma
camada cujos consumidores deviam distinguir-se uns dos outros não podia aceitar
esse teto.

**Uma biblioteca de componentes como dependência.** O Nuxt UI teria fornecido as
primitivas sem a manutenção, e a camada teria acompanhado as suas versões em vez
de copiar código. Rejeitado porque os componentes de uma dependência só se podem
alterar até onde as suas props permitem, e a camada teria então de inventar um
segundo mecanismo de substituição para o resto — com dois, nenhum seria o óbvio a
que recorrer.

**Componentes escritos à mão, sem upstream nenhum.** Isto elimina por completo a
questão da dependência e foi rejeitado pelo custo: as primitivas acessíveis são
difíceis exatamente nos pontos em que é fácil errar, e uma caixa de diálogo ou uma
combobox escritas de raiz seriam piores do que uma adaptada de uma fonte que já
resolveu o problema.
