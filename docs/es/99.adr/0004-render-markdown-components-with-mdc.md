---
title: Renderizar los componentes de Markdown con MDC
description: Usar la sintaxis MDC propia de Content para los componentes dentro de Markdown en lugar de adoptar MDX.
status: accepted
date: 2026-09-06
---

## Contexto

Un tema de documentación necesita componentes dentro de la prosa — callouts,
código en pestañas, campos de parámetros, árboles. Había dos sintaxis
disponibles. **MDX** compila Markdown en un módulo de componente y deja que una
página importe y escriba JSX; **MDC** es la sintaxis de componentes en bloque y
en línea que Content ya trae y parsea.

Las páginas también las lee algo que no es un navegador. El tema publica el
Markdown fuente de cada página para los modelos, así que un modelo recibe
exactamente la sintaxis en la que están escritas las páginas.

## Decisión

Los componentes en Markdown son **MDC**. Los componentes invocables desde una
página viven en un directorio de contenido propio, donde un archivo del mismo
nombre de quien la consume reemplaza al de la capa.

## Consecuencias

No hay que instalar ni configurar nada para que una página invoque un
componente, y una página sigue siendo un archivo Markdown en lugar de
convertirse en un módulo.

Un bloque MDC sobrevive a que se le entregue a un modelo como texto: se lee como
una llamada a un componente con argumentos con nombre. JSX compilado no.

La sintaxis es la de Content, así que sus capacidades y sus límites también son
los de Content. Todo lo que una página quiera y MDC no pueda expresar hay que
resolverlo como componente en lugar de como expresión en la página — lo cual es
una restricción para quien escribe y, para un sitio de documentación, una
deseable.

Los nombres de los componentes del directorio de contenido forman parte de la
superficie pública, ya que una página escrita contra uno de ellos es un archivo
de quien la consume.

## Alternativas consideradas

**MDX.** Más expresivo, y toda esa expresividad es JavaScript en una página de
documentación. Además necesitaría un módulo y una ruta de compilación que
Content no tiene, para acabar con páginas que se le entregan peor a un modelo.
