import { fileURLToPath } from 'node:url';
import type { Nuxt } from '@nuxt/schema';
import { readDuxtBuildConfig } from '../duxt-app-config';
import { duxtSourceManifest, reservedSegments } from '../sources-resolve';
import { resolveLatestRefs } from '../sources-git';
import { readContentCache } from '../content-cache';

/**
 * Catch the silent failures.
 *
 * Every bug this layer actually had was quiet: a collection Content dropped
 * because its name was not an identifier, a page that 404ed because a link had
 * gone stale, a navigation that came back empty. None of the three said
 * anything — the build was green and the site was wrong.
 *
 * All four checks read ONE thing: the parse cache, through
 * `readContentCache`. See that file for why the parse hook is the wrong seam.
 *
 * Severity is not uniform, on purpose:
 *
 *  - a URL collision or an empty collection is an ERROR, because the page it
 *    costs is unreachable and no amount of reading the site would say why;
 *  - a broken link or a missing `title` is a WARNING naming the file, because
 *    the page still renders and a remote source can go stale between releases
 *    without that being this build's fault.
 */
interface PageRecord {
  collection: string;
  path: string;
  file: string;
  title?: string;
  description?: string;
  anchors: Set<string>;
  links: { href: string }[];
}

export default function duxtValidate(_options: unknown, nuxt: Nuxt) {
  const layerDir = fileURLToPath(new URL('..', import.meta.url));

  const dirs = [
    ...nuxt.options._layers.flatMap((entry) => [
      entry.config.rootDir,
      entry.config.srcDir
    ]),
    layerDir
  ].filter(Boolean) as string[];

  const config = readDuxtBuildConfig(dirs);
  const sources = duxtSourceManifest(
    resolveLatestRefs(config?.sources ?? [{ path: 'docs' }]),
    config?.sourceOptions ?? {}
  );

  // `build:done` rather than `modules:done`: Content fills the cache in a
  // `modules:done` listener of its own, and this module is registered before
  // Content so its listener would run first and read the previous build's
  // answer.
  nuxt.hook('build:done', () => {
    const cached = readContentCache(
      nuxt,
      sources.map((source) => source.collection)
    );

    if (!cached) return;

    const pages: PageRecord[] = cached.map((entry) => {
      const anchors = new Set<string>();
      const links: { href: string }[] = [];
      walk(entry.content.body, anchors, links);

      return {
        collection: entry.collection,
        path: entry.path,
        file: entry.file,
        title:
          typeof entry.content.title === 'string'
            ? entry.content.title
            : undefined,
        description:
          typeof entry.content.description === 'string'
            ? entry.content.description
            : undefined,
        anchors,
        links
      };
    });

    const problems = report(sources, pages);

    for (const warning of problems.warnings) {
      console.warn(`[duxt] ${warning}`);
    }

    if (problems.errors.length) {
      throw new Error(
        `duxt: the documentation did not validate.\n  - ${problems.errors.join('\n  - ')}`
      );
    }
  });
}

/** Collect anchor ids and internal links out of a parsed MDC body. */
function walk(
  node: unknown,
  anchors: Set<string>,
  links: { href: string }[]
): void {
  if (Array.isArray(node)) {
    const [tag, props] = node as [unknown, Record<string, unknown> | undefined];

    if (typeof tag === 'string' && props && typeof props === 'object') {
      if (typeof props.id === 'string') anchors.add(props.id);

      if (tag === 'a' && typeof props.href === 'string') {
        links.push({ href: props.href });
      }
    }

    for (const child of node) walk(child, anchors, links);
    return;
  }

  if (node && typeof node === 'object') {
    for (const value of Object.values(node as Record<string, unknown>)) {
      walk(value, anchors, links);
    }
  }
}

/**
 * The checks themselves, over data rather than over a build.
 *
 * Separated so they can be run in a test: a build that has to be started to
 * find out whether the validator works is a validator nobody changes.
 */
export function report(
  sources: { collection: string; prefix: string }[],
  pages: PageRecord[]
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const byCollection = new Map<string, PageRecord[]>();
  for (const page of pages) {
    const list = byCollection.get(page.collection) ?? [];
    list.push(page);
    byCollection.set(page.collection, list);
  }

  // 1. A collection with nothing in it. The symptom is an empty sidebar and a
  //    404 on every page of one version — never a message.
  for (const source of sources) {
    if (!byCollection.get(source.collection)?.length) {
      errors.push(
        `collection "${source.collection}" (serving "${source.prefix || '/'}") ` +
          "contains no pages. Check the source's `path` and `refs`."
      );
    }
  }

  // 2. A docs folder named like a repository or a version segment. The prefix
  //    wins, so the folder is simply unreachable.
  const reserved = reservedSegments(sources as never);

  for (const source of sources) {
    const claimed = reserved.get(source.collection);
    if (!claimed?.size) continue;

    for (const page of byCollection.get(source.collection) ?? []) {
      const rest = source.prefix
        ? page.path.slice(source.prefix.length)
        : page.path;
      const segment = rest.split('/')[1];

      if (segment && claimed.has(segment)) {
        errors.push(
          `"${page.file}" sits in a folder called "${segment}", which is ` +
            `already a repository or version segment under "${source.prefix || '/'}". ` +
            'Rename the folder, or give the source a `slug`.'
        );
      }
    }
  }

  // 3. Frontmatter. Neither field breaks a page; both quietly degrade the
  //    table of contents, the OG image and llms.txt.
  for (const page of pages) {
    const missing = [
      !page.title && 'title',
      !page.description && 'description'
    ].filter(Boolean);

    if (missing.length) {
      warnings.push(`"${page.file}" has no ${missing.join(' and no ')}.`);
    }
  }

  // 4. Links. Internal ones only — an external URL is not this build's to
  //    verify, and checking it would put the network in the build.
  //
  //    Resolved exactly as `ProseA` resolves them at render time: an absolute
  //    path written in a page is relative to that page's OWN source, so it is
  //    tried under the source's prefix first and bare second. Checking only the
  //    bare form reports every correct link on a prefixed site.
  const known = new Map(pages.map((page) => [page.path, page]));
  const prefixOf = new Map(
    sources.map((source) => [source.collection, source.prefix])
  );

  for (const page of pages) {
    const prefix = prefixOf.get(page.collection) ?? '';

    for (const link of page.links) {
      const { href } = link;
      if (!href.startsWith('/') && !href.startsWith('#')) continue;

      const [target, anchor] = href.split('#');
      const destination = target
        ? (known.get(stripTrailingSlash(`${prefix}${target}`)) ??
          known.get(stripTrailingSlash(target)))
        : page;

      if (target && !destination) {
        warnings.push(
          `"${page.file}" links to "${href}", which no page serves.`
        );
        continue;
      }

      if (anchor && destination && !destination.anchors.has(anchor)) {
        warnings.push(
          `"${page.file}" links to "${href}", but that page has no "${anchor}" heading.`
        );
      }
    }
  }

  return { errors, warnings };
}

const stripTrailingSlash = (path: string) =>
  path.length > 1 ? path.replace(/\/+$/, '') : path;
