---
title: Bruno-Collections
description: Eine Bruno-Collection als request-zentrierte Referenz mit herunterladbarem Archiv.
icon: lucide:send
---

Eine Quelle zeigt auf einen Ordner mit `.bru`-Dateien, und duxt baut daraus eine
Übersicht, eine Seite je Ordner, eine Seite je Request und ein Archiv der gerade
gezeigten Version und Sprache.

Die Referenz ist bewusst schmaler als [OpenAPI](/reference/openapi): Bruno ist
ein Client-Artefakt mit Requests, Ordnern, Headers, Bodies, Scripts und
Environments, aber ohne Response-Schemas oder wiederverwendbare Komponenten.
duxt zeigt, was die Collection sagt, und erfindet nichts durch eine versteckte
Konvertierung zu OpenAPI.

::page-cards
::
