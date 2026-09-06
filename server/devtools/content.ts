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
  filter,
  resolvedSources,
  row,
  stat,
  stats,
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

  const total = groups.reduce((sum, group) => sum + group.docs.length, 0);
  const untitled = groups.reduce(
    (sum, group) => sum + group.docs.filter((doc) => !doc.title).length,
    0
  );
  const dated = groups.reduce(
    (sum, group) => sum + group.docs.filter((doc) => doc.lastUpdated).length,
    0
  );

  const summary = stats([
    stat(total, 'pages'),
    stat(groups.length, 'collections'),
    stat(dated, 'with history', dated ? '' : 'warn'),
    stat(untitled, 'without a title', untitled ? 'warn' : 'ok')
  ]);

  // One block per collection, the first opened: a site with five versions has
  // five near-identical tables, and all five expanded is a page nobody reads.
  const sections = groups.map(({ collection, docs }, index) => {
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

    return `<details${index === 0 ? ' open' : ''}>
      <summary>${escape(collection)} <span class="dim">${docs.length} pages</span></summary>
      ${docs.length > 12 ? filter(`Filter ${collection}`) : ''}
      ${table(
        [
          'Path',
          'Title',
          'Description',
          'Icon',
          'Last updated',
          'Contributors',
          'File'
        ],
        rows,
        'Content produced no pages here. Every URL under this prefix is a 404 — check the source\u2019s `path` and `refs`; the Checks panel reports it as an error.'
      )}
    </details>`;
  });

  return `${summary}${sections.join('')}`;
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

  const summary = stats([
    stat(pages.length, 'pages checked'),
    stat(sources.length, 'collections'),
    stat(errors.length, 'errors', errors.length ? 'error' : 'ok'),
    stat(warnings.length, 'warnings', warnings.length ? 'warn' : 'ok')
  ]);

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

  // The id is the longest string in the table and the least worth reading in
  // full, so it is the one that gets clipped — otherwise it takes the width the
  // indexed text needs, and the column that answers the question is a sliver.
  const rows = matching.slice(0, 200).map(
    (section) => `<tr>
      <td>${code(section.collection)}</td>
      <td><code class="trunc" title="${escape(section.id)}">${escape(section.id)}</code></td>
      <td>${escape(section.title)}</td>
      <td>${escape((section.titles ?? []).join(' › ')) || dim('—')}</td>
      <td class="wide">${escape((section.content ?? '').slice(0, 180))}${(section.content ?? '').length > 180 ? dim(' …') : ''}</td>
    </tr>`
  );

  const summary = stats([
    stat(sections.length, 'sections indexed'),
    needle
      ? stat(matching.length, 'matching', matching.length ? '' : 'warn')
      : undefined,
    matching.length > 200 ? stat(200, 'shown', 'warn') : undefined
  ]);

  return `${form}${summary}<div class="note">One row per heading — which is what the dialog groups back into pages. The text column is exactly what FTS5 matches against.</div>${table(
    ['Collection', 'Id', 'Heading', 'Under', 'Indexed text'],
    rows,
    needle
      ? `Nothing in the index matches \u201c${escape(term)}\u201d. FTS5 matches terms and prefixes, so a typo returns nothing.`
      : 'The index is empty.'
  )}`;
}
