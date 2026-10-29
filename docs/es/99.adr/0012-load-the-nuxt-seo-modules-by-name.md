---
title: Cargar los módulos de Nuxt SEO por nombre
description: La capa deja el paquete @nuxtjs/seo y carga por nombre los siete módulos que usa, porque la v6 del paquete añade módulos que duplican el llms.txt, el Markdown y el MCP de la propia capa. Sustituye cómo los instala ADR-0009, no cuáles.
status: accepted
date: 2026-10-29
---

## Contexto

ADR-0009 tomó la base de SEO de `@nuxtjs/seo`: robots, sitemap, imagen OG,
schema.org, las utilidades de SEO, el comprobador de enlaces y site config,
instalados mediante un paquete que «no contiene lógica propia».

La versión 6 del paquete instala dos módulos más. `nuxt-ai-ready` sirve
`llms.txt`, `llms-full.txt`, versiones en Markdown de cada página y sus propias
herramientas MCP: justo la superficie para la que existe esta capa, a través de
fuentes, versiones e idiomas. Cargado junto a la de la capa, reclama las mismas
rutas, y sus herramientas MCP necesitan una base de datos que la capa no incluye:
la compilación falla pidiendo `drizzle-orm`. `nuxt-skew-protection` llega con él
sin que nadie lo pida.

Un sitio que extiende la capa hereda todos los módulos que la capa carga. Un
paquete que crece con cada versión mayor hace crecer a cada consumidor sin que la
capa haya decidido nada.

## Decisión

La capa depende de los siete módulos que eligió ADR-0009 y los carga por nombre,
en el orden en que los instala el paquete —`@nuxtjs/robots`, `@nuxtjs/sitemap`,
`nuxt-link-checker`, `nuxt-og-image`, `nuxt-schema-org`, `nuxt-seo-utils`,
`nuxt-site-config`—, todavía antes de `@nuxt/content`, por la integración de
Content del sitemap.

Qué módulos y cómo se configuran sigue como lo decidió ADR-0009. Solo cambia la
instalación: por nombre en lugar de mediante el paquete.

## Consecuencias

La capa lleva siete dependencias donde llevaba una, y sus versiones tienen que
avanzar juntas; antes, las comprobaciones de versión del paquete avisaban cuando
no lo hacían. Un módulo nuevo de la familia Nuxt SEO solo llega a la capa cuando
alguien lo añade a propósito.

El panel compartido de devtools muestra como ausentes los módulos del paquete que
la capa no carga. Es la vista del panel sobre el paquete, no un fallo del sitio.

## Alternativas consideradas

**Mantener el paquete y desactivar `nuxt-ai-ready`.** Una línea, y compila. Se
descartó porque el siguiente módulo que añada el paquete volvería a llegar en
silencio a cada consumidor, y `nuxt-skew-protection` seguiría llegando.

**Sustituir las rutas propias de llms.txt, Markdown y MCP de la capa por
`nuxt-ai-ready`.** Renunciaría a lo que la capa aporta por encima de él —fuentes,
versiones e idiomas en cada una de esas superficies— a cambio de menos código.

**Quedarse en la v5 del paquete.** También deja el sitemap en su versión mayor
antigua y solo aplaza la misma decisión.
