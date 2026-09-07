---
title: Layout
description: Os dois componentes que emolduram uma página — a barra de navegação e o rodapé.
icon: lucide:layout-panel-top
---

O que rodeia a documentação em todas as páginas. Nenhum recebe uma prop: leem
[`useDuxtConfig()`](/reference/composables/config-and-content/use-duxt-config),
por isso o que desenham é o que a configuração diz.

A linha de secções por baixo da barra de navegação é
[`DuxtSections`](/reference/components/navigation/duxt-sections), arquivada com a
navegação — nomeia as partes da árvore de documentação, o que é navegar, não
emoldurar.

::page-cards
::
