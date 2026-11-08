import type { InfoboxData } from './infobox';
import type { WikiReader } from './queries';

export const INFOBOX_FIELDS = ['path', 'title', 'infobox'] as const;

export interface InfoboxPage {
  collection: string;
  path: string;
  title: string;
  infobox: InfoboxData | null;
}

/** Read every scoped page, including rows whose translation removes its box. */
export async function loadInfoboxPages(
  read: WikiReader,
  collections: string[]
): Promise<InfoboxPage[]> {
  const pages: InfoboxPage[] = [];
  for (const collection of new Set(collections)) {
    for (let offset = 0; ; offset += 64) {
      const rows = await read(collection, offset, 64);
      for (const value of rows) {
        if (!value || typeof value !== 'object') continue;
        const row = value as Record<string, unknown>;
        if (typeof row.path !== 'string') continue;
        pages.push({
          collection,
          path: row.path,
          title: typeof row.title === 'string' ? row.title : '',
          infobox: (row.infobox as InfoboxData | null) ?? null
        });
      }
      if (rows.length < 64) break;
    }
  }
  return pages;
}

/** Text equality is portable; JSON membership is not a Content SQL operation. */
export function selectInfoboxPages(
  pages: InfoboxPage[],
  type: string,
  where = ''
): InfoboxPage[] {
  const visible = new Map<string, InfoboxPage>();
  for (const page of pages)
    if (!visible.has(page.path)) visible.set(page.path, page);
  const equals = where.indexOf('=');
  if (where && equals < 1) return [];
  const key = where.slice(0, equals).trim();
  const value = where.slice(equals + 1).trim();
  return [...visible.values()].filter(
    (page) =>
      page.infobox?.type === type &&
      (!where ||
        (Object.hasOwn(page.infobox.values, key) &&
          page.infobox.values[key] === value))
  );
}

export function infoboxCell(page: InfoboxPage, column: string): string {
  return column === 'title'
    ? page.title
    : page.infobox && Object.hasOwn(page.infobox.values, column)
      ? page.infobox.values[column]!
      : '';
}
