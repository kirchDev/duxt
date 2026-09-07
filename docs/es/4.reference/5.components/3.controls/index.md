---
title: Controles
description: Lo que maneja un lector — la búsqueda, los selectores, la hoja de atajos y dos indicadores.
icon: lucide:sliders-horizontal
---

Cada uno de estos es un control que el lector maneja, o un estado que lee, y no
una parte de la estructura de la página. Ninguno toma props: leen
[`useDuxtConfig()`](/reference/composables/config-and-content/use-duxt-config)
y no representan nada cuando la configuración no les da nada que ofrecer.

Esa última parte es el patrón que conviene conocer antes de reemplazar alguno.
Un selector con una sola opción no es un selector, así que `DuxtVersion` dibuja
un distintivo y `DuxtLocale` no dibuja nada en absoluto — un sitio con un solo
locale nunca llega a enterarse de que duxt habla siete idiomas.

::page-cards
::
