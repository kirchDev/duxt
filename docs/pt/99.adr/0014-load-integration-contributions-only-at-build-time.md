---
title: Carregar contribuições de integração apenas na compilação
description: Manter os analisadores fora da configuração do cliente enquanto as camadas contribuem coleções e metadados.
status: accepted
date: 2026-11-07
---

# ADR-0014 — Carregar contribuições de integração apenas na compilação

## Contexto

Os analisadores e metadados têm de chegar à configuração do Content e aos módulos Nuxt. Contribuições executáveis na configuração de execução ligam o navegador às dependências de compilação. A navegação específica de um fornecedor também liga o seu dialeto ao tema.

## Decisão

Escolhemos um ficheiro exclusivo da compilação, descoberto pela resolução de camadas Nuxt, com prioridade para o site. As integrações incluídas usam o mesmo contrato. Os dialetos escrevem metadados genéricos de navegação; o núcleo ordena e agrupa páginas sem conhecer a sua origem.

## Consequências

Uma extensão pode ampliar o esquema sem impor os seus campos a outros sites. As atualizações de conteúdo mantêm o mesmo percurso de análise. Alterar o esquema exige uma nova imagem antes de publicar bundles compatíveis. Expusemos um único caminho instável de utilitários durante a avaliação da fronteira de extração, aceitando alterações antes da confirmação através de pacotes separados.
