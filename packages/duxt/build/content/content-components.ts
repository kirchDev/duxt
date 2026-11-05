import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { Nuxt, Component } from '@nuxt/schema';

/** Match Content's per-layer srcDir, including the consumer and extended layers. */
export function isContentComponent(nuxt: Nuxt, component: Component) {
  if (component.island || component.filePath.endsWith('.css')) return false;
  return (nuxt.options._layers ?? []).some((layer) => {
    const path = relative(
      resolve(layer.config.srcDir!, 'components/content'),
      component.filePath
    );
    return path !== '..' && !path.startsWith('..' + sep) && !isAbsolute(path);
  });
}
