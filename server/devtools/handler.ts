import { rmSync } from 'node:fs';
import type { H3Event } from 'h3';
import { context } from './context';
import { page, PANELS } from './shell';
import { pathsPanel, sourcesPanel, versionsPanel } from './sources';
import { checksPanel, pagesPanel, searchPanel } from './content';
import { cacheEntryToDrop } from './entry-path';
import { cachePanel, configPanel, i18nPanel, redirectsPanel } from './system';

/**
 * The devtools tab, as one route with a panel per path segment.
 *
 * NOT under `server/routes/`, and that is the point. Nitro scans a layer's
 * `server/routes/` and registers what it finds — in every build, dev or not —
 * so a file there is a production route no matter what the module that
 * "registers" it decides. The tab shipped that way once: `/_duxt/devtools` was
 * in the production server bundle, serving the resolved configuration, absolute
 * filesystem paths and a POST that deletes a directory, while
 * `modules/devtools.ts` returned early believing it had prevented exactly that.
 * Sitting outside the scanned directory, the handler exists only because the
 * dev-only module points Nitro at it by path. Everything the panels show is computed per
 * request out of the RUNNING app config and the served database, not out of a
 * snapshot taken when the module loaded: the first version froze its data into
 * a virtual module, and editing `app.config.ts` then left the tab confidently
 * describing the previous state, which is the one thing a debugging view must
 * never do.
 */
export default defineEventHandler(async (event) => {
  const slug = ((event.context.params?._ as string | undefined) ?? '').replace(
    /^\/+|\/+$/g,
    ''
  );

  if (slug && !PANELS.some((panel) => panel.slug === slug)) {
    setResponseStatus(event, 404);
    return html(page('', '<div class="note">No such panel.</div>'));
  }

  // The one mutation in the tab: dropping a cache entry. A POST because it
  // deletes, so a reload or a prefetch cannot trigger it.
  if (event.method === 'POST' && slug === 'cache') {
    const body = (await readBody(event)) as { drop?: string } | undefined;
    const target = cacheEntryToDrop(context.dataDir, body?.drop);

    if (!target) {
      return html(
        page(
          slug,
          cachePanel('That name is not an entry of the cache directory.')
        )
      );
    }

    rmSync(target, { recursive: true, force: true });

    return html(
      page(
        slug,
        cachePanel(`Dropped ${body?.drop}. The next build re-downloads it.`)
      )
    );
  }

  const query = getQuery(event) as { path?: string; q?: string };

  const body = await panelBody(event, slug, query);

  return html(page(slug, body));
});

function panelBody(
  event: H3Event,
  slug: string,
  query: { path?: string; q?: string }
): string | Promise<string> {
  switch (slug) {
    case 'paths':
      return pathsPanel(event, query.path ?? '');
    case 'pages':
      return pagesPanel(event);
    case 'versions':
      return versionsPanel(event);
    case 'checks':
      return checksPanel(event);
    case 'search':
      return searchPanel(event, query.q ?? '');
    case 'config':
      return configPanel();
    case 'i18n':
      return i18nPanel();
    case 'cache':
      return cachePanel();
    case 'redirects':
      return redirectsPanel();
    default:
      return sourcesPanel();
  }
}

function html(body: string) {
  return new Response(body, {
    headers: { 'content-type': 'text/html; charset=utf-8' }
  });
}
