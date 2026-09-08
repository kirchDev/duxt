---
title: Componentes MDC
description: Os blocos que uma página Markdown pode invocar, uma página cada, com as suas props.
icon: lucide:blocks
---

Tudo o que está em `app/components/content/` pode ser invocado a partir do
Markdown com sintaxe MDC — sem módulo, sem MDX. Estes vêm com a camada; um
ficheiro teu com o mesmo nome substitui um deles.

Todas as páginas aqui são feitas da mesma maneira: o que o bloco é, um exemplo
apresentado tal como este site o apresenta com o Markdown que o produziu ao
lado, e depois as suas props, slots e eventos.

::page-cards
::

::callout{type="tip" title="Aninhar leva mais um dois-pontos"}
Um bloco dentro de um bloco abre com mais um dois-pontos do que o seu pai —
`:::accordion` à volta de `::accordion-item`. O delimitador de fecho corresponde
ao de abertura.
::
