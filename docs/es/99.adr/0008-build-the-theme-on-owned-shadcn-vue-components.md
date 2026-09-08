---
title: Construir el tema sobre componentes shadcn-vue propios
description: La capa guarda el código fuente de sus componentes de interfaz en lugar de importarlos de una biblioteca de componentes o de un tema de documentación ya hecho.
status: accepted
date: 2026-09-08
---

## Contexto

Una capa de documentación es sobre todo interfaz: una cabecera, una barra
lateral, una tabla de contenidos, bloques de código, un diálogo de búsqueda. Algo
tiene que dibujarlos, y la elección decide cuánto puede cambiar un consumidor sin
bifurcar.

Toda la propuesta de la capa es que se extiende en lugar de generarse —
`extends: ['@kirchdev/duxt']`, y todos los archivos siguen siendo
sobrescribibles. Un tema cuya apariencia solo fuera alcanzable mediante las
opciones que su autor pensó exponer contradiría eso en la primera cosa que un
consumidor quisiera distinta. La resolución de capas de Nuxt ya da al consumidor
la sobrescritura a nivel de archivo — la pregunta era qué debían ser esos
archivos.

## Decisión

La capa posee el código fuente de sus componentes. shadcn-vue se usa como fuente
de las primitivas: su CLI escribe el código de un componente en el repositorio, y
a partir de ahí el archivo pertenece a la capa y no a una dependencia.
`components.json` apunta el CLI al alias propio de la capa, así que añadir una
primitiva es una sola orden, y Tailwind aporta el estilo por debajo.

La paleta son propiedades personalizadas de CSS. Los componentes leen tokens y no
guardan colores, que es lo que hace que una sobrescritura de una línea alcance
todas las superficies.

## Consecuencias

Un consumidor puede cambiar cualquier parte de la interfaz, a la profundidad que
el cambio requiera: redefinir un token, ensombrecer un componente por su nombre o
añadir una primitiva propia. Nada de eso exige una bifurcación, y nada espera a
que la capa exponga una opción para ello.

El coste es el mantenimiento. Una corrección de una primitiva no llega con una
subida de versión — llega cuando alguien vuelve a ejecutar el CLI para ese
componente. La capa lo asume por las primitivas que entrega; un consumidor que
sobrescribe una lo asume a partir de entonces. En torno a ese canje está
construida la guía de sobrescritura, y es la razón de que exista.

Los archivos copiados que el CLI no alcanza son el filo de ese mismo canje: una
hoja de estilos sin entrada de registro solo puede actualizarse descargándola de
nuevo, así que los cambios locales se pierden en silencio en vez de chocar
ruidosamente.

## Alternativas consideradas

**Un tema de documentación ya hecho.** Docus es el encaje evidente — el tema
propio de Nuxt Content, y todo lo que una web de documentación necesita al primer
arranque. Se descartó por la misma razón por la que resulta atractivo: el sitio
que produce es el de su autor, y remodelarlo significa o una opción que existe o
una bifurcación. Una capa cuyos consumidores debían diferenciarse entre sí no
podía aceptar ese techo.

**Una biblioteca de componentes como dependencia.** Nuxt UI habría aportado las
primitivas sin el mantenimiento, y la capa habría seguido sus versiones en lugar
de copiar código. Se descartó porque los componentes de una dependencia solo
pueden cambiarse hasta donde sus props lo permiten, y la capa habría tenido
entonces que inventar un segundo mecanismo de sobrescritura para el resto — con
dos, ninguno habría sido el evidente al que recurrir.

**Componentes escritos a mano, sin upstream alguno.** Esto elimina la cuestión de
la dependencia por completo y se descartó por su coste: las primitivas accesibles
son difíciles justo en los puntos donde es fácil equivocarse, y un diálogo o un
combobox escritos desde cero serían peores que uno adaptado de una fuente que ya
lo resolvió.
