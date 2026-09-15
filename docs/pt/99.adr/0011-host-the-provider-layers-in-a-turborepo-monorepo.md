---
title: Alojar as camadas fornecedoras num monorepo Turborepo
description: A camada passa para packages/duxt e o site para apps/www, cada pacote publicado versiona e marca por si como <name>@vX.Y.Z, e a decisão de repositórios próprios registada em #74 e #75 fica substituída.
status: accepted
date: 2026-09-15
---

## Contexto

#74 e #75 decidiram cada uma que os fornecedores de pesquisa oficiais são
publicados como camadas complementares independentes **em repositórios
próprios** — `@kirchdev/duxt-typesense`, `@kirchdev/duxt-meilisearch`. Nenhum
desses repositórios existe, e aqui um novo repositório open source não está a um
comando de distância: é aprovisionado via OpenTofu e depois carrega toda a camada
meta sozinho — stubs de workflows, release-please, Dependabot, CodeQL, uma
licença, um README e uma configuração de agentes. É o preço permanente de dois
adaptadores finos sobre exatamente um hook de compilação.

O contrato que ambos consomem, `duxt:search:records`, vive neste repositório.
Repartido por três, cada alteração tornar-se-ia uma dança de versões — subir a
camada, publicar, alargar o intervalo de cada fornecedor, publicar — sem uma única
barreira que execute o hook contra um consumidor. O site de desenvolvimento não
podia experimentar um fornecedor sem depender de uma versão publicada.

O repositório estava ainda talhado para um só pacote: a sua raiz **era** a
camada, e trinta módulos de compilação ficavam soltos ao lado da configuração
meta, separados dela apenas por uma lista `files`.

## Decisão

**Um repositório, um workspace pnpm conduzido por Turborepo.**

- `packages/duxt` é `@kirchdev/duxt`. Os seus módulos de compilação saem da raiz
  plana para pastas temáticas sob `build/` — `sources/`, `sections/`, `bruno/`,
  `openapi/`, `search/`, `content/`, `og-image/`, `git/`, `config/`, `cli/` — e a
  lista `files` encolhe para diretórios. O mapa `exports` mantém todos os nomes
  de subcaminho.
- `apps/www` é o site que desenvolve a camada, com as verificações que leem a sua
  compilação.
- A raiz não é um pacote. Mantém a configuração do workspace e a meta, e
  `docs/`, que `apps/www` publica.
- Os pacotes fornecedores chegam ao lado da camada como
  `packages/duxt-typesense` e `packages/duxt-meilisearch`, com #74 e #75.

**Cada pacote publicado é a sua própria unidade de versão.** O release-please
corre em modo manifesto com uma entrada por pacote, cada uma com a sua versão e o
seu changelog, e uma versão publica apenas os pacotes que incrementou. Uma versão
partilhada foi rejeitada, porque republica pacotes inalterados com um número novo.

**Cada pacote marca `<name>@vX.Y.Z`, a camada incluída** —
`include-component-in-tag` com `tag-separator: "@"`, de modo que `duxt@v0.5.0`
fica ao lado de `duxt-typesense@v0.1.0`. A versão em si continua a ser um número
simples em `package.json` e no npm. As tags simples `v0.1.0`…`v0.4.0` ficam como
estão, e `last-release-sha` aponta uma vez para o commit da versão `v0.4.0`, para
que o release-please encontre a versão anterior da camada apesar do novo padrão.

**O changelog da camada fica na raiz do repositório**, como
`changelog-path: "/CHANGELOG.md"`. O site publica o changelog de cada versão que
serve, lido no checkout dessa versão, e todas as tags existentes têm o ficheiro
aí. Mudá-lo para o pacote teria deixado cada edição anterior sem as suas páginas
de versões. O changelog de um fornecedor vive no seu próprio diretório; não tem
histórico a preservar.

**O versionamento por tags do duxt aprende as tags por componente**, e tem de
chegar antes da primeira versão após a mudança. `latest`, a descoberta de versões
e a ordem do seletor leem `<name>@vX.Y.Z` como `vX.Y.Z`; a etiqueta e o segmento
de URL mostram apenas a versão; e uma fonte pode nomear um `tagComponent` para se
limitar às tags de um pacote, com as tags simples a contar como o seu histórico
anterior. Sem isto, `latest` em `apps/www` teria ficado em `v0.4.0` depois de
`duxt@v0.5.0` sem que nenhuma compilação falhasse.

**Quem decide uma publicação é o registo.** Um pacote é publicado quando a sua
versão tem uma tag `<component>@v<version>` e o npm não tem essa versão. O
`_publish-npm.yml` central publica a raiz do repositório e o
`_release-please.yml` central só reencaminha as saídas do pacote raiz, por isso
os jobs de publicação são do próprio repositório até os corpos centrais aceitarem
um diretório de trabalho.

**Os fornecedores dependem como peer de `@kirchdev/duxt` com um intervalo largo,
`>=0.4.0 <1`**, com o limite inferior no que o fornecedor precisar primeiro —
nunca `^0.x`, que obrigaria cada fornecedor a publicar a cada minor da camada. A
barreira do monorepo é o que prova a compatibilidade, e o limite inferior só sobe
quando o contrato do hook muda de forma incompatível.

**A cache do Turborepo é apenas local** — sem cache remota, sem conta, sem token.
Uma tarefa só é guardada em cache onde as suas entradas declaradas determinam o
resultado: os testes unitários sim; o typecheck, a compilação e cada verificação
sobre uma compilação resolvem `latest` contra um remoto e não.

## Consequências

A decisão de repositórios próprios registada em #74 e #75 fica substituída; essas
issues constroem aqui os seus pacotes fornecedores.

Cada caminho relativo à camada mudou, e nenhum se resolve como se lê, pelo que a
mudança vale o que valer a sua verificação: a barreira completa, uma compilação
para Workers com a verificação da classificação de rotas e o tarball empacotado
instalado num consumidor de teste.

Uma alteração ao contrato do hook e aos seus consumidores chega agora num único
pull request atrás de uma única barreira, e o site de desenvolvimento pode usar um
fornecedor como dependência do workspace.

Um monorepo que marca com release-please pode apontar o duxt às suas próprias
tags, o que torna o suporte a tags com prefixo uma funcionalidade para
consumidores e não apenas uma comodidade deste repositório.

Os caminhos dos registos anteriores descrevem a estrutura do seu tempo. Não são
reescritos, porque estes registos só se acrescentam.
