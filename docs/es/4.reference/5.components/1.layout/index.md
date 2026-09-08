---
title: Diseño
description: Los dos componentes que enmarcan una página — la barra de navegación y el pie.
icon: lucide:layout-panel-top
---

Lo que rodea a la documentación en cada página. Ninguno de los dos acepta prop:
leen [`useDuxtConfig()`](/reference/composables/config-and-content/use-duxt-config),
así que lo que dibujan es lo que dice la configuración.

La fila de secciones bajo la barra de navegación es
[`DuxtSections`](/reference/components/navigation/duxt-sections), archivado con
la navegación — nombra las partes del árbol de documentación, que es navegar, no
enmarcar.

::page-cards
::
