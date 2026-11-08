import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import type { CachedPage } from '../content/content-cache';

export interface DuxtReportNotes {
  sections: { heading: string; lines: string[] }[];
  warnings: string[];
}
const file = (root: string) => join(root, '.data/duxt/report-notes.json');
const layersFile = (root: string) => join(root, '.data/duxt/build-layers.json');
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
function contentIdentity(pages: CachedPage[]) {
  const digest = createHash('sha256');
  for (const page of [...pages].sort((a, b) =>
    `${a.collection}\0${a.path}`.localeCompare(`${b.collection}\0${b.path}`)
  ))
    digest.update(JSON.stringify([page.collection, page.path, page.content]));
  return digest.digest('hex');
}

/** A report receipt, never query input. The real Wiki producer writes after parsing. */
export function writeReportNotes(
  root: string,
  producer: string,
  pages: CachedPage[],
  notes: DuxtReportNotes
): void {
  if (!existsSync(layersFile(root))) return;
  const target = file(root);
  mkdirSync(dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(
    temporary,
    JSON.stringify({
      version: 1,
      producer,
      layers: hash(readFileSync(layersFile(root), 'utf8')),
      content: contentIdentity(pages),
      ...notes
    })
  );
  renameSync(temporary, target);
}

/** Optional absence is silent; removed layers cannot leave active findings behind. */
export function readReportNotes(
  root: string,
  pages: CachedPage[]
): DuxtReportNotes | undefined {
  try {
    const receipt = JSON.parse(readFileSync(file(root), 'utf8'));
    const rawLayers = readFileSync(layersFile(root), 'utf8');
    const layers = JSON.parse(rawLayers) as { layers?: { dir?: string }[] };
    if (!layers.layers?.some((layer) => layer.dir === receipt.producer)) return;
    if (
      receipt.version !== 1 ||
      receipt.layers !== hash(rawLayers) ||
      receipt.content !== contentIdentity(pages)
    )
      return {
        sections: [
          {
            heading: 'Additional report notes',
            lines: ['Report notes are stale; build or pack the site again.']
          }
        ],
        warnings: []
      };
    if (
      !Array.isArray(receipt.warnings) ||
      !receipt.warnings.every((line: unknown) => typeof line === 'string') ||
      !Array.isArray(receipt.sections) ||
      !receipt.sections.every(
        (section: { heading?: unknown; lines?: unknown }) =>
          typeof section?.heading === 'string' &&
          Array.isArray(section.lines) &&
          section.lines.every((line: unknown) => typeof line === 'string')
      )
    )
      return;
    return { sections: receipt.sections, warnings: receipt.warnings };
  } catch {
    return;
  }
}
