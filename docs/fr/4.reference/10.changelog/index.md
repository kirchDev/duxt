---
title: Journal des versions
description: Un journal de releases, publié en pages — une chronologie, une page par version, et un flux.
icon: lucide:tag
---

Pointez une source vers le fichier qu’écrit votre outil de release et duxt en
construit un historique — une vue d’ensemble avec chaque version sur une
chronologie, et une page par version avec son propre lien direct, son propre
résultat de recherche, sa propre entrée de flux et sa propre entrée dans
`llms.txt`.

Il lit ce qu’écrit release-please, et est délibérément tolérant au-delà : un titre
est une version dès qu’il commence par quelque chose qui ressemble à un numéro de
version, si bien qu’un `## 1.4.0` tenu à la main et un fichier Keep a Changelog se
lisent aussi.

::page-cards
::
