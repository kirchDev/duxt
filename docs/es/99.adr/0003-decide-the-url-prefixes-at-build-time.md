---
title: Decidir los prefijos de URL en tiempo de compilación
description: Que aparezca un segmento de repositorio o de versión lo decide la lista de fuentes antes de la primera petición, nunca por petición.
status: accepted
date: 2026-09-06
---

## Contexto

Un sitio construido a partir de varias fuentes tiene que servir un segmento de
repositorio y un segmento de versión en sus URL, y uno construido a partir de una
sola carpeta no debe hacerlo — nadie quiere `/my-project/main/guides/deploying`
para un proyecto con una única carpeta de documentación sin versionar.

Hacer cada segmento opcional por petición no funciona. Con ambos opcionales, el
primer segmento de `/guides/…` podría ser una carpeta, un repositorio o una
versión, y solo consultando los tres se sabría cuál. Esa ambigüedad no es un
inconveniente de enrutado; hace que el significado de una URL dependa de lo que
resulte existir.

## Decisión

Cada prefijo se activa **para todo el sitio, en tiempo de compilación, a partir
de la lista de fuentes**: un segmento de repositorio en cuanto se publica más de
un repositorio o lo fuerza un interruptor, y un segmento de versión en cuanto una
fuente publica más de una ref o lo fuerza un interruptor. Una ref por repositorio
se sirve sin segmento de versión alguno.

## Consecuencias

La forma de cada URL queda fijada antes de la primera petición, así que el
enrutador nunca adivina y un enlace escrito en una página lo puede resolver una
comprobación de la compilación en vez de probarlo.

Una única carpeta sin versionar sirve rutas que no delatan en absoluto que
existan repositorios o versiones, que es lo que hace que el caso más simple salga
gratis.

Convertir un sitio de una fuente en uno de dos cambia todas las URL que sirve.
Eso es una migración, y la maquinaria de redirecciones es lo que la hace
soportable.

Queda una colisión que no se puede eliminar por diseño: una carpeta de
documentación llamada como un repositorio o como un segmento de versión, donde
gana el prefijo y la carpeta queda inalcanzable. La compilación la rechaza con un
mensaje en vez de resolverla en silencio hacia un lado.

Como el prefijo de una página solo lo conoce la compilación, los enlaces dentro
de las páginas se escriben como rutas de documentación desnudas y se resuelven
contra la fuente de la página al representarla. Una página que fija a fuego su
propio prefijo es correcta exactamente en un sitio.
