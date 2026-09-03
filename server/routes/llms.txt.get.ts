import { queryCollection } from '@nuxt/content/nitro';
// Imported by path, not auto-import: app/ belongs to the Vue app, and Nitro
// does not see its utils. The defaults have to come from the same file the
// pages use, or the two descriptions drift apart.
import { duxtDefaults, mergeDuxtConfig } from '../../app/utils/duxt-config';

/**
 * llms.txt — the site's own map, for a model reading it.
 *
 * The convention (llmstxt.org) is a Markdown index: an H1 with the site name,
 * a blockquote summary, then linked sections. It is generated from the same
 * collection the pages render from, so it cannot drift from what is published.
 */
export default defineEventHandler(async (event) => {
  const appConfig = useAppConfig(event) as { duxt?: Partial<DuxtConfig> };
  const duxt = mergeDuxtConfig(appConfig.duxt, duxtDefaults);

  const pages = await queryCollection(event, 'docs')
    .select('path', 'title', 'description')
    .all();

  const origin = getRequestURL(event).origin;

  const lines = [
    `# ${duxt.title}`,
    '',
    `> ${duxt.landing?.description ?? 'Documentation.'}`,
    '',
    '## Pages',
    '',
    ...pages
      .filter((page) => page.path)
      .sort((a, b) => a.path!.localeCompare(b.path!))
      .map(
        (page) =>
          `- [${page.title ?? page.path}](${origin}${page.path})` +
          (page.description ? `: ${page.description}` : '')
      ),
    ''
  ];

  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return lines.join('\n');
});
