import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Nuxt } from '@nuxt/schema';
import { expect, it } from 'vitest';
import duxtDocumentationMedia from '../modules/documentation-media';

it('mounts generated media for Nitro and the existing image provider and rewrites a parsed page', () => {
  const root = mkdtempSync(join(tmpdir(), 'duxt-media-module-'));
  try {
    const hooks = new Map<string, (context: never) => void>();
    const customImages = join(root, 'custom-images');
    mkdirSync(customImages);
    const options = {
      rootDir: root,
      image: { provider: 'custom', dirs: [customImages] }
    };
    duxtDocumentationMedia({}, {
      options,
      hook: (name, handler) => hooks.set(name, handler)
    } as unknown as Nuxt);
    const nitro = { publicAssets: [{ dir: customImages }] };
    hooks.get('nitro:config')!(nitro as never);
    expect(nitro.publicAssets.map((asset) => asset.dir)).toContain(
      join(root, '.data/duxt-media/public')
    );
    expect(options.image.provider).toBe('custom');
    expect(options.image.dirs).toContain(customImages);
    expect(options.image.dirs).toContain(join(root, '.data/duxt-media/public'));
    const content = {
      body: { value: [['img', { src: '../_assets/demo.gif' }]] }
    };
    hooks.get('content:file:afterParse')!({
      file: { path: join(root, 'docs/1.guides/1.demo.md') },
      collection: {
        source: [
          {
            duxtMedia: {
              root: join(root, 'docs'),
              prefix: '/_duxt/media/test',
              files: ['_assets/demo.gif']
            }
          }
        ]
      },
      content
    } as never);
    expect(content.body.value[0]![1]).toEqual({
      src: '/_duxt/media/test/_assets/demo.gif'
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
