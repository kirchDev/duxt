import type { H3Event } from 'h3';
import {
  queryCollection,
  queryCollectionSearchSections
} from '@nuxt/content/nitro';
import type { PageRecord } from '../../validate-report';
import { walk } from '../../validate-report';
import { context, resolvedSources } from './context';
import type { Doc, DocGroup, IndexedSection } from './render/content';
import { renderChecks, renderPages, renderSearch } from './render/content';

/**
 * The queries behind the three content panels.
 *
 * All three ask the running site — `queryCollection` against the database the
 * pages render from — instead of re-reading Markdown off disk. A panel that
 * parsed its own copy would answer about a site that does not exist. What comes
 * back goes to `render/content.ts`, which turns it into the tables.
 */

async function docsOf(event: H3Event, fields?: string[]): Promise<DocGroup[]> {
  const sources = resolvedSources();

  return Promise.all(
    sources.map(async (source) => {
      try {
        const query = queryCollection(
          event,
          source.collection as Parameters<typeof queryCollection>[1]
        );
        const docs = (await (
          fields ? query.select(...(fields as ['path'])) : query
        )
          .order('path', 'ASC')
          .all()) as unknown as Doc[];

        return { collection: source.collection, docs };
      } catch {
        return { collection: source.collection, docs: [] };
      }
    })
  );
}

/** Every page, with what the frontmatter and the git history gave it. */
export async function pagesPanel(event: H3Event): Promise<string> {
  const groups = await docsOf(event, [
    'path',
    'title',
    'description',
    'icon',
    'id',
    'lastUpdated',
    'contributors'
  ]);

  return renderPages(groups, context.rootDir);
}

/** The build validator, run against the served site. */
export async function checksPanel(event: H3Event): Promise<string> {
  const sources = resolvedSources();
  const groups = await docsOf(event);

  const pages: PageRecord[] = groups.flatMap(({ collection, docs }) =>
    docs.map((doc) => {
      const anchors = new Set<string>();
      const links: { href: string }[] = [];
      walk(doc.body, anchors, links);

      return {
        collection,
        path: doc.path,
        file: doc.id ?? doc.path,
        title: doc.title,
        description: doc.description,
        anchors,
        links
      };
    })
  );

  return renderChecks(sources, pages, context.rootDir);
}

/** What the search index holds, through the same query the client runs. */
export async function searchPanel(
  event: H3Event,
  term: string
): Promise<string> {
  const sources = resolvedSources();

  const sections = (
    await Promise.all(
      sources.map(async (source) => {
        try {
          const found = await queryCollectionSearchSections(
            event,
            source.collection as Parameters<
              typeof queryCollectionSearchSections
            >[1]
          );

          return found.map((section) => ({
            collection: source.collection,
            ...section
          })) as IndexedSection[];
        } catch {
          return [] as IndexedSection[];
        }
      })
    )
  ).flat();

  return renderSearch(term, sections);
}
