import { mkdirSync, rmSync } from 'node:fs';
import type { Nuxt } from '@nuxt/schema';
import type { ModuleOptions } from '@nuxt/image';
import {
  documentationMediaDirectory,
  rewriteDocumentationImages
} from '../build/sources/documentation-media';
import type { DocumentationMedia } from '../build/sources/documentation-media';

interface ParseContext {
  file?: { path?: string };
  content?: Record<string, unknown>;
  collection?: { source?: { duxtMedia?: DocumentationMedia }[] };
}

export default function duxtDocumentationMedia(_options: unknown, nuxt: Nuxt) {
  const directory = documentationMediaDirectory(nuxt.options.rootDir);
  // Rebuild the generated output even when Content reuses every parsed page.
  // Removed source assets must not survive a later build of the same ref.
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  const image = nuxt.options.image as
    | Partial<ModuleOptions>
    | false
    | undefined;
  if (image !== false) {
    const options = image ?? {};
    options.dirs = [...(options.dirs ?? []), directory];
    nuxt.options.image = options as ModuleOptions;
  }

  nuxt.hook('nitro:config', (nitro) => {
    nitro.publicAssets ??= [];
    if (!nitro.publicAssets.some((asset) => asset?.dir === directory)) {
      nitro.publicAssets.push({ dir: directory, maxAge: 0 });
    }
  });

  nuxt.hook(
    'content:file:afterParse' as never,
    ((context: ParseContext) => {
      const file = context.file?.path;
      if (!file || !context.content) return;
      for (const source of context.collection?.source ?? []) {
        const media = source.duxtMedia;
        if (media) rewriteDocumentationImages(context.content, file, media);
      }
    }) as never
  );
}
