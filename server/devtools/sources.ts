import type { H3Event } from 'h3';
import { queryCollection } from '@nuxt/content/nitro';
import { stripLocalePrefix } from '../../app/utils/locale-path';
import { sourceForPath } from '../../app/utils/version-paths';
import { context, resolvedSources } from './context';
import type { FoundPage } from './render/sources';
import { renderPaths, renderSources, renderVersions } from './render/sources';

/**
 * The queries behind the three source panels.
 *
 * The resolver is pure and already tested, so none of this reimplements it: the
 * panels call the same functions the theme calls, and hand what came back to
 * `render/sources.ts`. A panel that computed its own answer would be able to
 * disagree with the site, which is the one thing a debugging view must not do.
 */

/** Content stores a page under its full path, prefix included. */
const collectionsOf = () =>
  resolvedSources().map((source) => source.collection) as Parameters<
    typeof queryCollection
  >[1][];

/** Every page path the site serves, by collection. */
async function pathsByCollection(
  event: H3Event
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();

  await Promise.all(
    collectionsOf().map(async (name) => {
      try {
        const pages = await queryCollection(event, name)
          .select('path')
          .order('path', 'ASC')
          .all();

        result.set(
          name,
          pages.map((page) => page.path)
        );
      } catch {
        // A collection Content dropped is exactly what the Checks panel is for;
        // here it is simply a collection with no pages.
        result.set(name, []);
      }
    })
  );

  return result;
}

/** The sources table — what a consumer wrote, as the site resolved it. */
export function sourcesPanel(): string {
  return renderSources(resolvedSources(), context.appConfigFile);
}

/** The path debugger: which source claims a URL, and what it finds there. */
export async function pathsPanel(
  event: H3Event,
  input: string
): Promise<string> {
  const sources = resolvedSources();
  const locales = context.locales;

  if (!input) {
    return renderPaths({
      input,
      locales,
      sources,
      found: null,
      byCollection: new Map()
    });
  }

  // The same two pure calls the renderer walks the reader through, repeated
  // here only to know WHICH collection to query. Cheap, and it keeps the
  // renderer free of the database.
  const documentationPath = stripLocalePrefix(input, locales);
  const source = sourceForPath(documentationPath, sources);

  let found: FoundPage | null = null;

  if (source) {
    try {
      found = (await queryCollection(
        event,
        source.collection as Parameters<typeof queryCollection>[1]
      )
        .path(documentationPath)
        .first()) as unknown as FoundPage | null;
    } catch {
      found = null;
    }
  }

  return renderPaths({
    input,
    locales,
    sources,
    found,
    byCollection: await pathsByCollection(event)
  });
}

/** Which version — and which language — carries which page. */
export async function versionsPanel(event: H3Event): Promise<string> {
  return renderVersions(resolvedSources(), await pathsByCollection(event));
}
