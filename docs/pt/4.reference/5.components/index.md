---
title: Componentes
description: Os componentes da própria camada, uma página cada — para que serve cada um e o que recebe.
icon: lucide:component
---

Todos os componentes aqui são **sombreáveis**: um ficheiro com o mesmo nome no
teu projeto substitui o da camada, sem configuração nenhuma. Um nome documentado
aqui faz parte da superfície pública, por isso não será renomeado sem um
lançamento maior.

As páginas estão agrupadas pelo que um componente faz: os dois que emolduram uma
página, os seis que navegam a sua árvore, os controlos que um leitor opera e os
componentes que pertencem à própria página.

::page-cards
::

::callout{type="tip" title="Substitui o menos possível"}
Antes de sombrear um componente, verifica se uma chave de configuração, um slot
ou um token CSS já faz o que precisas — ver
[Substituir o tema](/guides/override-the-theme). Um ficheiro substituído deixa
de receber as correções da camada.
::
