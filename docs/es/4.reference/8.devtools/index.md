---
title: Devtools
description: Diez paneles que muestran en qué se convirtieron tus fuentes. Solo en desarrollo.
icon: lucide:wrench
---

`sources` es una lista compacta. Lo que el sitio sirve es un conjunto de
colecciones, prefijos de URL, redirecciones, catálogos de mensajes y una caché de
descargas que la compilación calculó a partir de ella — y hasta que existió esta
pestaña, la única forma de ver algo de eso era leer el código que lo produce.

## Cómo abrirlo

Arranca el servidor de desarrollo y abre Nuxt Devtools (`Shift` + `Alt` + `D`, o
el botón de la esquina). La pestaña se llama **duxt**; los paneles están detrás
de la fila de pestañas de su parte superior. Las mismas páginas responden
directamente bajo `/_duxt/devtools` si prefieres tenerlas en su propia ventana.

::callout{type="danger" title="Nunca se registra en una compilación"}
Los paneles exponen la configuración resuelta, las rutas del sistema de archivos
que hay detrás y un botón que borra un directorio de caché. Nada de eso le
incumbe a nadie en producción, y por eso `modules/devtools.ts` retorna antes de
registrar nada fuera de un servidor de desarrollo — la ruta no existe en una
compilación, en lugar de existir y negarse.
::

## Los paneles

::page-cards
::

## Sobre las vistas previas de estas páginas

Cada panel de aquí abajo está incrustado tal como se representa — no como una
captura de pantalla. Las páginas ejecutan las propias funciones de renderizado de
los paneles sobre un sitio de prueba y guardan el resultado, así que un panel que
gana una columna la gana en esta documentación en el mismo commit.

Ese sitio de prueba es un proyecto imaginado: `acme/sdk` publicado en dos
versiones (`v2` desde `main`, `v1.9` desde una etiqueta) en inglés y alemán, más
`acme/cli` en una. Tiene huecos deliberados — una guía anterior a la versión
antigua, dos páginas que la traducción no ha alcanzado, una página sin
frontmatter — porque un panel sin nada que informar no le enseña a nadie qué
aspecto tiene cuando algo va mal.

## Sin servidor de desarrollo

`pnpm exec duxt-report` imprime las fuentes, las comprobaciones y las
redirecciones como Markdown — los mismos datos que dibujan estos paneles, en una
forma que puedes pegar en un ticket o entregarle a un modelo. `--json` los da sin
representar. Véase [Qué comprueba la compilación](/concepts/build-checks).

Las vistas previas son inertes: sus pestañas se mueven entre paneles, y todo lo
demás — los enlaces al editor, el botón de borrado, el formulario de búsqueda —
no hace nada.
