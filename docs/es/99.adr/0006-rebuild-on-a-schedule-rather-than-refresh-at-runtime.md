---
title: Recompilar según un calendario en vez de refrescar en tiempo de ejecución
description: Un sitio que lee otro repositorio recoge sus cambios cuando compila, y no se ofrece ningún refresco en tiempo de ejecución.
status: accepted
date: 2026-09-06
---

## Contexto

Un sitio que lee documentación de otros repositorios tiene un deseo evidente:
recoger un push sin desplegar. Content, sin embargo, descarga un repositorio
remoto durante la compilación y lo compila en la base de datos que la
compilación entrega. Refrescar eso en un servidor en marcha significaría
reconstruir la base de datos in situ — para lo cual Content no ofrece ninguna
vía soportada, y la única disponible es la misma base de datos de cliente que
lee la búsqueda.

## Decisión

Content se lee en tiempo de compilación y nunca se refresca en tiempo de
ejecución. Un sitio cuyas fuentes han avanzado se recompila: según un
calendario, o disparado desde el repositorio de origen.

## Consecuencias

Un despliegue es inmutable y una compilación es reproducible — las páginas
servidas son exactamente las páginas que se compilaron, y el mismo commit
produce el mismo sitio. La salida estática sigue siendo posible, que es lo
correcto por defecto para la documentación.

La documentación va por detrás de su fuente lo que dure el intervalo de
recompilación, y un repositorio de origen que quiera su documentación en vivo
tiene que disparar la compilación del sitio. Ese es el coste, y se paga en
operaciones y no en la capa.

Nada en el tema puede dar por supuesto que puede releer una fuente. Una
funcionalidad que quiera contenido más fresco del que tiene la compilación está
pidiendo otra arquitectura, no un ajuste.
