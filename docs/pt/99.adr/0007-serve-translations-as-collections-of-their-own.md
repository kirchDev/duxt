---
title: Servir as traduções como coleções próprias
description: Acrescentar uma dimensão de locale a uma fonte, em vez de um segmento de locale ao caminho de conteúdo.
status: accepted
date: 2026-09-06
---

## Contexto

A camada traduzia a sua interface em sete locales e servia um só conjunto de
páginas a todos eles: `useDuxtPath()` retirava o segmento de locale antes de cada
consulta de conteúdo, por isso `/de-DE/guides/deploying` e `/guides/deploying`
resolviam para o mesmo ficheiro. O Content v3 não tem noção de locale — uma
coleção é uma árvore — por isso as páginas traduzidas precisavam de uma decisão e
não de uma opção de configuração.

O que os geradores comparáveis fazem foi lido, não presumido. Starlight,
VitePress, Docusaurus e MkDocs põem todos as traduções numa pasta por idioma; só
o Starlight tem um recurso documentado para uma página que falta a um idioma. A
partir de certa dimensão a tradução sai por completo da ferramenta: o React
mantém `de.react.dev` como repositório próprio, o Vue uma organização
`vuejs-translations` inteira, porque quem traduz trabalha ao seu próprio
calendário e à sua própria revisão. O OpenCode construiu um agente que traduzia a
sua documentação em CI, correu-o e desligou-o; dezassete idiomas ficaram parados
desde então.

O custo foi medido antes de a forma ser escolhida: compilações de 1 a 200
coleções escalam linearmente, a cerca de 2,2 s e 0,63 MB de base de dados cada,
sem nenhum joelho na curva. A matriz não tem um teto que forçasse a mão ao
desenho.

## Decisão

Uma fonte ganha uma lista `locales`, e uma ref também, resolvida como o `status`
já é (`ref.locales ?? source.locales`). Uma string é uma pasta dentro do `path`
da fonte; um objeto move esse idioma para uma pasta, um repositório ou uma ref
próprios.

**O locale por omissão é a própria árvore em `path`, sem pasta**, por isso
acrescentar a chave não move nenhum URL que um site já sirva.

**O locale não faz parte do caminho de conteúdo.** Pertence ao encaminhamento do
i18n, que de qualquer maneira o coloca à frente do caminho. Original e tradução
vivem por isso sob caminhos de conteúdo idênticos, em coleções separadas.

Uma página que falte num idioma recai ao longo de uma cadeia — o locale, a sua
língua base, uma região irmã, o `fallbackLocale` do vue-i18n, o original por
traduzir — e o leitor é informado, num banner, em que idioma lhe está a ser
mostrada.

## Consequências

Todas as comparações de caminhos no tema ficam intactas: a navegação, os
redirecionamentos, o trilho, a pontuação da página mais próxima do 404 e o
seletor de idioma continuam todos a funcionar sobre um caminho que nunca
transportou um locale. O recurso é mais uma consulta ao mesmo caminho, e não um
redirecionamento ou um segundo esquema de resolução.

`useDuxtNavigation` e a pesquisa seguem `useDuxtCollection`, por isso ambos
passaram a conhecer o locale sem serem alterados.

Um site que não define nada obtém exatamente o que tinha: uma coleção chamada
`docs`, uma entrada no manifesto, uma consulta por página.

Duas configurações podem agora divergir de uma maneira que produz uma página
vazia em vez de um erro — `content.config.ts` resolve o locale por omissão sem
acesso à configuração do Nuxt. O módulo duxt verifica por isso
`sourceOptions.defaultLocale` contra `i18n.defaultLocale` e faz falhar a
compilação quando divergem, em vez de injetar um no outro e deixar o Content a
calcular a outra resposta.

As traduções multiplicam as coleções, e a compilação paga por cada uma
linearmente. O número pertence à documentação, porque é quem a consome que decide
a matriz.

Os partials seguem as páginas. `_partials/` é uma coleção POR IDIOMA, nomeada
como as coleções de páginas — `duxt_partials` para o original, `duxt_partials_de`
ao lado — e `:partial{name}` percorre a mesma cadeia de recurso que a página
percorreu. Tem de ser a mesma cadeia: uma página e os blocos que ela inclui a
recorrerem a idiomas diferentes é exatamente como se chega a uma página meio
traduzida sem que nada o diga.

A primeira versão desta decisão partilhava UMA coleção de partials por traduzir
entre todos os idiomas. Era defensável enquanto nada traduzia um partial, e
deixou de o ser no momento em que uma passagem de tradução produziu
`docs/de/_partials/` — ficheiros que nenhuma coleção lia, e uma página alemã a
apresentar uma nota de instalação em inglês sem sinal nenhum de que tal tinha
acontecido.

## Alternativas consideradas

**Um segmento de locale no prefixo de conteúdo.** Simétrico com `repo` e
`version`, e teria obrigado todas as comparações de caminhos no tema a aprender
sobre locales — para um URL que o i18n já prefixa, e que ficaria assim escrito
duas vezes.

**Um sufixo no ficheiro — `installation.de-DE.md` ao lado do original.** Nenhuma
multiplicação de coleções, e falha no caso que os projetos grandes têm de facto:
obriga a tradução a viver no mesmo repositório e na mesma ref que o original.

**404 para uma tradução em falta.** O que o VitePress faz por não fazer nada.
Castiga o leitor por uma lacuna que quem escreveu deixou, e esconde de toda a
gente que a tradução está incompleta.
