import type { ContentNavigationItem } from '@nuxt/content';

type Item = ContentNavigationItem & {
  navigationRank?: number;
  navigationGroup?: string;
};

function minimumRank(items: Item[]): number | undefined {
  const ranks = items
    .map((item) => item.navigationRank)
    .filter((rank): rank is number => typeof rank === 'number');
  return ranks.length ? Math.min(...ranks) : undefined;
}

/** Ordinary Content order stays intact until pages explicitly supply ordering data. */
export function orderedNavigation(
  items: ContentNavigationItem[]
): ContentNavigationItem[] {
  const ranked = items.map((item): Item => {
    if (!item.children?.length) return { ...item };
    const children = orderedNavigation(item.children) as Item[];
    const own = (item.children as Item[]).find(
      (child) => child.path === item.path
    );
    return {
      ...item,
      navigationRank: own
        ? own.navigationRank
        : (minimumRank(children) ?? (item as Item).navigationRank),
      children
    };
  });
  const explicit = ranked.some(
    (item) => item.navigationRank !== undefined || item.navigationGroup
  );
  if (!explicit) return ranked;
  const compare = (first: Item, second: Item) =>
    (first.navigationRank ?? Infinity) - (second.navigationRank ?? Infinity) ||
    first.title.localeCompare(second.title);
  const groups = new Map<string, Item[]>();
  const direct: Item[] = [];
  for (const item of ranked) {
    if (!item.navigationGroup) direct.push(item);
    else {
      const group = groups.get(item.navigationGroup) ?? [];
      group.push(item);
      groups.set(item.navigationGroup, group);
    }
  }
  return [
    ...direct.sort(compare),
    ...[...groups]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([title, children], index) => ({
        title,
        path: `${children[0]!.path.slice(0, children[0]!.path.lastIndexOf('/'))}/__duxt-group-${index}`,
        page: false as const,
        navigationRank: minimumRank(children),
        children: children.sort(compare)
      }))
  ];
}
