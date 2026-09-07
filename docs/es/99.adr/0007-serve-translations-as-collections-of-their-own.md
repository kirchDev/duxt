---
title: Servir las traducciones como colecciones propias
description: Añadir una dimensión de locale a una fuente en lugar de un segmento de locale a la ruta de contenido.
status: accepted
date: 2026-09-06
---

## Contexto

La capa traducía su interfaz a siete locales y servía un único conjunto de
páginas a todos ellos: `useDuxtPath()` quitaba el segmento de locale antes de
cada consulta de contenido, así que `/de-DE/guides/deploying` y
`/guides/deploying` resolvían al mismo archivo. Content v3 no tiene noción de
locale — una colección es un árbol — así que las páginas traducidas necesitaban
una decisión y no un ajuste.

Lo que hacen los generadores comparables se leyó en lugar de suponerse.
Starlight, VitePress, Docusaurus y MkDocs ponen todos las traducciones en una
carpeta por idioma; solo Starlight tiene un recurso documentado para una página
que le falta a un idioma. Pasado cierto tamaño, la traducción abandona la
herramienta por completo: React lleva `de.react.dev` como repositorio propio, y
Vue una organización `vuejs-translations` entera, porque quienes traducen
trabajan con su propio calendario y su propia revisión. OpenCode construyó un
agente que traducía su documentación en CI, lo ejecutó y lo apagó; diecisiete
idiomas llevan parados desde entonces.

El coste se midió antes de elegir la forma: las compilaciones sobre 1 … 200
colecciones escalan de forma lineal, a razón de unos 2,2 s y 0,63 MB de base de
datos cada una, sin punto de inflexión. La matriz no tiene un techo que fuerce
la mano del diseño.

## Decisión

Una fuente gana una lista `locales`, y una ref también, resuelta como ya lo está
`status` (`ref.locales ?? source.locales`). Una cadena es una carpeta dentro del
`path` de la fuente; un objeto mueve ese idioma a su propia carpeta, repositorio
o ref.

**El locale por defecto es el árbol de `path` mismo, sin carpeta**, así que
añadir la clave no mueve ninguna URL que un sitio ya sirva.

**El locale no forma parte de la ruta de contenido.** Pertenece al enrutado de
i18n, que de todos modos lo pone delante de la ruta. Original y traducción viven
por tanto bajo rutas de contenido idénticas, en colecciones separadas.

Una página que le falta a un idioma recae por una cadena — el locale, su idioma
base, una región hermana, el `fallbackLocale` de vue-i18n, el original sin
traducir — y al lector se le dice, en un aviso, qué idioma se le está mostrando.

## Consecuencias

Ninguna comparación de rutas del tema cambia: la navegación, las redirecciones,
el rastro, la puntuación de la página más próxima del 404 y el selector de
idioma siguen funcionando sobre una ruta que nunca llevó locale. El recurso es
una consulta más para la misma ruta, en lugar de una redirección o un segundo
esquema de resolución.

`useDuxtNavigation` y la búsqueda siguen a `useDuxtCollection`, así que ambos
pasaron a tener en cuenta el locale sin que hubiera que cambiarlos.

Un sitio que no define nada obtiene exactamente lo que tenía: una colección
llamada `docs`, una entrada en el manifiesto, una consulta por página.

Ahora dos configuraciones pueden discrepar de una forma que produce una página
vacía en lugar de un error — `content.config.ts` resuelve el locale por defecto
sin acceso a la configuración de Nuxt. Por eso el módulo duxt comprueba
`sourceOptions.defaultLocale` contra `i18n.defaultLocale` y falla la compilación
cuando difieren, en lugar de inyectar uno en el otro y dejar a Content
calculando la otra respuesta.

Las traducciones multiplican colecciones, y la compilación paga por cada una de
forma lineal. La cifra pertenece a la documentación, porque quien la consume
decide la matriz.

Los fragmentos no se traducen. `_partials/` es una única colección compartida
entre fuentes, y los fragmentos propios de una carpeta de idioma se excluyen en
lugar de colisionar por nombre con los del original.

## Alternativas consideradas

**Un segmento de locale en el prefijo de contenido.** Simétrico con `repo` y
`version`, y habría obligado a toda comparación de rutas del tema a aprender
sobre locales — para una URL que i18n ya prefija, y que entonces se escribiría
dos veces.

**Un sufijo de archivo — `installation.de-DE.md` junto al original.** Sin
multiplicación de colecciones, y falla justo en el caso que los proyectos
grandes tienen de verdad: obliga a que la traducción esté en el mismo
repositorio y en la misma ref que el original.

**404 para una traducción ausente.** Lo que hace VitePress por omisión. Castiga
al lector por un hueco que dejó quien escribe, y esconde a todos los demás que
la traducción está incompleta.
