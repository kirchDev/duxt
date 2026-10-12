import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync
} from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { resolvesInside } from '../sections/section-input';

const PRIVATE_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  '.data',
  '.nuxt',
  '.output',
  '.turbo',
  '.cache'
]);

const IMAGES = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.avif',
  '.apng',
  '.ico'
]);

export const documentationMediaDirectory = (root = process.cwd()) =>
  join(root, '.data/duxt-media/public');

export interface DocumentationMedia {
  root: string;
  prefix: string;
  files: string[];
}

/** Publish only image outputs in _assets, leaving capture sources private. */
export function publishDocumentationMedia(
  root: string,
  output: string,
  identity: string,
  checkout?: string
): DocumentationMedia {
  const prefix = `/_duxt/media/${createHash('sha256').update(identity).digest('hex')}`;
  const media: DocumentationMedia = { root, prefix, files: [] };
  if (!existsSync(root) || lstatSync(root).isSymbolicLink()) return media;
  if (checkout && !resolvesInside(root, checkout)) return media;
  const outputRoot = resolve(output);
  const descend = (directory: string, asset = false) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (
          !PRIVATE_DIRECTORIES.has(entry.name) &&
          resolve(absolute) !== outputRoot
        )
          descend(absolute, asset || entry.name === '_assets');
      } else if (
        asset &&
        entry.isFile() &&
        IMAGES.has(extname(entry.name).toLowerCase())
      ) {
        const target = join(output, prefix, relative(root, absolute));
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(absolute, target);
        media.files.push(relative(root, absolute).split(sep).join('/'));
      }
    }
  };
  descend(root);
  return media;
}

/** Resolve file-relative documentation images; external/public images pass through. */
export function documentationImageUrl(
  value: string,
  file: string,
  media: DocumentationMedia
): string {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return value;
  const owner = relative(media.root, file);
  if (owner === '..' || owner.startsWith(`..${sep}`)) return value;
  const match = /^([^?#]*)(.*)$/.exec(value)!;
  let path: string;
  try {
    path = decodeURIComponent(match[1]!);
  } catch {
    return value;
  }
  const absolute = path.startsWith('/')
    ? resolve(media.root, `.${path}`)
    : resolve(dirname(file), path);
  const rel = relative(media.root, absolute).split(sep).join('/');
  if (
    rel.startsWith('../') ||
    rel === '..' ||
    !rel.split('/').includes('_assets') ||
    !media.files.includes(rel)
  )
    return value;
  return `${media.prefix}/${rel.split('/').map(encodeURIComponent).join('/')}${match[2]}`;
}

/** Rewrite only image nodes in Content's compressed MDC tree. */
export function rewriteDocumentationImages(
  content: Record<string, unknown>,
  file: string,
  media: DocumentationMedia
): void {
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      const [tag, props] = node;
      if (
        ['img', 'prose-img', 'ProseImg'].includes(tag) &&
        props &&
        typeof props === 'object'
      ) {
        for (const key of ['src', 'dark']) {
          if (typeof props[key] === 'string')
            props[key] = documentationImageUrl(props[key], file, media);
        }
      }
      for (const child of node) walk(child);
    } else if (node && typeof node === 'object') {
      for (const child of Object.values(node)) walk(child);
    }
  };
  walk(content.body);
}
