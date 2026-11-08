import type { H3Event } from 'h3';
import type { DuxtResolvedSource } from '../../build/sources/sources-resolve';
import { stripFrontmatter } from '../../build/content/frontmatter';

export interface DuxtMarkdownPage {
  markdown: string;
  path: string;
  source: DuxtResolvedSource;
  locale?: string;
  pageType?: string;
}

declare module 'h3' {
  interface H3EventContext {
    /** One request-bound output adapter; duxt-wiki resolves authored links here. */
    duxtMarkdown?: (page: DuxtMarkdownPage) => Promise<string>;
  }
}

/** All machine outputs pass through this seam; authored Content rows stay intact. */
export async function duxtPageMarkdown(
  event: H3Event,
  page: Omit<DuxtMarkdownPage, 'markdown'> & { rawbody?: string }
): Promise<string> {
  const markdown = stripFrontmatter(page.rawbody ?? '').trim();
  return event.context.duxtMarkdown
    ? await event.context.duxtMarkdown({
        markdown,
        path: page.path,
        source: page.source,
        locale: page.locale,
        pageType: page.pageType
      })
    : markdown;
}
