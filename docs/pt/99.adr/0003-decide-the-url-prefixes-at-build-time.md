---
title: Decidir os prefixos de URL em tempo de compilação
description: Se um segmento de repositório ou de versão aparece é decidido pela lista de fontes antes do primeiro pedido, nunca por pedido.
status: accepted
date: 2026-09-06
---

## Contexto

Um site construído a partir de várias fontes tem de servir um segmento de
repositório e um segmento de versão nos seus URL, e um site construído a partir
de uma só pasta não pode — ninguém quer `/my-project/main/guides/deploying` para
um projeto com uma única pasta de documentação sem versões.

Tornar cada segmento opcional por pedido não funciona. Com ambos opcionais, o
primeiro segmento de `/guides/…` podia ser uma pasta, um repositório ou uma
versão, e só consultando os três se saberia qual. Essa ambiguidade não é um
incómodo de encaminhamento; faz o significado de um URL depender do que por
acaso existe.

## Decisão

Cada prefixo é ligado **para o site inteiro, em tempo de compilação, a partir da
lista de fontes**: um segmento de repositório assim que há mais do que um
repositório publicado ou uma opção o forçar, um segmento de versão assim que uma
fonte publica mais do que uma ref ou uma opção o forçar. Uma ref por repositório
é servida sem segmento de versão nenhum.

## Consequências

A forma de cada URL fica fixada antes do primeiro pedido, por isso o router
nunca adivinha e uma ligação escrita numa página pode ser resolvida por uma
verificação na compilação em vez de por tentativa.

Uma única pasta sem versões serve caminhos que não denunciam que repositórios ou
versões sequer existem, e é isso que torna gratuito o caso mais simples.

Passar um site de uma fonte para duas muda todos os URL que serve. Isso é uma
migração, e é a maquinaria de redirecionamentos que a torna suportável.

Resta uma colisão que não se consegue projetar para fora: uma pasta de
documentação com o nome de um repositório ou de um segmento de versão, onde o
prefixo ganha e a pasta fica inalcançável. A compilação rejeita-a com uma
mensagem em vez de a resolver em silêncio para um dos lados.

Como o prefixo de uma página só é conhecido pela compilação, as ligações dentro
das páginas são escritas como caminhos de documentação nus e resolvidas contra a
fonte da página quando são apresentadas. Uma página que fixa o seu próprio
prefixo está correta em exatamente um site.
