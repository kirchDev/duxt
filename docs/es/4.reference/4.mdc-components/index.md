---
title: Componentes MDC
description: Los bloques que puede invocar una página Markdown, una página cada uno, con sus props.
icon: lucide:blocks
---

Cualquier cosa en `app/components/content/` se puede invocar desde Markdown con
sintaxis MDC — sin módulo, sin MDX. Estos vienen con la capa; un archivo propio
con el mismo nombre reemplaza a uno.

Todas las páginas de aquí están construidas igual: qué es el bloque, un ejemplo
representado tal como lo representa este sitio con al lado el Markdown que lo
produjo, y después sus props, slots y eventos.

::page-cards
::

::callout{type="tip" title="Anidar añade un signo de dos puntos"}
Un bloque dentro de otro bloque abre con un signo de dos puntos más que su
padre — `:::accordion` alrededor de `::accordion-item`. El cierre coincide con
la apertura.
::
