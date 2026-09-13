---
title: Mantener la búsqueda por colección de Content como predeterminada
description: Un único índice sobre todas las fuentes se midió frente a la búsqueda de un índice por colección de Content y no es el valor predeterminado de la capa; el hook de compilación lo convierte en una capa proveedora.
status: accepted
date: 2026-09-12
---

## Contexto

La búsqueda es un índice por colección. `useDuxtSearch()` llama a
`useSearchCollection()` de Content una vez por fuente activa, lo que descarga el
`sql_dump.txt` de esa colección y construye un índice FTS5 en el navegador sobre
SQLite en WASM. De esa única forma se derivan tres quejas:

- **La carga crece con el modelo.** Un volcado por colección activa, y las
  colecciones se multiplican como fuentes × versiones × idiomas. El
  multi-origen es la propuesta de duxt, y la búsqueda lo paga linealmente.
- **Las fuentes no pueden clasificarse entre sí.** Cada base de datos clasifica
  dentro de sí misma, así que `interleave()` alterna las listas por fuente
  porque la posición es lo único comparable que hay.
- **Sin tolerancia a erratas en la vía principal.** FTS5 casa términos y
  prefijos, nunca aproximaciones, por lo que `useFuzzySearch()` mantiene un
  segundo índice sobre las mismas secciones y carga en cada fallo.

[Pagefind](https://pagefind.app/) responde en principio a las tres: un índice
troceado del que el navegador toma una porción, una única lista clasificada con
filtros y — como valor predeterminado de Starlight — la respuesta del proyecto
más comparable. Su API de Node acepta registros en lugar de HTML compilado, así
que `addCustomRecord` consume `duxt:search:records` directamente y la capa nunca
tiene que exigir una estrategia de renderizado a los sitios que la extienden.

Se midió en lugar de discutirse, sobre el contenido real de `www/`: 33
colecciones, 2.918 páginas, **11.937 registros** en cinco idiomas y cuatro
versiones. `scripts/search-index-bench.ts` calculó las cifras de abajo, y
`tests/search-index-bench.test.ts` fija la regla con la que se leyeron.

### Lo que encontró la medición

**Carga — Pagefind gana, y con claridad.** La primera consulta de una lectora en
inglés cuesta hoy **1.448 KB** (1.108 KB de SQLite en WASM y su worker, 340 KB
de volcados en las siete colecciones del ámbito) y todas las siguientes son
gratis. La misma consulta contra un índice de Pagefind cuesta **150 KB**, y cada
una posterior **13 KB**. Incluso descontando por completo el motor de base de
datos — Content lo carga bajo demanda, y un `queryCollection` en cliente al
cambiar de ruta también puede invocarlo — son 340 KB frente a 150 KB, y los 340
KB son la mitad que crece con cada fuente que añade un consumidor, mientras que
los 150 KB no lo hacen.

**Clasificación — Pagefind gana, por idioma.** Un índice sobre todas las fuentes
devolvió una única lista clasificada, y los filtros salieron del contrato de
registros sin adaptación alguna: `source` contenía `/`, `/demo`, `/demo/api`,
`/demo/changelog`, `/demo/changelog-flat`, `/demo/collection`, `/releases`,
`/tf`, y `version` contenía `main`, `v0.1.0`, `v0.2.0`, `v0.2.6`, `v0.3.4`,
`v1.x`, `v2.x`, `v3.x`. `interleave()` se retiraría — para las fuentes. No se
retiraría del todo: Pagefind indexa cada idioma por separado y selecciona uno en
tiempo de ejecución, su documentación no describe forma alguna de buscar en dos
a la vez, y `mergeIndex` contra la misma ruta base se omite, de modo que el
respaldo entre idiomas del que depende una página sin traducir sigue
necesitando una segunda instancia y dos espacios de puntuación incomparables.

**Tolerancia a erratas — Pagefind pierde, y se lleva el respaldo consigo.**
Pagefind aplica lematización por idioma y no tiene coincidencia difusa.
`collecton` se rescató por prefijo hasta 360 resultados; `verison` — una
transposición — devolvió **tres páginas sin relación**. Eso es peor que el
comportamiento de FTS5 al que sustituye, porque no es un resultado vacío:
`useDuxtSearch()` recurre a Fuse precisamente cuando la pasada exacta no
devuelve nada, así que tres respuestas equivocadas son tres razones por las que
el respaldo nunca se dispara. Fuse tendría que quedarse, y el disparador que lo
invoca habría de reescribirse en torno a un proveedor que responde con aplomo y
sin acertar.

**Salida — un archivo por sección indexada.** El índice emitió **12.066
archivos** y 6,80 MiB para 11.937 registros, un fragmento por sección, frente a
los 1.414 que escribe hoy una compilación de `www/` para Cloudflare. Cloudflare
Workers limita una versión a 20.000 archivos estáticos en el plan gratuito. Un
sitio de documentación cuyo índice crece en un archivo por sección, fuente,
versión e idioma alcanza ese límite con noventa páginas de material de origen, y
quien añadiera un idioma lo descubriría en un despliegue fallido.

**El empaquetado no es un obstáculo.** `pagefind@1.5.2` es MIT, distribuye siete
binarios precompilados como `optionalDependencies` que cubren toda plataforma
que `engines` promete, y no necesita ni descarga en postinstall ni cadena de
herramientas node-gyp — el listón que `better-sqlite3` no superó. Indexar 11.937
registros tardó 6,8 segundos y a los 10,0 el índice entero estaba en memoria.
Nada de ello entra en conflicto con
[ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime):
todo ocurre durante la compilación.

## Decisión

**La búsqueda por colección de Content sigue siendo la predeterminada de la
capa.** Pagefind no se adopta como lo que duxt distribuye.

De los tres problemas, un índice único resuelve uno por completo, otro sólo
dentro de un idioma, y el tercero lo empeora, además de añadir una ley de
crecimiento en número de archivos que choca con la plataforma donde se despliega
el propio sitio de la capa. Un valor predeterminado se cambia por una ventaja
clara, no por un intercambio, y dos de tres es una forma distinta, no una mejor.

**Pagefind sigue disponible, como capa y no como predeterminado.**
`duxt:search:records` se abrió exactamente para esto, y la medición confirmó que
el contrato no necesita adaptación: `url`, `title`, `content`, `source`,
`version` y `locale` se corresponden campo a campo con `addCustomRecord`, y los
filtros resultantes son las identidades de fuente y las etiquetas de versión que
duxt ya calcula. Quien quiera un índice único escribe
`extends: ['@kirchdev/duxt', 'duxt-pagefind']` y paga el número de archivos a
sabiendas.

**La regla sobrevive al candidato.** `searchIndexVerdict` en
`scripts/search-index-bench.ts` enuncia las seis condiciones que debe superar un
sustituto — carga sensiblemente menor, fuentes clasificadas juntas, tolerancia a
erratas conservada, sólo en tiempo de compilación, binarios que cubran `engines`
y salida dentro del límite de archivos del despliegue — y devuelve las que un
candidato incumple. El «no» de este ADR es un valor que devuelve esa función.

## Consecuencias

Los lectores conservan una búsqueda que descarga más y después responde sin
conexión, y conservan la tolerancia a erratas que aporta Fuse. La queja sobre la
carga queda sin resolver: quien reúna muchas fuentes sigue pagando por colección
activa, y esa es la razón más fuerte para retomarlo.

`interleave()` se queda, y con él el comentario que explica por qué no hay
puntuaciones comparables con las que clasificar.

Retomarlo es barato y los términos están escritos. Que Pagefind incorporase
coincidencia difusa, o emitiese fragmentos en menos archivos, invertiría dos
condiciones; un candidato que indexara todos los idiomas en un único espacio de
búsqueda invertiría una tercera. Volved a ejecutar el banco de pruebas en lugar
de volver a discutir el caso — y registrad un nuevo ADR que sustituya a este,
porque estos registros sólo se añaden.

Nada de esto limita a un servicio externo. Meilisearch y Typesense responden a
las tres quejas y nunca fueron candidatos a *predeterminado*, porque un
predeterminado no puede exigir a un consumidor que opere o compre un servicio;
consumen el mismo hook.
