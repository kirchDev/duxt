---
title: Alojar las capas proveedoras en un monorepo de Turborepo
description: La capa pasa a packages/duxt y el sitio a apps/www, cada paquete publicado versiona y etiqueta por su cuenta como <name>@vX.Y.Z, y la decisión de repositorios propios recogida en #74 y #75 queda sustituida.
status: accepted
date: 2026-09-15
---

## Contexto

#74 y #75 decidieron cada una que los proveedores de búsqueda oficiales se
publican como capas complementarias independientes **en repositorios propios** —
`@kirchdev/duxt-typesense`, `@kirchdev/duxt-meilisearch`. Ninguno de esos
repositorios existe, y aquí un repositorio de código abierto nuevo no está a un
comando de distancia: se aprovisiona con OpenTofu y después carga con toda la
capa meta — stubs de workflows, release-please, Dependabot, CodeQL, una licencia,
un README y una configuración de agentes. Es el precio permanente de dos
adaptadores finos sobre exactamente un hook de compilación.

El contrato que ambos consumen, `duxt:search:records`, vive en este repositorio.
Repartido en tres, cada cambio se convertiría en un baile de versiones — subir la
capa, publicar, ampliar el rango de cada proveedor, publicar — sin una sola
puerta que ejecute el hook contra un consumidor. El sitio de desarrollo no podía
probar un proveedor sin depender de una versión publicada.

El repositorio además estaba hecho para un único paquete: su raíz **era** la
capa, y treinta módulos de compilación estaban sueltos junto a la configuración
meta, separados de ella solo por una lista `files`.

## Decisión

**Un repositorio, un workspace de pnpm dirigido por Turborepo.**

- `packages/duxt` es `@kirchdev/duxt`. Sus módulos de compilación salen de la
  raíz plana hacia carpetas temáticas bajo `build/` — `sources/`, `sections/`,
  `bruno/`, `openapi/`, `search/`, `content/`, `og-image/`, `git/`, `config/`,
  `cli/` — y la lista `files` se reduce a directorios. El mapa `exports` conserva
  todos sus nombres de subruta.
- `apps/www` es el sitio que desarrolla la capa, con las comprobaciones que leen
  su compilación.
- La raíz no es un paquete. Conserva la configuración del workspace y la meta, y
  `docs/`, que publica `apps/www`.
- Los paquetes proveedores llegan junto a la capa como
  `packages/duxt-typesense` y `packages/duxt-meilisearch`, con #74 y #75.

**Cada paquete publicado es su propia unidad de versión.** release-please
funciona en modo manifiesto con una entrada por paquete, cada una con su versión
y su changelog, y una versión publica solo los paquetes que incrementó. Se
descartó una versión compartida porque vuelve a publicar paquetes sin cambios con
un número nuevo.

**Cada paquete etiqueta `<name>@vX.Y.Z`, la capa incluida** —
`include-component-in-tag` con `tag-separator: "@"`, de modo que `duxt@v0.5.0`
convive con `duxt-typesense@v0.1.0`. La versión sigue siendo un número simple en
`package.json` y en npm. Las etiquetas simples `v0.1.0`…`v0.4.0` se quedan como
están, y `last-release-sha` apunta una vez al commit de la versión `v0.4.0` para
que release-please encuentre la versión anterior de la capa pese al nuevo patrón.

**El changelog de la capa se queda en la raíz del repositorio**, como
`changelog-path: "/CHANGELOG.md"`. El sitio publica el changelog de cada versión
que sirve, leído en el checkout de esa versión, y todas las etiquetas existentes
tienen el archivo ahí. Moverlo al paquete habría dejado a cada edición anterior
sin sus páginas de versiones. El changelog de un proveedor vive en su propio
directorio; no tiene historial que conservar.

**El versionado por etiquetas de duxt aprende las etiquetas por componente**, y
tiene que llegar antes de la primera versión tras la mudanza. `latest`, el
descubrimiento de versiones y el orden del selector leen `<name>@vX.Y.Z` como
`vX.Y.Z`; la etiqueta y el segmento de URL muestran solo la versión; y una fuente
puede nombrar un `tagComponent` para limitarse a las etiquetas de un paquete,
contando las etiquetas simples como su historial anterior. Sin esto, `latest` en
`apps/www` se habría quedado en `v0.4.0` tras `duxt@v0.5.0` sin que fallara
ninguna compilación.

**Una publicación la decide el registro.** Un paquete se publica cuando su
versión tiene una etiqueta `<component>@v<version>` y npm no tiene esa versión.
El `_publish-npm.yml` central publica la raíz del repositorio y el
`_release-please.yml` central solo reenvía las salidas del paquete raíz, así que
los jobs de publicación son del propio repositorio hasta que los cuerpos
centrales acepten un directorio de trabajo.

**Los proveedores dependen como peer de `@kirchdev/duxt` con un rango amplio,
`>=0.4.0 <1`**, con el límite inferior en lo que el proveedor necesite primero —
nunca `^0.x`, que obligaría a cada proveedor a publicar con cada minor de la
capa. La puerta del monorepo es lo que demuestra la compatibilidad, y el límite
inferior solo sube cuando el contrato del hook cambia de forma incompatible.

**La caché de Turborepo es solo local** — sin caché remota, sin cuenta, sin
token. Una tarea se cachea solo donde sus entradas declaradas determinan su
resultado: las pruebas unitarias sí; el typecheck, la compilación y cada
comprobación sobre una compilación resuelven `latest` contra un remoto y no.

## Consecuencias

La decisión de repositorio propio recogida en #74 y #75 queda sustituida; esas
issues construyen sus paquetes proveedores aquí.

Cada ruta relativa a la capa se movió, y ninguna se resuelve como se lee, así que
la mudanza vale lo que su verificación: la puerta completa, una compilación para
Workers con la comprobación de clasificación de rutas y el tarball empaquetado
instalado en un consumidor de prueba.

Un cambio en el contrato del hook y en sus consumidores llega ahora en una pull
request tras una sola puerta, y el sitio de desarrollo puede usar un proveedor
como dependencia del workspace.

Un monorepo que etiqueta con release-please puede apuntar duxt a sus propias
etiquetas, lo que convierte el soporte de etiquetas con prefijo en una función
para consumidores y no solo en una comodidad de este repositorio.

Las rutas de los registros anteriores describen la estructura de su momento. No
se reescriben, porque estos registros solo se amplían.
