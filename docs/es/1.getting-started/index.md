---
title: Introducción
description: Qué es duxt, y qué llega con una sola línea de configuración.
icon: lucide:rocket
---

duxt es una capa de Nuxt. La extiendes, pones Markdown en `docs/` y ya tienes un
sitio de documentación: navegación, tabla de contenidos, búsqueda, tema,
`llms.txt` y un servidor MCP incluidos.

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  extends: ['@kirchdev/duxt']
});
```

Eso es todo el caso de una sola carpeta. Sin colección, sin diseño, sin
`content.config.ts`.

## Lo que no es

duxt no obtiene el contenido. [Nuxt Content v3](https://content.nuxt.com) ya
descarga un repositorio git en una rama o una etiqueta, se autentica contra uno
privado y cachea el resultado por hash — y duxt usa eso en lugar de
reimplementarlo.

Lo que duxt añade es la parte que, si no, se reescribe en cada repositorio de
documentación: una colección por versión y repositorio, el esquema de URL que
las sostiene, el selector que sabe qué página existe dónde, y un tema encima.
Todo ello se genera a partir de una sola lista — véase
[Fuentes](/concepts/sources).

## Por dónde seguir

::page-cards
::
