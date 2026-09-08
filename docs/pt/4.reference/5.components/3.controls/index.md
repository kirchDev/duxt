---
title: Controlos
description: O que o leitor opera — a pesquisa, os seletores, a folha de atalhos e dois indicadores.
icon: lucide:sliders-horizontal
---

Cada um destes é um controlo que o leitor opera, ou um estado que ele lê, e não
uma parte da estrutura da página. Nenhum recebe uma prop: leem
[`useDuxtConfig()`](/reference/composables/config-and-content/use-duxt-config)
e não desenham nada quando a configuração nada lhes dá para oferecer.

É essa última parte o padrão que vale a pena conhecer antes de substituir algum.
Um seletor com uma só escolha não é um seletor, por isso o `DuxtVersion` desenha
um distintivo e o `DuxtLocale` não desenha absolutamente nada — um site com um
só idioma nunca fica a saber que o duxt fala sete línguas.

::page-cards
::
