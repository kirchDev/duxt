---
title: Mise en page
description: Les deux composants qui encadrent une page — la barre de navigation et le pied de page.
icon: lucide:layout-panel-top
---

Ce qui entoure la documentation sur chaque page. Ni l’un ni l’autre ne prend de
prop : ils lisent
[`useDuxtConfig()`](/reference/composables/config-and-content/use-duxt-config),
donc ce qu’ils dessinent est ce que dit la configuration.

La rangée de sections sous la barre de navigation est
[`DuxtSections`](/reference/components/navigation/duxt-sections), classée avec la
navigation — elle nomme les parties de l’arborescence de documentation, ce qui
est naviguer, pas encadrer.

::page-cards
::
