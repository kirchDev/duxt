import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Read the deployed artefacts themselves; runtime URL overrides hide bad builds. */
export function checkStaticSeo(root: string, origin: string, sitemaps = false) {
  const failures: string[] = [];
  let pages = 0;
  let urls = 0;
  function check(value: string, file: string) {
    urls++;
    try {
      if (new URL(value.replaceAll('&amp;', '&')).origin !== origin)
        throw new Error();
    } catch {
      failures.push(`${relative(root, file)}: unexpected SEO origin: ${value}`);
    }
  }
  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      if (
        entry.name.endsWith('.xml') &&
        (entry.name.includes('sitemap') || directory.endsWith('__sitemap__'))
      ) {
        const xml = readFileSync(file, 'utf8');
        for (const loc of xml.matchAll(/<loc>([^<]+)<\/loc>/g))
          check(loc[1]!, file);
        for (const link of xml.matchAll(/<xhtml:link\b[^>]*>/g)) {
          const href = attributes(link[0]).href;
          if (href) check(href, file);
        }
      }
      if (!entry.name.endsWith('.html')) continue;
      // Static Nuxt devtools panels are embedded inspector assets, not pages
      // rendered by this site's documentation routes.
      if (relative(root, file).replaceAll('\\', '/').startsWith('devtools/'))
        continue;
      const head =
        readFileSync(file, 'utf8').match(
          /<head\b[^>]*>([\s\S]*?)<\/head>/i
        )?.[1] ?? '';
      const tags = [...head.matchAll(/<(?:link|meta)\b[^>]*>/gi)].map((tag) =>
        attributes(tag[0])
      );
      if (tags.some((tag) => tag['http-equiv'] === 'refresh')) continue;
      pages++;
      const canonicals = tags.filter((tag) => tag.rel === 'canonical');
      if (canonicals.length !== 1)
        failures.push(
          `${relative(root, file)}: expected one canonical, found ${canonicals.length}`
        );
      for (const tag of tags) {
        if (
          tag.rel === 'canonical' ||
          (tag.rel === 'alternate' && tag.hreflang)
        )
          check(tag.href ?? '', file);
        if (tag.property === 'og:url') check(tag.content ?? '', file);
      }
    }
  }
  walk(root);
  if (sitemaps && pages === 0) failures.push('No prerendered HTML was checked');
  if (sitemaps) {
    try {
      const index = readFileSync(join(root, 'sitemap_index.xml'), 'utf8');
      const children = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)];
      if (!children.length)
        failures.push('No locale sitemaps in sitemap_index.xml');
      for (const child of children) {
        const url = new URL(child[1]!);
        check(url.href, join(root, 'sitemap_index.xml'));
        const xml = readFileSync(join(root, url.pathname), 'utf8');
        if (!xml.includes('<urlset'))
          failures.push(`${url.pathname}: missing sitemap urlset`);
      }
    } catch (error) {
      failures.push(`Production sitemap missing or invalid: ${String(error)}`);
    }
  }
  return { failures, pages, urls };
}

function attributes(tag: string): Record<string, string> {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map((match) => [
      match[1]!.toLowerCase(),
      match[3]!
    ])
  );
}
