---
title: Tomar la base de SEO del paquete Nuxt SEO
description: La capa instala @nuxtjs/seo y le cede las etiquetas de head y los datos estructurados que antes escribía a mano, conservando solo las reglas que dependen de versiones y traducciones.
status: accepted
date: 2026-09-08
---

## Contexto

La capa ya distribuía tres de los módulos de Nuxt SEO — robots, sitemap e imagen
OG —, elegidos uno a uno según fue apareciendo cada necesidad. Todo lo que ellos
no cubren estaba escrito a mano: un enlace canónico, un bloque `og:`/`twitter:`
por página y un `@graph` de JSON-LD montado dentro de una plantilla de cadena en
`[...slug].vue`.

Funcionaba y era invisible. Ahí está el problema: nada de ello estaba cubierto
por una prueba, porque el SEO vive en el HTML renderizado y no en la lógica, y
las pruebas de este repositorio cubren deliberadamente solo lógica pura. La
página de inicio — la que más probablemente se comparte — no tenía tarjeta social
alguna, la página de error era indexable y siete idiomas se publicaban sin un
solo `og:locale`. Cada una de esas carencias era una omisión que nadie podía ver.

La mitad escrita a mano era además la que crece. Los datos estructurados son una
especificación de superficie amplia y con validadores propios; cada nodo añadido
a mano es un nodo cuya forma hay que acertar leyendo la especificación.

## Decisión

La capa depende de `@nuxtjs/seo` y lo carga como un solo módulo, en el lugar que
ocupaban los tres módulos nombrados — antes de `@nuxt/content`, porque así lo
exige la integración de la sitemap con Content.

El paquete es un alias, no un envoltorio: su propia documentación afirma que «no
contiene lógica propia». Lo que aporta son los cuatro módulos que faltaban —
`nuxt-schema-org` para el grafo, `nuxt-seo-utils` para el canónico automático y
las etiquetas sociales derivadas, `nuxt-link-checker`, y `nuxt-site-config` como
el único lugar del que se lee `site.url` — más el panel compartido de devtools,
que informa sobre los que estén instalados.

Se desactivan tres de los valores por defecto de `nuxt-seo-utils`, cada uno por
una razón que la capa no puede eludir por diseño: `canonicalLowercase`, porque un
prefijo de idioma distingue mayúsculas y `/de-DE/` no es `/de-de/`;
`fallbackTitle`, porque un título inventado a partir de un slug taparía el
validador de compilación que falla ante una página sin título; y
`mergeWithSiteConfig`, porque `app.vue` es dueño de la plantilla del título.

Sigue escrito a mano lo que los módulos no pueden saber: el canónico de una
página versionada apunta a la versión actual y no a la página que se está
renderizando, y `noindex` se sigue de que una versión sea antigua o de que una
página se sirva en un idioma al que no fue traducida.

La comprobación de enlaces informa en lugar de fallar. `modules/validate.ts` ya
hace fallar una compilación ante un enlace que no lleva a ninguna parte, y es la
comprobación que entiende versiones y respaldos de idioma.

## Consecuencias

Cada consumidor de la capa instala siete módulos donde instalaba tres. Ese es el
precio de la decisión y lo pagan también los sitios que no usen ninguno de los
cuatro nuevos.

Las reglas que antes eran afirmaciones en un comentario son ahora aserciones en
`scripts/check-seo.ts`, que lee las páginas construidas y falla ante un segundo
canónico, un `hreflang` ausente, una página de error indexable o un grafo que no
se puede analizar. Se ejecuta en `check` junto a `check:a11y`, por el mismo
motivo: las etiquetas existen solo en el HTML renderizado.

Dos de esas reglas no podían comprobarse antes, porque solo existen cuando el
sitio conoce su propio origen, y `www` deliberadamente no declara dominio alguno.
La comprobación le entrega al servidor construido su propia dirección mediante
las variables de entorno que los módulos ya leen, en lugar de un dominio fijado
en una configuración que un consumidor copiaría.

Publicar una `Organization` exige un dato que la capa no debe inventar, así que
espera a una nueva clave `duxt.organization` y permanece ausente hasta que un
consumidor la rellene — la misma postura que la ADR-0005.

## Alternativas consideradas

**Conservar los tres módulos y añadir solo `nuxt-schema-org`.** El cambio más
estrecho, descartado por el canónico: la regla de versión y el canónico
automático deben reconciliarse de todos modos, y hacerlo sin `nuxt-seo-utils`
significa conservar el bloque `og:`/`twitter:` escrito a mano que ya se había
olvidado en dos páginas.

**Escribir los datos estructurados a mano y conservarlos.** Funcionaba, no tenía
dependencia y se descartó porque el grafo ya era la parte con más probabilidad de
estar mal y menos de notarse — y porque una segunda página con un segundo nodo
habría supuesto una segunda copia de la identidad del sitio incrustada en ella.

**Dejar que el verificador de enlaces rompa la compilación.** Descartado porque
dos guardianes sobre una misma regla hacen que decida el más laxo cuándo se rompe
una compilación. La comprobación que entiende las versiones y los respaldos de
idioma de esta capa es la suya propia.
