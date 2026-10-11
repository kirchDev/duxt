import { defineEventHandler, setHeader } from 'h3';
import { duxtDocPage } from '../utils/doc-page';
import { duxtLocaleSetup, duxtSources } from '../utils/mcp-docs';
import { stripFrontmatter } from '../../build/content/frontmatter';

/**
 * `…/guide/deploying.md` serves the page's Markdown source.
 *
 * What "View as Markdown" opens, and what the ChatGPT and Claude links hand
 * over — a model given the rendered HTML has to undo a layout to find a
 * heading, and one given this reads what the author wrote.
 *
 * A MIDDLEWARE, not a route. Nitro's router matches path segments, and `.md` is
 * a suffix on the last one rather than a segment of its own, so there is no
 * pattern that means "any path ending in .md". The middleware answers those and
 * hands everything else straight on.
 */
export default defineEventHandler(async (event) => {
  const path = event.path?.split('?')[0];
  if (!path?.endsWith('.md')) return;

  const found = await duxtDocPage(
    event,
    path.slice(0, -'.md'.length),
    duxtSources(),
    duxtLocaleSetup(event)
  );
  const page = found?.page;

  // No page is not this middleware's error to raise: falling through lets the
  // app answer with its own 404, which knows how to suggest a near miss.
  if (!page) return;

  const body = (page as { rawbody?: string }).rawbody;
  if (!body) return;

  setHeader(event, 'content-type', 'text/markdown; charset=utf-8');
  return stripFrontmatter(body).trim();
});
