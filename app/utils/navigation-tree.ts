import type { ContentNavigationItem } from '@nuxt/content';

/** Find a node by path, anywhere in the tree. */
export function findByPath(
  items: ContentNavigationItem[],
  path: string
): ContentNavigationItem | undefined {
  for (const item of items) {
    if (item.path === path) return item;

    const inside = item.children?.length
      ? findByPath(item.children, path)
      : undefined;
    if (inside) return inside;
  }

  return undefined;
}

/**
 * The entries a section's sidebar should show.
 *
 * A multi-segment prefix makes Content wrap the tree in intermediate nodes —
 * `/workflows/v0.7.0` gets a `/workflows` node above it — and rendering those
 * gave a collapsible group whose only child was itself. So after picking the
 * section's branch, walk down while there is exactly one node the route is
 * still inside.
 */
export function sectionItems(
  tree: ContentNavigationItem[],
  sectionPath: string | undefined,
  routePath: string
): ContentNavigationItem[] {
  const branch = sectionPath ? findByPath(tree, sectionPath) : undefined;

  let items = branch?.children?.length
    ? branch.children
    : branch
      ? [branch]
      : tree;

  while (items.length === 1) {
    const [only] = items;
    if (
      !only?.children?.length ||
      !only.path ||
      !routePath.startsWith(only.path)
    )
      break;

    items = only.children;
  }

  return items;
}

/**
 * The crumbs between the section and the page.
 *
 * Anything at or above the source's own prefix is one of those wrapper nodes,
 * not a page anyone navigates to — it showed up as an extra crumb on a
 * versioned URL that the unversioned one did not have.
 */
export function trailBelowPrefix(
  tree: ContentNavigationItem[],
  path: string,
  prefix: string
): ContentNavigationItem[] {
  const found: ContentNavigationItem[] = [];

  const walk = (
    items: ContentNavigationItem[],
    ancestors: ContentNavigationItem[]
  ): boolean => {
    for (const item of items) {
      const chain = [...ancestors, item];

      if (item.path === path) {
        found.push(...chain);
        return true;
      }

      if (item.children?.length && walk(item.children, chain)) return true;
    }

    return false;
  };

  walk(tree, []);

  return found.filter((item) => (item.path?.length ?? 0) > prefix.length);
}

/**
 * The original's tree, wearing the titles a translation has for it.
 *
 * A translated tree is almost never complete — two pages of forty is the normal
 * state of every documentation project that has ever tried this — and both
 * obvious answers are wrong. Building the sidebar from the TRANSLATION hides
 * every page that has none, although the fallback serves them perfectly well;
 * building it from the ORIGINAL leaves a reader in German looking at an
 * English table of contents.
 *
 * So the structure comes from the original, which is complete by definition,
 * and each node takes the translated title and description where one exists.
 * The sidebar is then always navigable and says, entry by entry, how far the
 * translation has got.
 */
export function overlayTranslations(
  tree: ContentNavigationItem[],
  translated: Map<string, { title?: string; description?: string }>
): ContentNavigationItem[] {
  return tree.map((item) => {
    const match = item.path ? translated.get(item.path) : undefined;

    return {
      ...item,
      ...(match?.title ? { title: match.title } : {}),
      ...(match?.description ? { description: match.description } : {}),
      ...(item.children?.length
        ? { children: overlayTranslations(item.children, translated) }
        : {})
    };
  });
}
