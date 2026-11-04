import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Nuxt } from '@nuxt/schema';
import { contentCompatibility } from '../build/content/content-compatibility';

/** CI can inspect an app image without starting its server. */
export default function duxtContentCompatibility(
  _options: unknown,
  nuxt: Nuxt
) {
  nuxt.hook('nitro:init', (nitro) => {
    nitro.hooks.hook('compiled', async () => {
      const { artifact } = await contentCompatibility(nuxt);
      await mkdir(nitro.options.output.dir, { recursive: true });
      await writeFile(
        join(nitro.options.output.dir, 'duxt-content-compat.json'),
        JSON.stringify(artifact, null, 2) + '\n'
      );
    });
  });
}
