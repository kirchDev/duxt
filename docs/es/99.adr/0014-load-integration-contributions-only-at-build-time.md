---
title: Cargar las contribuciones de integración solo durante la compilación
description: Mantener los analizadores fuera de la configuración del cliente y permitir que las capas aporten colecciones y metadatos.
status: accepted
date: 2026-11-07
---

# ADR-0014 — Cargar las contribuciones de integración solo durante la compilación

## Contexto

Los analizadores y metadatos deben llegar tanto a la configuración de Content como a los módulos de Nuxt. Las contribuciones ejecutables en la configuración de ejecución acoplan el navegador a dependencias de compilación. La navegación específica de un proveedor también vincula un dialecto al tema.

## Decisión

Elegimos un archivo exclusivo de compilación descubierto mediante las capas de Nuxt, con prioridad para el sitio. Las integraciones incluidas usan el mismo contrato. Los dialectos escriben metadatos genéricos de navegación; el núcleo ordena y agrupa páginas sin conocer su origen.

## Consecuencias

Una extensión puede ampliar el esquema sin imponer sus campos a otros sitios. Las actualizaciones de contenido conservan la misma ruta de análisis. Un cambio de esquema requiere una imagen nueva antes de desplegar bundles compatibles. Expusimos una única ruta inestable de utilidades mientras se evaluaba el límite de extracción, aceptando cambios antes de confirmarlo con paquetes separados.
