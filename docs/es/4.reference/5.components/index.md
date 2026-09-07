---
title: Componentes
description: Los componentes propios de la capa, con una página cada uno — para qué sirve cada uno y qué acepta.
icon: lucide:component
---

Todos los componentes de aquí son **ensombrecibles**: un archivo del mismo
nombre en tu proyecto sustituye al de la capa, sin ninguna configuración. Un
nombre documentado aquí forma parte de la superficie pública, así que no se
renombrará sin una versión mayor.

Las páginas están agrupadas por lo que hace un componente: los dos que enmarcan
una página, los seis que navegan por su árbol, los controles que maneja un
lector y los componentes que pertenecen a la página misma.

::page-cards
::

::callout{type="tip" title="Reemplaza lo menos posible"}
Antes de ensombrecer un componente, comprueba si una clave de configuración, un
slot o un token CSS ya hace lo que necesitas — véase
[Sobrescribir el tema](/guides/override-the-theme). Un archivo reemplazado deja
de recibir las correcciones de la capa.
::
