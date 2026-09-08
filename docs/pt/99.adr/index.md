---
title: Decisões de arquitetura
description: O registo de decisões — todas as decisões de arquitetura registadas para o duxt.
icon: lucide:gavel
---

Uma decisão merece um ADR quando condiciona o trabalho que vem depois e o seu
raciocínio se perderia de outro modo: uma escolha entre alternativas reais, uma
convenção que todas as partes do projeto têm de seguir, um compromisso que parece
um erro até se conhecer a razão. Os registos só admitem acrescentos — uma decisão
revertida escreve-se como um novo ADR que substitui o antigo, nunca como uma
edição dele.

| ADR                                                                        | Decisão                                                               | Estado   | Data       |
| :------------------------------------------------------------------------- | :-------------------------------------------------------------------- | :------- | :--------- |
| [ADR-0001](/adr/0001-build-duxt-as-a-layer-carrying-a-module)              | Construir o duxt como uma camada que transporta um módulo             | accepted | 2026-09-06 |
| [ADR-0002](/adr/0002-generate-the-collections-from-one-source-list)        | Gerar as coleções a partir de uma só lista de fontes                  | accepted | 2026-09-06 |
| [ADR-0003](/adr/0003-decide-the-url-prefixes-at-build-time)                | Decidir os prefixos de URL em tempo de compilação                     | accepted | 2026-09-06 |
| [ADR-0004](/adr/0004-render-markdown-components-with-mdc)                  | Desenhar os componentes Markdown com MDC                              | accepted | 2026-09-06 |
| [ADR-0005](/adr/0005-ship-the-layer-without-owner-specific-links)          | Entregar a camada sem ligações específicas do proprietário            | accepted | 2026-09-06 |
| [ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime) | Recompilar de forma agendada em vez de atualizar em tempo de execução | accepted | 2026-09-06 |
| [ADR-0007](/adr/0007-serve-translations-as-collections-of-their-own) | Servir as traduções como coleções próprias | accepted | 2026-09-06 |
| [ADR-0008](/adr/0008-build-the-theme-on-owned-shadcn-vue-components) | Construir o tema sobre componentes shadcn-vue próprios | accepted | 2026-09-08 |
| [ADR-0009](/adr/0009-take-the-seo-stack-from-the-nuxt-seo-bundle) | Tirar a base de SEO do pacote Nuxt SEO | accepted | 2026-09-08 |
