---
title: Generar las colecciones a partir de una sola lista de fuentes
description: Calcular las colecciones de Content a partir de una lista de fuentes compacta al cargar la configuración, en vez de hacer que quien la consume las declare.
status: accepted
date: 2026-09-06
---

## Contexto

Nuxt Content obtiene una colección desde un repositorio git en una rama o una
etiqueta, se autentica contra uno privado y cachea la descarga por hash. Eso se
verificó leyendo el propio Content antes de construir nada de esto, y significa
que la mitad difícil de la documentación versionada y multirrepositorio ya
existía y no había que reconstruirla.

Lo que no existía era la ergonomía. Un sitio que sirve varias versiones de varios
proyectos declara una colección por repositorio × ref, a mano: tres versiones en
catorce repositorios son cuarenta y dos declaraciones, y cada publicación edita
las catorce. Content tampoco ofrece ningún hook para inyectar colecciones — pero
carga la configuración de content de cada capa mediante c12, lo que significa que
ese archivo es código ejecutado y no un archivo de datos, y puede calcular sus
colecciones al cargarse.

## Decisión

Quien la consume declara una **lista de fuentes** compacta — una carpeta,
opcionalmente un repositorio, opcionalmente refs — en el `app.config` del propio
sitio, y la configuración de content de la capa calcula a partir de ella una
colección por fuente × ref al cargarse. La misma lista la resuelve una segunda
vez la compilación, en un manifiesto que nombra qué colección sirve qué prefijo
de URL, y ese manifiesto es lo que lee el tema.

## Consecuencias

La lista tiene la longitud del número de proyectos y no del producto de proyectos
por versiones, y la única carpeta sin versionar no necesita configuración alguna.

El atajo expresa menos que una colección escrita a mano, y siempre lo hará. Eso
solo es soportable porque Content combina la configuración de content de cada
capa y gana la posterior: quien necesite algo que el atajo no sepa decir escribe
su propio archivo y toma el control por completo.

Varias funciones dejan de necesitar configuración propia, porque una fuente ya
nombra un repositorio, una ref y una carpeta — los enlaces de vuelta a la fuente,
la fecha de última actualización y la lista de personas que han contribuido se
derivan de ahí.

Los nombres de colección se vuelven datos. Un sitio con dos repositorios no tiene
ninguna colección llamada `docs`, así que nada en la capa puede nombrar una, y el
tema lee el nombre del manifiesto en su lugar. El código que fija a fuego un
nombre de colección funciona en un sitio de una sola fuente y se rompe en todos
los demás.

Las rutas de las colecciones se resuelven contra la capa y no contra quien la
consume, porque Content registra como raíz de una colección la capa que la
declaró. Por eso la capa calcula rutas absolutas, lo cual solo es posible porque
la configuración es código ejecutado — la misma propiedad sobre la que se asienta
todo el atajo.
