import type { ContentNavigationItem } from '@nuxt/content';

/** The order Terraform Registry gives the generated provider categories. */
const CATEGORY_ORDER = [
  'index',
  'guides',
  'resources',
  'data-sources',
  'ephemeral-resources',
  'list-resources',
  'actions',
  'state-stores',
  'functions'
] as const;

type TfplugindocsPage = Record<string, unknown>;
type NavigationItem = ContentNavigationItem & { subcategory?: string };

/**
 * Bring tfplugindocs' Registry-oriented metadata into the ordinary page shape.
 *
 * The files remain ordinary Markdown pages: this only replaces the title a
 * sidebar reads and carries the generator's directory category forward. The
 * body is deliberately untouched, so a provider still renders on the Registry.
 */
export function normaliseTfplugindocsPage(
  page: TfplugindocsPage,
  file: string
) {
  const category = categoryForFile(file);
  const title =
    headingTitle(page.title) ?? pageTitle(page.page_title) ?? fileName(file);

  page.title = title;
  page.category = category;
}

function headingTitle(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;

  return value.replace(/\s+\([^)]*\)\s*$/, '').trim();
}

function pageTitle(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;

  return (
    value
      // tfplugindocs writes `<name> <kind> - <provider>`; providers may call
      // themselves `linear` as well as `terraform-provider-linear`.
      .replace(/\s+-\s+[^\s]+\s*$/, '')
      .replace(
        /\s+(?:resource|data source|ephemeral resource|list resource|action|state store|function|provider)\s*$/i,
        ''
      )
      .trim()
  );
}

function fileName(file: string) {
  return (
    file
      .split('/')
      .at(-1)
      ?.replace(/\.[^.]+$/, '') || 'index'
  );
}

function categoryForFile(file: string) {
  const parts = file.split('/').filter(Boolean);
  const name = fileName(file);
  return name === 'index' ? 'index' : (parts.at(-2) ?? 'index');
}

/**
 * Shape a tfplugindocs collection's ordinary Content tree for provider docs.
 *
 * Content already makes the directory categories. Only their Registry order
 * and tfplugindocs' frontmatter-only `subcategory` need layer work. Groups
 * receive synthetic paths solely as stable Vue keys; they never become routes.
 */
export function tfplugindocsNavigation(
  tree: ContentNavigationItem[],
  prefix: string
): ContentNavigationItem[] {
  return orderCategories(tree, prefix).map(groupSubcategories);
}

function orderCategories(
  items: ContentNavigationItem[],
  prefix: string
): ContentNavigationItem[] {
  return [...items]
    .sort((left, right) => {
      const difference =
        categoryRank(left.path, prefix) - categoryRank(right.path, prefix);
      return difference || left.title.localeCompare(right.title);
    })
    .map((item) => ({
      ...item,
      ...(item.children?.length
        ? { children: orderCategories(item.children, prefix) }
        : {})
    }));
}

function categoryRank(path: string | undefined, prefix: string) {
  if (path === prefix) return 0;

  const category = path?.slice(prefix.length).split('/').filter(Boolean)[0];
  const rank = CATEGORY_ORDER.indexOf(
    category as (typeof CATEGORY_ORDER)[number]
  );
  return rank === -1 ? CATEGORY_ORDER.length + 1 : rank + 1;
}

function groupSubcategories(
  item: ContentNavigationItem
): ContentNavigationItem {
  const children = item.children?.map(groupSubcategories);
  if (!children?.length) return item;

  const pages = children as NavigationItem[];
  const grouped = new Map<string, NavigationItem[]>();
  const direct: NavigationItem[] = [];

  for (const child of pages) {
    if (!child.subcategory) {
      direct.push(child);
      continue;
    }

    const group = grouped.get(child.subcategory) ?? [];
    group.push(child);
    grouped.set(child.subcategory, group);
  }

  if (!grouped.size) return { ...item, children };

  const groups = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([title, members], index) => ({
      title,
      path: `${item.path ?? ''}/__duxt-subcategory-${index}`,
      children: [...members].sort((left, right) =>
        left.title.localeCompare(right.title)
      )
    }));

  return {
    ...item,
    children: [
      ...direct.sort((left, right) => left.title.localeCompare(right.title)),
      ...groups
    ]
  };
}
