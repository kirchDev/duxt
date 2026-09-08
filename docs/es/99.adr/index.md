---
title: Decisiones de arquitectura
description: El registro de decisiones — toda decisión de arquitectura registrada para duxt.
icon: lucide:gavel
---

Una decisión se gana un ADR cuando limita el trabajo que viene después y su
razonamiento se perdería de otro modo: una elección entre alternativas reales,
una convención que toda parte del proyecto tiene que seguir, un compromiso que
parece un error hasta que se conoce el motivo. Los registros son de solo
añadido — una decisión revertida se escribe como un ADR nuevo que sustituye al
anterior, nunca como una edición de este.

| ADR                                                                        | Decisión                                                                  | Estado   | Fecha      |
| :------------------------------------------------------------------------- | :------------------------------------------------------------------------ | :------- | :--------- |
| [ADR-0001](/adr/0001-build-duxt-as-a-layer-carrying-a-module)              | Construir duxt como una capa que lleva un módulo                          | accepted | 2026-09-06 |
| [ADR-0002](/adr/0002-generate-the-collections-from-one-source-list)        | Generar las colecciones a partir de una sola lista de fuentes             | accepted | 2026-09-06 |
| [ADR-0003](/adr/0003-decide-the-url-prefixes-at-build-time)                | Decidir los prefijos de URL en tiempo de compilación                      | accepted | 2026-09-06 |
| [ADR-0004](/adr/0004-render-markdown-components-with-mdc)                  | Renderizar los componentes de Markdown con MDC                            | accepted | 2026-09-06 |
| [ADR-0005](/adr/0005-ship-the-layer-without-owner-specific-links)          | Publicar la capa sin enlaces específicos del propietario                  | accepted | 2026-09-06 |
| [ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime) | Recompilar según un calendario en vez de refrescar en tiempo de ejecución | accepted | 2026-09-06 |
| [ADR-0007](/adr/0007-serve-translations-as-collections-of-their-own) | Servir las traducciones como colecciones propias | accepted | 2026-09-06 |
| [ADR-0008](/adr/0008-build-the-theme-on-owned-shadcn-vue-components) | Construir el tema sobre componentes shadcn-vue propios | accepted | 2026-09-08 |
| [ADR-0009](/adr/0009-take-the-seo-stack-from-the-nuxt-seo-bundle) | Tomar la base de SEO del paquete Nuxt SEO | accepted | 2026-09-08 |
