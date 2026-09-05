import { queryCollection } from '@nuxt/content/nitro';
import { duxtDefaults, mergeDuxtConfig } from '../../app/utils/duxt-config';
import { resolveServerTexts } from '../utils/duxt-server-text';

/**
 * An RSS feed over one section — a changelog, a release log, a blog.
 *
 * Not over the whole documentation. A feed is a list of things that HAPPENED,
 * and a reference page being edited is not an event; a site publishing every
 * page edit as an item teaches its readers to unsubscribe. So the feed is off
 * until `duxt.feed.path` names the section whose pages are events, and empty
 * rather than missing before that: a feed client should be told there is
 * nothing here, not that the feed is gone.
 *
 * Ordering is by the page's own `date`, falling back to the last commit that
 * touched it — which `modules/git-meta.ts` has already put on the page.
 */
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
      })[character] ?? character
  );

export default defineEventHandler(async (event) => {
  const appConfig = useAppConfig() as { duxt?: Partial<DuxtConfig> };
  // Resolved here because Nitro has no i18n: without it the description is
  // printed as the translation key it is.
  const duxt = resolveServerTexts(
    mergeDuxtConfig(appConfig.duxt, duxtDefaults)
  );

  const origin = getRequestURL(event).origin;
  const feed = duxt.feed;
  const title = typeof feed?.title === 'string' ? feed.title : undefined;

  const items: {
    path: string;
    title: string;
    description?: string;
    date?: string;
  }[] = [];

  if (feed?.path) {
    const collections = duxt.resolvedSources?.length
      ? duxt.resolvedSources
          // One version of a changelog, not four. The default version is the
          // one a feed reader wants; the others repeat every entry.
          .filter((source) => source.isDefault)
          .map((source) => source.collection)
      : ['docs'];

    const pages = (
      await Promise.all(
        collections.map((name) =>
          queryCollection(event, name as Parameters<typeof queryCollection>[1])
            .select('path', 'title', 'description', 'date', 'lastUpdated')
            .all()
        )
      )
    ).flat() as {
      path?: string;
      title?: string;
      description?: string;
      date?: string;
      lastUpdated?: string;
    }[];

    for (const page of pages) {
      if (!page.path?.startsWith(feed.path)) continue;
      if (page.path === feed.path) continue;

      items.push({
        path: page.path,
        title: page.title ?? page.path,
        description: page.description,
        date: page.date ?? page.lastUpdated
      });
    }

    items.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }

  const body = items
    .map(
      (item) => `    <item>
      <title>${escape(item.title)}</title>
      <link>${escape(origin + item.path)}</link>
      <guid isPermaLink="true">${escape(origin + item.path)}</guid>${
        item.description
          ? `\n      <description>${escape(item.description)}</description>`
          : ''
      }${
        item.date
          ? `\n      <pubDate>${new Date(item.date).toUTCString()}</pubDate>`
          : ''
      }
    </item>`
    )
    .join('\n');

  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(title ?? String(duxt.title))}</title>
    <link>${escape(origin)}</link>
    <description>${escape(
      typeof duxt.landing?.description === 'string'
        ? duxt.landing.description
        : 'Documentation.'
    )}</description>
    <atom:link href="${escape(`${origin}/rss.xml`)}" rel="self" type="application/rss+xml" />
${body}
  </channel>
</rss>
`;
});
