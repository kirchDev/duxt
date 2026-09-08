---
title: Construir o duxt como uma camada que transporta um módulo
description: Distribuir o tema como uma camada Nuxt cuja raiz é o pacote, e não como um modelo inicial.
status: accepted
date: 2026-09-06
---

## Contexto

Um tema de documentação pode ser distribuído de duas maneiras. Um **modelo
inicial** é gerado dentro do repositório de quem o consome, onde cada ficheiro
passa a ser seu para editar e nenhuma melhoria lhe volta a chegar a não ser como
um diff que alguém aplica à mão. Uma **camada** continua a ser uma dependência:
quem a consome estende-a, substitui os ficheiros de que discorda, e leva o resto
das melhorias com um salto de versão.

Parte do que o tema tem de fazer não é algo que uma camada consiga exprimir como
ficheiros. Gerar coleções, resolver uma lista de fontes em prefixos de URL,
transformar frontmatter em regras de rota e validar o resultado é trabalho de
tempo de compilação, e trabalho de tempo de compilação no Nuxt é um módulo.

## Decisão

Distribuímos o duxt como uma **camada Nuxt que transporta os seus próprios
módulos**, consumida com uma entrada `extends`. A raiz do repositório *é* a
camada: a configuração do Nuxt, a configuração do Content e `app/` ficam na
raiz, e o manifesto do pacote aponta para eles, por isso
`extends: ['@kirchdev/duxt']` resolve sem passo de compilação. O site que a
consome vive ao lado dela no mesmo repositório e é o alvo de desenvolvimento.

## Consequências

Quem a consome herda tema, páginas, componentes, predefinições de configuração e
coleções, e substitui qualquer um deles criando um ficheiro com o mesmo nome.
Atualizar é um salto de versão.

Nada que seja relativo à camada resolve como se lê. Um caminho escrito na camada
é lido a partir do diretório de quem a consome, a não ser que tenha sido
resolvido contra a localização da própria camada, e o alias `@` pertence a quem
estende a camada, não à camada — por isso as importações da própria camada
precisam de um alias próprio. Isto já custou bugs reais, e é o preço do arranjo
e não um descuido.

Os nomes substituíveis tornam-se superfície pública. Um componente, uma página
ou uma chave de configuração que quem a consome pode sombrear é um nome do qual
depende, por isso renomear um é um lançamento incompatível, e é a superfície
documentada que o fixa.

O site de desenvolvimento e um modelo inicial são artefactos separados. O site
ao lado da camada quer casos-limite, frontmatter feio, várias fontes e uma tag
de onde ler; um estranho que clone um modelo inicial quer o contrário.
Confundi-los tornaria um dos dois mau.

## Alternativas consideradas

**Um modelo inicial.** Liberdade total para quem o consome, nenhum caminho de
atualização para ninguém — a razão por que a camada ganhou.

**Um módulo sem camada.** Um módulo consegue registar componentes e rotas, mas a
substância do tema são ficheiros que quem a consome tem de conseguir sombrear, e
entregá-los através de um módulo significa injetá-los em vez de deixar a
resolução de camadas do próprio Nuxt fazê-lo.
