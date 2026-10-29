---
title: Carregar os módulos Nuxt SEO pelo nome
description: A camada deixa o pacote @nuxtjs/seo e carrega pelo nome os sete módulos que usa, porque a v6 do pacote acrescenta módulos que duplicam o llms.txt, o Markdown e o MCP da própria camada. Substitui a forma como a ADR-0009 os instala, não a escolha.
status: accepted
date: 2026-10-29
---

## Contexto

A ADR-0009 tirou a base de SEO de `@nuxtjs/seo`: robots, sitemap, imagem OG,
schema.org, os utilitários de SEO, o verificador de ligações e o site config,
instalados através de um pacote que «não contém lógica própria».

A versão 6 do pacote instala mais dois módulos. `nuxt-ai-ready` serve
`llms.txt`, `llms-full.txt`, versões em Markdown de cada página e as suas
próprias ferramentas MCP — exatamente a superfície para a qual esta camada
existe, através de fontes, versões e idiomas. Carregado ao lado da da camada,
reclama as mesmas rotas, e as suas ferramentas MCP precisam de uma base de dados
que a camada não inclui: a compilação falha a pedir `drizzle-orm`.
`nuxt-skew-protection` chega com ele sem ser pedido.

Um site que estende a camada herda todos os módulos que a camada carrega. Um
pacote que cresce a cada versão maior faz crescer cada consumidor sem que a
camada tenha decidido nada.

## Decisão

A camada depende dos sete módulos escolhidos pela ADR-0009 e carrega-os pelo
nome, pela ordem em que o pacote os instala — `@nuxtjs/robots`,
`@nuxtjs/sitemap`, `nuxt-link-checker`, `nuxt-og-image`, `nuxt-schema-org`,
`nuxt-seo-utils`, `nuxt-site-config` —, ainda antes de `@nuxt/content`, por
causa da integração de Content do sitemap.

Quais módulos e como são configurados mantém-se como a ADR-0009 decidiu. Só
muda a instalação: pelo nome em vez de através do pacote.

## Consequências

A camada carrega sete dependências onde carregava uma, e as suas versões têm de
avançar juntas; antes, as verificações de versão do pacote avisavam quando não o
faziam. Um novo módulo da família Nuxt SEO só chega à camada quando alguém o
acrescenta de propósito.

O painel partilhado do devtools mostra como em falta os módulos do pacote que a
camada não carrega. É a visão do painel sobre o pacote, não uma falha do site.

## Alternativas consideradas

**Manter o pacote e desligar `nuxt-ai-ready`.** Uma linha, e compila. Rejeitada
porque o próximo módulo que o pacote acrescentar voltaria a chegar em silêncio a
cada consumidor, e `nuxt-skew-protection` continuaria a chegar.

**Substituir as rotas próprias de llms.txt, Markdown e MCP da camada por
`nuxt-ai-ready`.** Abdicaria do que a camada acrescenta — fontes, versões e
idiomas em cada uma dessas superfícies — em troca de menos código.

**Ficar na v5 do pacote.** Também prende o sitemap na sua versão maior antiga e
apenas adia a mesma decisão.
