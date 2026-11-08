import { wikiName, wikiPage, type WikiPage } from './metadata';

export const WIKI_FIELDS = [
  'path',
  'title',
  'type',
  'links',
  'categories',
  'aliases'
] as const;
/** A Content query boundary; callers bind the request or browser themselves. */
export type WikiReader = (
  collection: string,
  offset: number,
  limit: number
) => Promise<unknown[]>;

/** One metadata read per batch, shared by every link on the requesting page. */
export async function loadWikiPages(
  read: WikiReader,
  collections: string[]
): Promise<WikiPage[]> {
  const pages: WikiPage[] = [];
  for (const collection of new Set(collections)) {
    for (let offset = 0; ; offset += 64) {
      const rows = await read(collection, offset, 64);
      for (const row of rows) {
        const page = wikiPage(row, collection);
        if (page) pages.push(page);
      }
      if (rows.length < 64) break;
    }
  }
  return pages;
}

export interface WikiResolution {
  target: string;
  /** Zero = missing, more than one = ambiguous. Never guess a shared name. */
  pages: WikiPage[];
}

/** A fallback row is visible only where no earlier locale owns its path. */
function visiblePages(pages: WikiPage[]): WikiPage[] {
  const visible = new Map<string, WikiPage>();
  for (const page of pages)
    if (!visible.has(page.path)) visible.set(page.path, page);
  return [...visible.values()];
}

/** Collections are supplied in locale precedence; lower-priority names fall back. */
export function resolveWikiTargets(
  pages: WikiPage[],
  targets: string[],
  prefix = ''
): WikiResolution[] {
  pages = visiblePages(pages);
  return targets.map((target) => {
    const name = wikiName(target.split('#')[0]!.split('?')[0]!);
    if (!name) return { target, pages: [] };
    const path = name.startsWith('~/')
      ? name.slice(1)
      : prefix &&
          !name.startsWith(`${wikiName(prefix)}/`) &&
          name !== wikiName(prefix)
        ? `${wikiName(prefix)}/${name.replace(/^\//, '')}`
        : `/${name.replace(/^\//, '')}`;
    const matched = pages.filter(
      (page) =>
        wikiName(page.path) === path ||
        (!name.startsWith('/') &&
          !name.startsWith('~/') &&
          [page.title, ...page.aliases].some(
            (value) => wikiName(value) === name
          ))
    );
    const collection = matched[0]?.collection;
    return {
      target,
      pages: matched.filter((page) => page.collection === collection)
    };
  });
}

export function wikiIncoming(
  pages: WikiPage[],
  target: WikiPage,
  prefix = ''
): WikiPage[] {
  pages = visiblePages(pages);
  return pages.filter((page) =>
    page.links.some((link) => {
      if (link.kind === 'markdown' && /^(?:[a-z]+:|\/\/)/i.test(link.target))
        return false;
      const name =
        link.kind === 'markdown' &&
        !link.target.startsWith('/') &&
        !link.target.startsWith('~/')
          ? new URL(link.target, `https://wiki.invalid${page.path}`).pathname
          : link.target;
      const result = resolveWikiTargets(pages, [name], prefix)[0]!;
      return result.pages.length === 1 && result.pages[0]!.path === target.path;
    })
  );
}

function categoryNames(page: WikiPage): string[] {
  return [
    page.title,
    ...page.aliases,
    decodeURIComponent(page.path.split('/').at(-1)!)
  ];
}

function categoryPage(pages: WikiPage[], name: string): WikiPage | undefined {
  return pages.find(
    (page) =>
      /\/category\/[^/]+$/.test(page.path) &&
      categoryNames(page).some((value) => wikiName(value) === wikiName(name))
  );
}

export function wikiCategory(pages: WikiPage[], name: string) {
  pages = visiblePages(pages);
  const page = categoryPage(pages, name);
  const identities = new Set(
    [name, ...(page ? categoryNames(page) : [])].map(wikiName)
  );
  const members = pages.filter((entry) =>
    entry.categories.some((category) => identities.has(wikiName(category)))
  );
  return {
    name,
    page,
    parents: page?.categories ?? [],
    members,
    subcategories: members.filter((entry) =>
      /\/category\/[^/]+$/.test(entry.path)
    )
  };
}

/** Category cycles are content findings; callers report them without failing. */
export function wikiCategoryCycles(pages: WikiPage[]): string[][] {
  const cycles: string[][] = [];
  const complete = new Set<string>();
  const visit = (page: WikiPage, stack: WikiPage[]) => {
    const key = `${page.collection}\0${page.path}`;
    const at = stack.findIndex(
      (entry) =>
        entry.collection === page.collection && entry.path === page.path
    );
    if (at !== -1) {
      cycles.push([...stack.slice(at), page].map((entry) => entry.title));
      return;
    }
    if (complete.has(key)) return;
    for (const parent of page.categories) {
      const resolved = categoryPage(
        pages.filter((entry) => entry.collection === page.collection),
        parent
      );
      if (resolved) visit(resolved, [...stack, page]);
    }
    complete.add(key);
  };
  for (const page of pages.filter((entry) =>
    /\/category\/[^/]+$/.test(entry.path)
  ))
    visit(page, []);
  return cycles;
}
