import type { H3Event } from 'h3';
import {
  queryCollection,
  queryCollectionSearchSections
} from '@nuxt/content/nitro';
import type { PageRecord } from '../../validate-report';
import { report, walk } from '../../validate-report';
import {
  code,
  dim,
  editor,
  escape,
  resolvedSources,
  row,
  table,
  tag
} from './shell';

/**
 * The three panels that read the content itself, rather than the config.
 *
 * All three ask the running site — `queryCollection` against the database the
 * pages render from — instead of re-reading Markdown off disk. A panel that
 * parsed its own copy would answer about a site that does not exist.
 */

interface Doc {
  path: string;
  title?: string;
  description?: string;
  icon?: string;
  id?: string;
  lastUpdated?: string;
  contributors?: { name: string }[];
  body?: unknown;
}

async function docsOf(
  event: H3Event,
  fields?: string[]
): Promise<{ collection: string; docs: Doc[] }[]> {
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

  return groups
    .map(({ collection, docs }) => {
      const rows = docs.map((doc) =>
        row([
          code(doc.path),
          escape(doc.title) || tag('missing', 'warn'),
          doc.description ? dim('yes') : tag('missing', 'warn'),
          doc.icon ? code(doc.icon) : dim('—'),
          doc.lastUpdated
            ? escape(doc.lastUpdated.slice(0, 10))
            : dim('no history'),
          doc.contributors?.length
            ? escape(String(doc.contributors.length))
            : dim('—'),
          editor(doc.id, doc.id?.split('/').slice(1).join('/'))
        ])
      );

      return `<h2>${escape(collection)} ${dim(`(${docs.length})`)}</h2>${table(
        [
          'Path',
          'Title',
          'Description',
          'Icon',
          'Last updated',
          'Contributors',
          'File'
        ],
        rows
      )}${
        docs.length
          ? ''
          : '<div class="note">Content produced no pages for this collection. The Checks panel says so as an error — it means a wrong <code>path</code> or <code>refs</code>, and every URL under this prefix is a 404.</div>'
      }`;
    })
    .join('');
}

/**
 * The build validator, run against the served site.
 *
 * Identical checks to `pnpm build`, from `validate-report.ts` — the point is
 * not a second opinion but a place where the findings stay put. A warning
 * printed during a build has scrolled away by the time anyone reads it, and
 * "last updated" on a broken link is exactly when you want the file name.
 */
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

  const { errors, warnings } = report(sources, pages);

  const list = (findings: string[], kind: string) =>
    table(
      ['', kind === 'error' ? 'Error' : 'Warning'],
      findings.map((finding) => row([tag(kind, kind), fileLinked(finding)]))
    );

  const summary =
    !errors.length && !warnings.length
      ? `<div class="note">${tag('clean', 'ok')} ${pages.length} pages across ${sources.length} collections, nothing to report.</div>`
      : `<div class="note">${pages.length} pages checked — ${errors.length} error(s), ${warnings.length} warning(s).</div>`;

  return `${summary}${errors.length ? `<h2>Errors</h2>${list(errors, 'error')}` : ''}${
    warnings.length ? `<h2>Warnings</h2>${list(warnings, 'warn')}` : ''
  }`;
}

/**
 * Findings name their file in quotes; turn the first one into an editor link.
 *
 * The message stays exactly the string the build prints — the two must not
 * drift — so the link is added by reading it rather than by threading a second
 * field through the report.
 */
function fileLinked(finding: string): string {
  const match = /"([^"]+\.md)"/.exec(finding);
  if (!match) return escape(finding);

  const [quoted, file] = match;

  return (
    escape(finding.slice(0, match.index)) +
    editor(file, quoted) +
    escape(finding.slice(match.index + quoted.length))
  );
}

/**
 * What the search index holds.
 *
 * The search had three separate bugs — a filter fighting a filter, results that
 * were heading fragments, table cells run together without separators — and all
 * three were invisible because nobody could see the sections the index is built
 * from. This is that list, with the same query the client runs.
 */
export async function searchPanel(
  event: H3Event,
  term: string
): Promise<string> {
  const form = `<form method="get">
    <input type="search" name="q" value="${escape(term)}" placeholder="A word as a reader would type it" autofocus>
    <button type="submit">Search</button>
  </form>`;

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
          }));
        } catch {
          return [];
        }
      })
    )
  ).flat();

  const needle = term.trim().toLowerCase();

  const matching = needle
    ? sections.filter(
        (section) =>
          section.title?.toLowerCase().includes(needle) ||
          section.content?.toLowerCase().includes(needle)
      )
    : sections;

  const rows = matching
    .slice(0, 200)
    .map((section) =>
      row([
        code(section.collection),
        code(section.id),
        escape(section.title),
        escape((section.titles ?? []).join(' › ')) || dim('—'),
        `${escape((section.content ?? '').slice(0, 180))}${(section.content ?? '').length > 180 ? dim(' …') : ''}`
      ])
    );

  const note = `<div class="note">${sections.length} sections indexed in total${
    needle ? `, ${matching.length} matching` : ''
  }${matching.length > 200 ? ', showing the first 200' : ''}. One row per heading, which is what the dialog groups back into pages.</div>`;

  return `${form}${note}${table(
    ['Collection', 'Id', 'Heading', 'Under', 'Indexed text'],
    rows
  )}`;
}
