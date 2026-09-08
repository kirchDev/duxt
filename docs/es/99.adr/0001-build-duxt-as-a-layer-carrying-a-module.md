---
title: Construir duxt como una capa que lleva un módulo
description: Distribuir el tema como una capa de Nuxt cuya raíz es el paquete, y no como una plantilla de inicio.
status: accepted
date: 2026-09-06
---

## Contexto

Un tema de documentación se puede distribuir de dos maneras. Una **plantilla de
inicio** se genera dentro del repositorio de quien la consume, donde cada archivo
es suyo para editarlo y ninguna mejora vuelve a llegarle nunca salvo como un diff
que alguien aplica a mano. Una **capa** sigue siendo una dependencia: quien la
consume la extiende, sobrescribe los archivos con los que no está de acuerdo y se
lleva el resto de las mejoras con un cambio de versión.

Parte de lo que el tema tiene que hacer no es algo que una capa pueda expresar
como archivos. Generar colecciones, resolver una lista de fuentes en prefijos de
URL, convertir el frontmatter en reglas de ruta y validar el resultado es trabajo
de tiempo de compilación, y el trabajo de tiempo de compilación en Nuxt es un
módulo.

## Decisión

Distribuimos duxt como una **capa de Nuxt que lleva sus propios módulos**, que se
consume con una sola entrada `extends`. La raíz del repositorio *es* la capa: la
configuración de Nuxt, la configuración de content y `app/` están en la raíz, y
el manifiesto del paquete apunta a ellos, así que `extends: ['@kirchdev/duxt']`
se resuelve sin paso de compilación. El sitio que la consume vive a su lado, en
el mismo repositorio, y es el objetivo de desarrollo.

## Consecuencias

Quien la consume hereda el tema, las páginas, los componentes, los valores por
defecto de la configuración y las colecciones, y sobrescribe cualquiera de ellos
creando un archivo del mismo nombre. Actualizar es un cambio de versión.

Nada relativo a la capa se resuelve como se lee. Una ruta escrita en la capa se
lee desde el directorio de quien la consume, salvo que se haya resuelto contra la
ubicación de la propia capa, y el alias `@` pertenece a quien extiende la capa,
no a la capa — así que las importaciones de la propia capa necesitan un alias
propio. Esto ha costado errores reales, y es el precio del montaje, no un
descuido.

Los nombres sobrescribibles se convierten en superficie pública. Un componente,
una página o una clave de configuración que quien la consume puede sobrescribir
es un nombre del que depende, así que renombrar uno es una publicación
incompatible, y la superficie documentada es lo que lo fija.

El sitio de desarrollo y una plantilla de inicio son artefactos distintos. El
sitio que hay junto a la capa quiere casos límite, frontmatter feo, varias
fuentes y una etiqueta de la que leer; alguien de fuera que clona una plantilla
quiere lo contrario. Confundir los dos haría malo a uno de ellos.

## Alternativas consideradas

**Una plantilla de inicio.** Libertad total para quien la consume, ningún camino
de actualización para nadie — la razón por la que ganó la capa.

**Un módulo sin capa.** Un módulo puede registrar componentes y rutas, pero la
sustancia del tema son archivos que quien la consume tiene que poder
sobrescribir, y entregarlos a través de un módulo significa inyectarlos en vez
de dejar que lo haga la propia resolución de capas de Nuxt.
