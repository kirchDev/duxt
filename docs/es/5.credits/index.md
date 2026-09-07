---
title: Créditos
description: Sobre qué está construido duxt, y en qué se fijó para construirse.
icon: lucide:heart
---

duxt es una capa fina sobre el trabajo de otras personas. Casi nada de lo que
hace es invención propia — la obtención de las fuentes, el análisis, los
componentes y los estilos vienen todos de proyectos que resolvieron esos
problemas primero, y la descripción honesta de este repositorio es el pegamento
entre ellos más un puñado de opiniones.

## Construido sobre

| Proyecto                                            | Qué hace aquí                                                              |
| :-------------------------------------------------- | :------------------------------------------------------------------------- |
| [Vue](https://vuejs.org)                            | El modelo de componentes en el que está escrito todo esto                  |
| [Nuxt](https://nuxt.com)                            | El framework, y el mecanismo de capas sobre el que se asienta toda la idea |
| [Nuxt Content](https://content.nuxt.com)            | Obtención, análisis y consulta — incluidos los repositorios nativos de git |
| [shadcn-vue](https://www.shadcn-vue.com)            | La base de componentes, copiada dentro de la capa en vez de importada      |
| [reka-ui](https://reka-ui.com)                      | Las primitivas que hay debajo: foco, roving tabindex, ARIA                 |
| [Tailwind CSS](https://tailwindcss.com)             | El sistema de estilos y la capa de tokens                                  |
| [Shiki](https://shiki.style)                        | Resaltado de sintaxis, en tiempo de compilación                            |
| [Lucide](https://lucide.dev)                        | El conjunto de iconos                                                      |
| [MDC](https://content.nuxt.com/docs/files/markdown) | Componentes invocables desde Markdown                                      |

La versión de cada uno está en `package.json`, que es donde le corresponde estar
a un número — una segunda copia en prosa es una copia que se queda obsoleta en
silencio.

## Construido mirando a

Ideas que duxt tomó de proyectos sobre los que no está construido. Sobre lo que
*sí* está construido es la tabla de arriba — nada se nombra dos veces.

- [**shadcn/ui**](https://ui.shadcn.com) — la idea original: componentes que
  posees como archivos en lugar de importar como dependencia. Cada componente de
  esta capa está aquí por ella.
- [**shadcn-docs-nuxt**](https://shadcn-docs-nuxt.vercel.app) — el vecino más
  cercano, y la prueba de que una plantilla de documentación sobre Nuxt Content
  y shadcn-vue merece la pena.
- [**Docus**](https://docus.dev) — la ergonomía original de «extiende una capa y
  tienes un sitio de documentación» en el ecosistema de Nuxt.
- [**Nuxt UI**](https://ui.nuxt.com) — por la parte legible por máquinas:
  `llms.txt` y un endpoint de documentación que un agente puede llamar, tratados
  como salida de la compilación y no como un añadido.
- [**VitePress**](https://vitepress.dev) y
  [**Starlight**](https://starlight.astro.build) — por lo que un tema de
  documentación le debe a un lector por defecto: un selector de versiones que
  sobrevive a la navegación, una tabla de contenidos que sigue el
  desplazamiento, una búsqueda que está ahí sin configuración.

::callout{type="tip" title="En qué se diferencia duxt"}
Todos los proyectos de arriba documentan un repositorio en una versión. La razón
de existir de duxt empieza donde eso termina: varios repositorios, varias
versiones de cada uno, y una sola lista `sources` que genera las colecciones de
todos ellos — véase [Fuentes](/concepts/sources).
::

## Lo que no se acredita aquí

Faltan dos cosas a propósito. Las dependencias de la propia capa están listadas
en `package.json` y no necesitan una segunda copia mantenida a mano; y quienes
escribieron una página determinada aparecen nombrados en esa página, a partir
del historial git que hay detrás, y no en una lista aquí que quedaría obsoleta
en el siguiente commit.
