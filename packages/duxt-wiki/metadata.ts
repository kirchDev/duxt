import { wikiNodeToken, wikiTokens } from './wikilinks.ts';

export interface WikiLink {
  target: string;
  kind: 'markdown' | 'wiki';
}

export interface WikiPage {
  collection: string;
  path: string;
  title: string;
  type?: string;
  links: WikiLink[];
  categories: string[];
  aliases: string[];
}

/** Locale-independent matching, shared by names, aliases and memberships. */
export const wikiName = (name: string) =>
  name.trim().normalize('NFC').toLowerCase();

function names(value: unknown): string[] {
  const seen = new Set<string>();
  return (Array.isArray(value) ? value : []).flatMap((entry) => {
    if (typeof entry !== 'string' || !entry.trim() || seen.has(wikiName(entry)))
      return [];
    seen.add(wikiName(entry));
    return [entry.trim()];
  });
}

/** Mutates the parsed document before Content persists its cache and SQL row. */
export function collectWikiMetadata(page: Record<string, unknown>): void {
  const rawbody = typeof page.rawbody === 'string' ? page.rawbody : undefined;
  const links: WikiLink[] = [];
  const seen = new Set<string>();
  const add = (target: string, kind: WikiLink['kind']) => {
    const key = `${kind}\0${target}`;
    if (!target || seen.has(key)) return;
    seen.add(key);
    links.push({ target, kind });
  };
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      for (const token of rawbody === undefined
        ? wikiTokens(node, false)
        : []) {
        add(
          node
            .slice(token.start + 2, token.end - 2)
            .split('|')[0]!
            .trim(),
          'wiki'
        );
      }
    } else if (Array.isArray(node)) {
      const [tag, props, ...children] = node;
      if (
        typeof tag === 'string' &&
        props &&
        typeof props === 'object' &&
        !Array.isArray(props)
      ) {
        if (tag === 'code' || tag === 'pre') return;
        const token = wikiNodeToken(node);
        if (token) {
          add(
            token.target + (token.section ? '#' + token.section : ''),
            'wiki'
          );
          return;
        }
        if (tag === 'a' && typeof props.href === 'string') {
          add(props.href, 'markdown');
          return;
        }
        for (const child of children) walk(child);
      } else for (const child of node) walk(child);
    } else if (node && typeof node === 'object') {
      // TOC and frontmatter are not authored body nodes.
      const body = node as { value?: unknown; children?: unknown };
      if (body.value) walk(body.value);
      else if (body.children) walk(body.children);
    }
  };
  walk(page.body);
  page.links = links;
  page.categories = names(page.categories);
  page.aliases = names(page.aliases);
}

export function wikiPage(
  value: unknown,
  collection: string
): WikiPage | undefined {
  if (!value || typeof value !== 'object') return;
  const row = value as Record<string, unknown>;
  if (typeof row.path !== 'string') return;
  return {
    collection,
    path: row.path,
    title: typeof row.title === 'string' ? row.title : '',
    ...(typeof row.type === 'string' ? { type: row.type } : {}),
    links: (Array.isArray(row.links) ? row.links : []).filter(
      (link): link is WikiLink =>
        link &&
        typeof link.target === 'string' &&
        ['markdown', 'wiki'].includes(link.kind)
    ),
    categories: names(row.categories),
    aliases: names(row.aliases)
  };
}
