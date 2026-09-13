---
title: Publicar la capa sin enlaces específicos del propietario
description: Todo valor por defecto que nombraría un proyecto concreto — repositorio, gestor de incidencias, comunidad, aviso legal — se entrega vacío.
status: accepted
date: 2026-09-06
---

## Contexto

Un tema de documentación dibuja varias filas de enlaces: enlaces de icono en la
barra de navegación, un bloque de comunidad junto a la tabla de contenidos,
enlaces legales en el pie, botones en la página de inicio. Rellenarlos con el
proyecto del propio tema hace que un sitio de demostración parezca terminado —
y le pone en la mano a todo el que la consume un botón de «dale una estrella a
este repositorio» que se la da al trabajo de otra persona, una comunidad que no
es la suya y un aviso legal que en su caso es jurídicamente incorrecto.

La fila legal del pie decidió el principio primero, porque un sitio alemán tiene
que mostrar un aviso legal y está claro que no le corresponde a la plantilla
proporcionarlo.

## Decisión

Todo valor por defecto que nombraría un proyecto o una organización concretos se
entrega **vacío**. Los enlaces del propio tema viven en la configuración del
sitio que la consume, donde son un ejemplo y no un valor por defecto. El texto
de interfaz genérico que no nombra a nadie — un encabezado de columna, una
acción «lee la documentación» — se queda en la capa.

## Consecuencias

Quien extiende la capa siendo ajeno al proyecto recibe una fila vacía en lugar
de una equivocada, y una fila vacía falta a la vista mientras que un enlace
equivocado parece correcto.

El sitio de demostración lleva más configuración de la que necesita un consumo
mínimo de la capa, y esa es precisamente su función: es el ejemplo resuelto de
cada fila que quien la consume tiene que rellenar.

Las claves de mensaje de la propia capa se quedan cuando sus enlaces se van, y
esas claves son internas. Quien la consume y meta mano en ellas dependería de un
nombre que puede renombrarse sin una versión mayor, y una clave ausente se
imprime como la clave — así que la rotura llegaría a un lector antes que a una
compilación. Quien la consume escribe sus propias cadenas; la [página de
configuración](/getting-started/configuration) dice cómo.
