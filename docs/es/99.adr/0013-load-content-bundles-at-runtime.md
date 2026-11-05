---
title: Cargar paquetes de contenido en tiempo de ejecución
description: Limitar la reconstrucción como único camino para despliegues Node y SQLite que opten por ello, tras comparar un empaquetado de contenido con una compilación completa.
status: accepted
date: 2026-11-04
---

## Contexto

Una wiki puede cambiar su Markdown más a menudo que su código. Reconstruir una
imagen por cada cambio vincula el contenido a la publicación de la aplicación;
un pod sin salida a la red no puede obtener las fuentes por sí mismo.
[ADR-0006](/adr/0006-rebuild-on-a-schedule-rather-than-refresh-at-runtime)
eligió despliegues inmutables, una opción predeterminada útil para sitios
estáticos y Workers.

La excepción necesitaba demostrar que era posible empaquetar contenido sin
compilar la aplicación. El experimento del 2026-11-04 usó `apps/www` en
`725534546886f06220f62a99525070ee63978a50`, Node 26.11.1, Nuxt 4.6.2 y
Content 3.16.2: 96 colecciones, 9.603 archivos y 95 volcados de colecciones públicas.

Ambos procesos se ejecutaron desde `apps/www`, en la misma máquina con ocho CPU,
las mismas fuentes y dependencias instaladas. Espejos Git públicos fijados
sirvieron las fuentes remotas mediante HTTPS de loopback aislado, sin red
externa. Ambos comenzaron sin base de análisis de Content ni plantillas previas
y analizaron los 9.603 archivos. Preparar el entorno y copiar las entradas quedó
fuera del tiempo medido. Ambos terminaron con código `0`.

| Medición | Solo contenido | `nuxt build` completo |
| :--- | ---: | ---: |
| Tiempo real | 110.36 s | 278.54 s |
| Fracción de la compilación completa | 39.62% | 100% |
| Volcados de colecciones | 95 | 95 |

Los 95 volcados comprimidos y los literales de `checksums` y `checksumsStructure` fueron idénticos byte a byte. También coincidieron íntegramente `database.compressed.mjs`, `manifest.ts` y `sql_dump.txt`; las tablas del manifiesto tenían 96 entradas en ambos casos.

| File | Bytes | SHA-256 (both runs) |
| :--- | ----: | :----------------- |
| `database.compressed.mjs` | 18,747,182 | `e708db643cc47bc0cd742e910124f5cdd63586e9d06fd4c6301a35d871a2bb1f` |
| `manifest.ts` | 104,380 | `43bd5c30c30e426a117053d9256684aa992c52a9b72493c4af2b95ee1ea8df65` |
| `sql_dump.txt` | 76,747,454 | `eba31689710dc03ce165dfeb9770c666c7f561083336a7fc1ba85828c334fb00` |


La secuencia de contenido fue:

```js
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { loadNuxt, buildNuxt } from 'nuxt/kit';

const buildDir = await mkdtemp(join(process.cwd(), '.nuxt-pack-'));
const nuxt = await loadNuxt({
  cwd: process.cwd(),
  dev: false,
  overrides: { buildDir }
});
try {
  nuxt.options._prepare = true;
  await buildNuxt(nuxt);
  // Save buildDir/content before disposing the temporary directory.
} finally {
  await nuxt.close();
}
```

La inicialización de módulos de producción y el análisis terminaron **antes**
de activar `_prepare`. Activarlo antes omitiría el análisis; reutilizar el
directorio permitiría devolver plantillas anteriores. Se generaron plantillas
sin empaquetar Vite ni Nitro. La comparación ejecutó `build` con la CLI de Nuxt
instalada desde `apps/www`, sin sobrescribir la configuración. El experimento
no añadió un empaquetador de producción ni un cargador en ejecución.

`cd apps/www && node node_modules/nuxt/bin/nuxt.mjs build`

## Decisión

Permitir paquetes de contenido como opción explícita para despliegues Node con
SQLite. Esto limita ADR-0006 solo para ese despliegue; reconstruir sigue siendo
la opción predeterminada y el camino para Workers y salida estática. El
experimento cumplió ambos criterios: volcados y sumas idénticos byte a byte, y
un tiempo de empaquetado no superior a la mitad de la compilación.

Un paquete puede cambiar contenido, redirecciones y medios de documentación.
Cambiar el esquema, añadir fuentes o versiones y añadir código de componentes
MDC sigue requiriendo una imagen. Se validan compatibilidad y hashes antes de
importar todas las colecciones en una transacción SQLite y publicar las sumas
de Content correspondientes. Rechazar un paquete conserva el contenido activo.

El transporte es un directorio del operador con un puntero `current` sustituido
atómicamente; la capa no necesita cliente de almacenamiento, credenciales ni
salida a la red. El empaquetador proviene del commit de la aplicación, con un
segundo objetivo Docker probado y un hash de compatibilidad esperado comprobado
antes de publicar. Los componentes MDC existentes son globales en este modo;
el contenido puede usar un subconjunto. Las réplicas cambian por separado,
aceptando un desfase de hasta el intervalo de sondeo más el tiempo de importación.

## Consecuencias

Las publicaciones de contenido y aplicación se independizan dentro de este
ámbito, a cambio de validar compatibilidad y activar atómicamente. El formato
del volcado de Content, su ruta y el objeto mutable de sumas necesitan pruebas
de contrato. El empaquetado en frío siguió dedicando casi todo su tiempo al
análisis; esta medición demuestra la mejora para este árbol, no para todo
consumidor o estado de caché. Se aceptan el desfase de réplicas y que el
navegador conserve su contenido hasta una recarga completa.

## Alternativas consideradas

**Reconstruir una imagen por cada push de contenido.** Sigue siendo la opción
predeterminada; la etapa medida justificó una excepción para la wiki que motivó
la propuesta.

**Sustituir ADR-0006 en todas partes.** Rechazado: sitios estáticos y Workers
mantienen su modelo de compilación inmutable.

**Dejar que Content restaure de forma diferida, o acceder al almacenamiento desde
la capa.** Restaurar por colección no permite cambiar todas atómicamente. Un
cliente de almacenamiento llevaría credenciales y salida a la red a la
aplicación, en lugar de dejar el transporte al operador.
