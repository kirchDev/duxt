/**
 * What the navbar menus need to know about a tree of links.
 *
 * Pure and shared because the two navbar rows, the mobile sheet and the section
 * scoping all have to agree on it: an entry may hold a menu any depth deep, and
 * the page being read may be anywhere inside it.
 */
import { isInside } from './version-paths';

interface MenuNode {
  to?: string;
  children?: MenuNode[];
}

/** Every destination an entry holds: its own, then those below it. */
export function menuTargets(entry: MenuNode): string[] {
  return [
    ...(entry.to ? [entry.to] : []),
    ...(entry.children ?? []).flatMap(menuTargets)
  ];
}

/** Where an entry is, which for a menu without a `to` is its first link. */
export function menuAnchor(entry: MenuNode): string | undefined {
  return menuTargets(entry)[0];
}

/** Every entry that goes somewhere, at any depth, parents before children. */
export function menuLinks<T extends MenuNode>(entries: readonly T[]): T[] {
  return entries.flatMap((entry) => [
    ...(entry.to ? [entry] : []),
    ...menuLinks((entry.children ?? []) as T[])
  ]);
}

/** Whether the page being read is this entry or anywhere inside its menu. */
export function menuOwns(entry: MenuNode, path: string): boolean {
  return menuTargets(entry).some((to) => to !== '/' && isInside(path, to));
}

/**
 * What an entry's menu lists.
 *
 * A trigger opens its menu, so it cannot be a link as well. An entry that names
 * a destination AND holds children would lose that destination, so the entry
 * leads its own menu instead.
 */
export function menuEntries(link: DuxtLink): DuxtLink[] {
  const children = link.children ?? [];
  if (!link.to) return children;

  return [
    {
      ...link,
      children: undefined,
      menu: undefined,
      columns: undefined,
      width: undefined,
      divided: undefined,
      span: undefined,
      hideLabel: undefined,
      image: undefined,
      display: undefined
    },
    ...children
  ];
}

/** How an entry is drawn: what it asks for, else a card if it has an image. */
export function menuDisplay(link: DuxtLink): NonNullable<DuxtLink['display']> {
  return link.display ?? (link.image ? 'card' : 'row');
}

/** A mega menu's column count: as configured, else what its cells fill, to 4. */
export function megaColumns(link: DuxtLink): number {
  const filled = (link.children ?? []).reduce(
    (total, cell) => total + Math.max(cell.span ?? 1, 1),
    0
  );
  return Math.max(link.columns ?? Math.min(filled, 4), 1);
}

export interface MegaCell {
  entry: DuxtLink;
  span: number;
  divided: boolean;
}

/**
 * A mega menu's cells, placed.
 *
 * The rule between columns needs to know which cell starts a row, because a
 * rule down the panel's own left edge is not between anything, and that depends
 * on the spans of every cell before it.
 */
export function megaCells(link: DuxtLink): MegaCell[] {
  const columns = megaColumns(link);
  let column = 0;

  return (link.children ?? []).map((entry) => {
    const span = Math.min(Math.max(entry.span ?? 1, 1), columns);
    if (column + span > columns) column = 0;
    const divided = column > 0 && Boolean(entry.divided ?? link.divided);
    column = (column + span) % columns;
    return { entry, span, divided };
  });
}
