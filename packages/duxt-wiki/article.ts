import { wikiCategory } from './queries';
import type { WikiPage } from './metadata';

/** Split only the render copy: Content's cached body and anchors stay intact. */
export function splitWikiBody(body: unknown) {
  const document = (body ?? {}) as {
    value?: unknown[];
    [key: string]: unknown;
  };
  const nodes = document.value ?? [];
  const first = nodes.findIndex(
    (node) => Array.isArray(node) && /^h[2-6]$/.test(String(node[0]))
  );
  const at = first < 0 ? nodes.length : first;
  return {
    lead: { ...document, value: nodes.slice(0, at) },
    rest: { ...document, value: nodes.slice(at) }
  };
}

export const wikiCategorySlug = (name: string) =>
  name.trim().normalize('NFC').toLowerCase().replace(/\s+/g, '-');
export function wikiCategoryName(segment: string, names: string[]) {
  return names.find(
    (name) => wikiCategorySlug(name) === wikiCategorySlug(segment)
  );
}

/** One level of child groups is enough to orient a reader, including cycles. */
export function wikiNavboxGroups(pages: WikiPage[], name: string) {
  const category = wikiCategory(pages, name);
  const groups = [
    {
      title: category.page?.title ?? name,
      path: category.page?.path,
      pages: category.members.filter((p) => !category.subcategories.includes(p))
    }
  ];
  const seen = new Set(groups[0]!.pages.map((p) => p.path));
  for (const child of category.subcategories) {
    const members = wikiCategory(pages, child.title).members.filter(
      (p) => !/\/category\//.test(p.path) && !seen.has(p.path)
    );
    members.forEach((p) => seen.add(p.path));
    groups.push({ title: child.title, path: child.path, pages: members });
  }
  return groups.filter((group) => group.pages.length);
}
