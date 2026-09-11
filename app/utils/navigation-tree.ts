import type { ContentNavigationItem } from '@nuxt/content';

/** Pages in reading order, with non-page groups expanded into their members. */
export function flattenedNavigationPages(
  items: ContentNavigationItem[]
): ContentNavigationItem[] {
  const pages: ContentNavigationItem[] = [];

  for (const item of items) {
    if (item.page !== false) pages.push(item);
    if (item.children?.length) {
      pages.push(...flattenedNavigationPages(item.children));
    }
  }

  return pages;
}

/** Actual pages, including dotted version paths; folder wrappers are not pages. */
export function navigationPagePaths(items: ContentNavigationItem[]): string[] {
  const paths = new Set<string>();
  for (const item of items) {
    if (item.children?.length) {
      for (const path of navigationPagePaths(item.children)) paths.add(path);
    } else {
      paths.add(item.path);
    }
  }
  return [...paths];
}

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
 *
 * A PAGE IN NO CONFIGURED SECTION STILL GETS ONE BRANCH, not the whole tree.
 * `sections` is the consumer's reading order, and a tree holds folders it does
 * not list — `99.adr/` is the standing example, an appendix by construction. The
 * fallback used to hand back `tree`, so the sidebar on such a page listed every
 * section and every page under all of them at once, while the page beside it
 * showed one branch. That reads as the sidebar breaking rather than as a page
 * being outside the reading order, and it gets worse the larger the tree is.
 *
 * So the fallback narrows to the branch the route is actually in, and only
 * reaches for the whole tree when the route matches no top-level node at all —
 * a site with no sections configured, where the whole tree IS the branch.
 */
export function sectionItems(
  tree: ContentNavigationItem[],
  sectionPath: string | undefined,
  routePath: string
): ContentNavigationItem[] {
  const branch =
    (sectionPath ? findByPath(tree, sectionPath) : undefined) ??
    // Longest match, so a nested folder wins over the one above it.
    tree
      .filter((node) => node.path && routePath.startsWith(node.path))
      .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0))[0];

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

/**
 * A folder wearing the title of its own index page.
 *
 * Content names a directory node after the DIRECTORY, so `99.adr/` arrives as
 * "Adr" — while the `index.md` inside it, which is the page that node leads to,
 * says "Architecture decisions". The two are the same destination under two
 * names, and the shorter one is a slug rather than a title: the sidebar grouped
 * eight records under "Adr" and the breadcrumb read "Adr › …".
 *
 * It only shows where a folder's name and its index title differ, which is why
 * it went unnoticed — `4.reference/` is "Reference" either way. An abbreviated
 * or hyphenated folder is where it bites, and a consumer's tree is full of
 * those.
 *
 * The index is identified by carrying the FOLDER'S OWN path: Content emits it
 * as a child of the node, not as a sibling. Nothing else in the tree can hold
 * that path, so there is no ambiguity to resolve.
 *
 * Applied to the base tree BEFORE any translation overlay, so a locale that
 * translates the index title carries it up here too.
 */
export function titleFoldersFromIndex(
  items: ContentNavigationItem[]
): ContentNavigationItem[] {
  return items.map((item) => {
    if (!item.children?.length) return item;

    const index = item.children.find((child) => child.path === item.path);

    return {
      ...item,
      ...(index?.title ? { title: index.title } : {}),
      children: titleFoldersFromIndex(item.children)
    };
  });
}

/**
 * The icon a navigation entry draws, if any.
 *
 * Three levels, most specific first: the page's own frontmatter, the `pageIcon`
 * of the section it sits in, then `duxt.pageIcon` for the whole site. Absent at
 * every level means no icon, which is the right default — one symbol repeated
 * down a whole sidebar distinguishes nothing.
 *
 * The section is matched by path prefix, longest first, so a section nested
 * under another wins over the one above it. Pure, and separated from the
 * components that call it, because the precedence is the part worth testing —
 * rendering an `<Icon>` is not.
 */
export function resolvePageIcon(
  item: { icon?: unknown; path?: string },
  sections: { to?: string; pageIcon?: string }[] | undefined,
  fallback: string | undefined
): string | undefined {
  if (typeof item.icon === 'string' && item.icon) return item.icon;

  const section = (sections ?? [])
    .filter((entry) => entry.to && item.path?.startsWith(entry.to))
    .sort((a, b) => (b.to?.length ?? 0) - (a.to?.length ?? 0))[0];

  return section?.pageIcon ?? fallback;
}
