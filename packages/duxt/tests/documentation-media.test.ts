import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import {
  publishDocumentationMedia,
  documentationImageUrl,
  rewriteDocumentationImages
} from '../build/sources/documentation-media';

const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true }))
);

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'duxt-media-'));
  roots.push(root);
  const docs = join(root, 'docs');
  const output = join(root, 'public');
  mkdirSync(join(docs, '_assets'), { recursive: true });
  mkdirSync(join(docs, '1.guides'), { recursive: true });
  writeFileSync(join(docs, '_assets/demo.gif'), 'generated animation');
  return { docs, output };
}

it('publishes a docs-only image and resolves its authored relative reference', () => {
  const { docs, output } = fixture();
  const media = publishDocumentationMedia(docs, output, 'local docs');
  const url = documentationImageUrl(
    '../_assets/demo.gif',
    join(docs, '1.guides/1.demo.md'),
    media
  );
  expect(url).toMatch(/^\/_duxt\/media\/[^/]+\/_assets\/demo\.gif$/);
  expect(readFileSync(join(output, url), 'utf8')).toBe('generated animation');
});

it('rewrites parsed images and dark variants while preserving page links and code', () => {
  const { docs, output } = fixture();
  const media = publishDocumentationMedia(docs, output, 'local docs');
  const content = {
    body: {
      value: [
        [
          'img',
          { src: '../_assets/demo.gif', dark: '../_assets/demo-dark.png' }
        ],
        ['a', { href: '../_assets/demo.gif' }],
        ['pre', {}, '![Example](../_assets/demo.gif)']
      ]
    }
  };
  rewriteDocumentationImages(content, join(docs, '1.guides/1.demo.md'), media);
  expect(content.body.value[0]![1]).toEqual({
    src: `${media.prefix}/_assets/demo.gif`,
    dark: `${media.prefix}/_assets/demo-dark.png`
  });
  expect(content.body.value[1]![1]).toEqual({ href: '../_assets/demo.gif' });
  expect(content.body.value[2]![2]).toBe('![Example](../_assets/demo.gif)');
});

it('does not publish a documentation root symlinked outside the source checkout', () => {
  const { docs, output } = fixture();
  const checkout = join(docs, '../checkout');
  mkdirSync(checkout);
  const linked = join(checkout, 'docs');
  symlinkSync(docs, linked);
  const media = publishDocumentationMedia(linked, output, 'remote docs');
  expect(existsSync(join(output, media.prefix, '_assets/demo.gif'))).toBe(
    false
  );
});

it('keeps remote media inside the checkout when an ancestor directory is a symlink', () => {
  const { docs, output } = fixture();
  const checkout = join(docs, '../checkout');
  mkdirSync(checkout);
  symlinkSync(join(docs, '..'), join(checkout, 'linked'));
  const media = publishDocumentationMedia(
    join(checkout, 'linked/docs'),
    output,
    'remote docs',
    checkout
  );
  expect(existsSync(join(output, media.prefix, '_assets/demo.gif'))).toBe(
    false
  );
});
