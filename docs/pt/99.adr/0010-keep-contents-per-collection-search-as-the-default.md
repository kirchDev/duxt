---
title: Manter a pesquisa por coleção do Content como padrão
description: Um único índice sobre todas as fontes foi medido contra a pesquisa de um índice por coleção do Content e não é o padrão da camada; o hook de compilação transforma-o antes numa camada fornecedora.
status: accepted
date: 2026-09-12
---

## Contexto

A pesquisa é um índice por coleção. `useDuxtSearch()` chama o
`useSearchCollection()` do Content uma vez por fonte ativa, o que descarrega o
`sql_dump.txt` dessa coleção e constrói um índice FTS5 no navegador sobre SQLite
em WASM. Desta única forma decorrem três queixas:

- **A carga cresce com o modelo.** Um despejo por coleção ativa, e as coleções
  multiplicam-se como fontes × versões × idiomas. O multi-fonte é a proposta do
  duxt, e a pesquisa paga-a linearmente.
- **As fontes não podem ser classificadas umas contra as outras.** Cada base de
  dados classifica dentro de si própria, por isso `interleave()` alterna as
  listas por fonte: a posição é a única coisa comparável que existe.
- **Sem tolerância a gralhas no caminho principal.** O FTS5 casa termos e
  prefixos, nunca aproximações, pelo que `useFuzzySearch()` mantém um segundo
  índice sobre as mesmas secções e carrega a cada falha.

O [Pagefind](https://pagefind.app/) responde em princípio às três: um índice
fatiado do qual o navegador só busca uma parte, uma lista classificada única com
filtros e — como padrão do Starlight — a resposta do projeto mais comparável. A
sua API de Node aceita registos em vez de HTML compilado, pelo que
`addCustomRecord` consome `duxt:search:records` diretamente e a camada nunca tem
de exigir uma estratégia de renderização aos sites que a estendem.

Foi medido em vez de discutido, sobre o conteúdo real de `www/`: 33 coleções,
2.918 páginas, **11.937 registos** em cinco idiomas e quatro versões.
`scripts/search-index-bench.ts` calculou os números abaixo, e
`tests/search-index-bench.test.ts` fixa a regra pela qual foram lidos.

### O que a medição encontrou

**Carga — o Pagefind ganha, com clareza.** A primeira consulta de uma leitora em
inglês custa hoje **1.448 KB** (1.108 KB de SQLite em WASM e o seu worker, 340
KB de despejos nas sete coleções em causa) e todas as seguintes são gratuitas. A
mesma consulta contra um índice Pagefind custa **150 KB**, e cada seguinte **13
KB**. Mesmo descontando por completo o motor de base de dados — o Content
carrega-o a pedido, e um `queryCollection` no cliente ao mudar de rota também o
pode invocar — são 340 KB contra 150 KB, e os 340 KB são a metade que cresce com
cada fonte que um consumidor acrescenta, ao passo que os 150 KB não crescem.

**Classificação — o Pagefind ganha, por idioma.** Um índice sobre todas as
fontes devolveu uma única lista classificada, e os filtros saíram do contrato de
registos sem adaptação nenhuma: `source` continha `/`, `/demo`, `/demo/api`,
`/demo/changelog`, `/demo/changelog-flat`, `/demo/collection`, `/releases`,
`/tf`, e `version` continha `main`, `v0.1.0`, `v0.2.0`, `v0.2.6`, `v0.3.4`,
`v1.x`, `v2.x`, `v3.x`. `interleave()` desapareceria — para as fontes. Não
desapareceria de todo: o Pagefind indexa cada idioma em separado e seleciona um
em tempo de execução, a sua documentação não descreve forma de pesquisar dois em
conjunto, e `mergeIndex` contra o mesmo caminho base é ignorado, pelo que o
recuo entre idiomas de que depende uma página por traduzir continua a precisar
de uma segunda instância e de dois espaços de pontuação incomparáveis.

**Tolerância a gralhas — o Pagefind perde, e leva o recuo consigo.** O Pagefind
faz lematização por idioma e não tem correspondência difusa. `collecton` foi
salvo por prefixo até 360 resultados; `verison` — uma troca de letras —
devolveu **três páginas sem relação**. Isso é pior do que o comportamento FTS5
que substitui, porque não é um resultado vazio: `useDuxtSearch()` recorre ao
Fuse precisamente quando a passagem exata nada devolve, por isso três respostas
erradas são três razões para o recuo nunca disparar. O Fuse teria de ficar, e o
gatilho que o invoca teria de ser reescrito à volta de um fornecedor que
responde com aprumo e ao lado.

**Saída — um ficheiro por secção indexada.** O índice emitiu **12.066
ficheiros** e 6,80 MiB para 11.937 registos, um fragmento por secção, contra os
1.414 que uma compilação Cloudflare de `www/` escreve hoje. O Cloudflare Workers
limita uma versão a 20.000 ficheiros estáticos no plano gratuito. Um site de
documentação cujo índice cresce um ficheiro por secção, por fonte, por versão e
por idioma atinge esse limite com noventa páginas de material de origem, e quem
acrescentasse um idioma descobri-lo-ia num deploy falhado.

**O empacotamento não é obstáculo.** `pagefind@1.5.2` é MIT, entrega sete
binários pré-compilados como `optionalDependencies` que cobrem todas as
plataformas que `engines` promete, e não precisa de descarga em postinstall nem
de cadeia node-gyp — a fasquia que o `better-sqlite3` não passou. Indexar 11.937
registos levou 6,8 segundos e aos 10,0 o índice inteiro estava em memória. Nada
disto entra em conflito com
[ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime):
tudo acontece durante a compilação.

## Decisão

**A pesquisa por coleção do Content mantém-se como padrão da camada.** O
Pagefind não é adotado como aquilo que o duxt entrega.

Dos três problemas, um índice único resolve um por inteiro, outro apenas dentro
de um idioma, e o terceiro agrava-o — acrescentando ainda uma lei de crescimento
do número de ficheiros que colide com a plataforma onde o próprio site da camada
é publicado. Um padrão muda-se por um ganho claro, não por uma troca, e dois em
três é uma forma diferente, não uma melhor.

**O Pagefind continua disponível, como camada e não como padrão.**
`duxt:search:records` foi aberto exatamente para isto, e a medição confirmou que
o contrato não precisa de adaptação: `url`, `title`, `content`, `source`,
`version` e `locale` correspondem campo a campo a `addCustomRecord`, e os
filtros que saem são as identidades de fonte e as etiquetas de versão que o duxt
já calcula. Quem quiser um índice único escreve
`extends: ['@kirchdev/duxt', 'duxt-pagefind']` e paga o número de ficheiros de
forma consciente.

**A regra sobrevive ao candidato.** `searchIndexVerdict`, em
`scripts/search-index-bench.ts`, enuncia as seis condições que um substituto tem
de cumprir — carga sensivelmente menor, fontes classificadas em conjunto,
tolerância a gralhas preservada, apenas em tempo de compilação, binários que
cubram `engines` e saída dentro do limite de ficheiros do deploy — e devolve
aquelas que um candidato falha. O «não» deste ADR é um valor que essa função
devolve.

## Consequências

Os leitores mantêm uma pesquisa que descarrega mais e depois responde offline, e
mantêm a tolerância a gralhas que o Fuse dá. A queixa sobre a carga fica por
resolver: quem reúne muitas fontes continua a pagar por coleção ativa, e essa é
a razão mais forte para voltar ao assunto.

`interleave()` fica, e com ele o comentário que explica porque não há pontuações
comparáveis com que classificar.

Voltar ao assunto é barato e os termos estão escritos. Se o Pagefind ganhasse
correspondência difusa, ou emitisse fragmentos em menos ficheiros, duas
condições inverter-se-iam; um candidato que indexasse todos os idiomas num único
espaço pesquisável inverteria uma terceira. Corram de novo o banco de ensaio em
vez de reargumentar o caso — e registem um novo ADR que substitua este, porque
estes registos são apenas acrescentados.

Nada disto restringe um serviço externo. O Meilisearch e o Typesense respondem
às três queixas e nunca foram candidatos a *padrão*, porque um padrão não pode
exigir a um consumidor que opere ou compre um serviço; consomem o mesmo hook.
