---
title: Tirar a base de SEO do pacote Nuxt SEO
description: A camada instala o @nuxtjs/seo e entrega-lhe as etiquetas de head e os dados estruturados que antes escrevia à mão, guardando apenas as regras que dependem de versões e traduções.
status: accepted
date: 2026-09-08
---

## Contexto

A camada já distribuía três dos módulos do Nuxt SEO — robots, sitemap e imagem OG
—, escolhidos um a um à medida que cada necessidade surgia. Tudo o que eles não
cobrem estava escrito à mão: uma ligação canónica, um bloco `og:`/`twitter:` por
página e um `@graph` de JSON-LD montado dentro de um literal de modelo em
`[...slug].vue`.

Funcionava e era invisível. É aí que está o problema: nada disso estava coberto
por um teste, porque o SEO vive no HTML renderizado e não na lógica, e os testes
deste repositório cobrem deliberadamente apenas lógica pura. A página inicial — a
que mais provavelmente é partilhada — não tinha cartão social nenhum, a página de
erro era indexável e sete idiomas eram publicados sem um único `og:locale`. Cada
uma dessas falhas era uma omissão que ninguém conseguia ver.

A metade escrita à mão era também a que cresce. Os dados estruturados são uma
especificação de superfície ampla e com validadores próprios; cada nó acrescentado
à mão é um nó cuja forma é preciso acertar lendo a especificação.

## Decisão

A camada depende do `@nuxtjs/seo` e carrega-o como um único módulo, no lugar onde
estavam os três módulos nomeados — antes do `@nuxt/content`, porque a integração
do sitemap com o Content assim o exige.

O pacote é um alias, não um invólucro: a sua própria documentação afirma que «não
contém lógica própria». O que traz são os quatro módulos que faltavam —
`nuxt-schema-org` para o grafo, `nuxt-seo-utils` para a canónica automática e as
etiquetas sociais derivadas, `nuxt-link-checker`, e `nuxt-site-config` como o
único sítio de onde se lê `site.url` — mais o painel partilhado de devtools, que
dá conta dos que estiverem instalados.

Três predefinições do `nuxt-seo-utils` ficam desligadas, cada uma por uma razão
que a camada não consegue contornar por desenho: `canonicalLowercase`, porque um
prefixo de idioma distingue maiúsculas e `/de-DE/` não é `/de-de/`;
`fallbackTitle`, porque um título inventado a partir de um slug taparia o
validador de compilação que falha perante uma página sem título; e
`mergeWithSiteConfig`, porque o `app.vue` é dono do modelo do título.

Continua escrito à mão aquilo que os módulos não podem saber: a canónica de uma
página versionada aponta para a versão atual e não para a página que está a ser
renderizada, e `noindex` decorre de uma versão ser antiga ou de uma página ser
servida num idioma para o qual não foi traduzida.

A verificação de ligações relata em vez de falhar. O `modules/validate.ts` já faz
uma compilação falhar perante uma ligação que não leva a lado nenhum, e é a
verificação que percebe versões e recuos de idioma.

## Consequências

Cada consumidor da camada instala sete módulos onde instalava três. É o preço da
decisão, e é pago também por sítios que não usem nenhum dos quatro novos.

As regras que antes eram afirmações num comentário são agora asserções em
`scripts/check-seo.ts`, que lê as páginas construídas e falha perante uma segunda
canónica, um `hreflang` em falta, uma página de erro indexável ou um grafo que
não se analisa. Corre no `check` ao lado do `check:a11y`, pela mesma razão: estas
etiquetas só existem no HTML renderizado.

Duas dessas regras não eram sequer verificáveis antes, porque só existem quando o
sítio conhece a sua própria origem, e o `www` não declara domínio nenhum de
propósito. A verificação entrega então ao servidor construído o seu próprio
endereço, através das variáveis de ambiente que os módulos já leem, em vez de um
domínio fixado numa configuração que um consumidor copiaria.

Publicar uma `Organization` exige um facto que a camada não deve inventar, pelo
que fica à espera de uma nova chave `duxt.organization` e permanece ausente até
que um consumidor a preencha — a mesma postura da ADR-0005.

## Alternativas consideradas

**Manter os três módulos e acrescentar só o `nuxt-schema-org`.** A alteração mais
estreita, descartada pela canónica: a regra de versão e a canónica automática têm
de ser conciliadas de qualquer forma, e fazê-lo sem o `nuxt-seo-utils` significa
manter o bloco `og:`/`twitter:` escrito à mão que já tinha sido esquecido em duas
páginas.

**Escrever os dados estruturados à mão e mantê-los.** Funcionava, não tinha
dependência, e foi descartado porque o grafo já era a parte com mais
probabilidade de estar errada e menos de dar nas vistas — e porque uma segunda
página a pedir um segundo nó teria significado uma segunda cópia da identidade do
sítio embutida nela.

**Deixar o verificador de ligações partir a compilação.** Descartado porque dois
guardiões sobre uma mesma regra deixam o mais permissivo decidir quando uma
compilação parte. A verificação que percebe as versões e os recuos de idioma
desta camada é a sua própria.
