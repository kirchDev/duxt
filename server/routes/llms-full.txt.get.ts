import { llmsPages } from '../utils/llms-pages';
// Imported by path, not auto-import: app/ belongs to the Vue app, and Nitro
// does not see its utils. The defaults have to come from the same file the
// pages use, or the two descriptions drift apart.
import { duxtDefaults, mergeDuxtConfig } from '../../app/utils/duxt-config';
import {
  resolveServerTexts,
  stripFrontmatter
} from '../utils/duxt-server-text';

/**
 * llms-full.txt — the whole documentation as one Markdown file.
 *
 * The duxt extension beside `llms.txt`, which is the llms.txt convention's
 * index: a model that has read the index still has to fetch sixty pages, and a
 * model given this one has read them.
 *
 * The Markdown as written, not the rendered HTML — which is why the collection
 * schema asks Content for `rawbody`. An MDC block reaches the reader as the
 * component call it is, and a code fence is still a fence.
 */
export default defineEventHandler(async (event) => {
  const appConfig = useAppConfig() as { duxt?: Partial<DuxtConfig> };
  // Resolved here because Nitro has no i18n: without it the description is
  // printed as the translation key it is.
  const duxt = resolveServerTexts(
    mergeDuxtConfig(appConfig.duxt, duxtDefaults)
  );

  const pages = await llmsPages(event, duxt.resolvedSources);

  const origin = getRequestURL(event).origin;

  const lines = [
    `# ${duxt.title}`,
    '',
    `> ${duxt.landing?.description ?? 'Documentation.'}`,
    ''
  ];

  for (const page of pages
    .filter((page) => page.path)
    .sort((a, b) => a.path!.localeCompare(b.path!))) {
    lines.push(
      `---`,
      '',
      `# ${page.title ?? page.path}`,
      '',
      `Source: ${origin}${page.path}`,
      ''
    );

    if (page.description) lines.push(`> ${page.description}`, '');

    // A page whose collection was declared before `rawbody` was asked for has
    // none. Its title and URL are still worth listing.
    const body = (page as { rawbody?: string }).rawbody;
    if (body) lines.push(stripFrontmatter(body).trim(), '');
  }

  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return lines.join('\n');
});
