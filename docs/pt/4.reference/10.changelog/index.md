---
title: Registo de alterações
description: Um registo de versões, publicado como páginas — uma cronologia, uma página por versão, e um feed.
icon: lucide:tag
---

Aponte uma fonte para o ficheiro que a sua ferramenta de release escreve e o duxt
constrói um histórico a partir dele — uma vista geral com cada versão numa
cronologia, e uma página por versão com a sua própria ligação direta, o seu próprio
resultado de pesquisa, a sua própria entrada de feed e a sua própria entrada no
`llms.txt`.

Lê o que o release-please escreve, e é deliberadamente tolerante para além disso:
um título é uma versão quando começa por algo que parece um número de versão, pelo
que um `## 1.4.0` mantido à mão e um ficheiro Keep a Changelog também são lidos.

::page-cards
::
