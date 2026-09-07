import type { PageRecord } from '../../../validate-report';
import { report } from '../../../validate-report';
import {
  code,
  dim,
  editor,
  escape,
  filter,
  row,
  stat,
  stats,
  table,
  tag
} from '../shell';

/**
 * The three panels that read the content itself, rather than the config.
 *
 * All three describe what the RUNNING site holds: the queries in
 * `../content.ts` ask Content's own database, the same one the pages render
 * from, and hand the result here. A panel that parsed its own copy of the
 * Markdown would answer about a site that does not exist.
 */

export interface Doc {
  path: string;
  title?: string;
  description?: string;
  icon?: string;
  id?: string;
  lastUpdated?: string;
  contributors?: { name: string }[];
  body?: unknown;
}

export interface DocGroup {
  collection: string;
  docs: Doc[];
}

/** Every page, with what the frontmatter and the git history gave it. */
export function renderPages(groups: DocGroup[], rootDir = ''): string {
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
        editor(doc.id, doc.id?.split('/').slice(1).join('/'), rootDir)
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
        'Content produced no pages here. Every URL under this prefix is a 404 — check the source’s `path` and `refs`; the Checks panel reports it as an error.'
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
export function renderChecks(
  sources: DuxtResolvedSource[],
  pages: PageRecord[],
  rootDir = ''
): string {
  const { errors, warnings, notes } = report(sources, pages);

  const list = (findings: string[], kind: string) =>
    table(
      ['', kind === 'error' ? 'Error' : 'Warning'],
      findings.map((finding) =>
        row([tag(kind, kind), fileLinked(finding, rootDir)])
      )
    );

  const summary = stats([
    stat(pages.length, 'pages checked'),
    stat(sources.length, 'collections'),
    stat(errors.length, 'errors', errors.length ? 'error' : 'ok'),
    stat(warnings.length, 'warnings', warnings.length ? 'warn' : 'ok')
  ]);

  // Notes are not findings and must not read like them: a language's coverage
  // is a state of the site, and putting it in the warnings table would make
  // every translated site look as though something were wrong with it.
  //
  // A note indented by two spaces belongs UNDER the line above it — the report
  // is one summary per language followed by the files behind the figure, and
  // HTML collapses that indent to a single space if it is left as text.
  const coverage = notes.length
    ? `<h2>Translations</h2><ul class="steps">${notes
        .map((note) =>
          note.startsWith('  ')
            ? `<li class="dim" style="margin-left:1.5rem">${fileLinked(note.trim(), rootDir)}</li>`
            : `<li><strong>${fileLinked(note, rootDir)}</strong></li>`
        )
        .join('')}</ul>`
    : '';

  return `${summary}${errors.length ? `<h2>Errors</h2>${list(errors, 'error')}` : ''}${
    warnings.length ? `<h2>Warnings</h2>${list(warnings, 'warn')}` : ''
  }${coverage}`;
}

/**
 * Findings name their file in quotes; turn the first one into an editor link.
 *
 * The message stays exactly the string the build prints — the two must not
 * drift — so the link is added by reading it rather than by threading a second
 * field through the report.
 */
function fileLinked(finding: string, rootDir: string): string {
  const match = /"([^"]+\.md)"/.exec(finding);
  if (!match) return escape(finding);

  const [quoted, file] = match;

  return (
    escape(finding.slice(0, match.index)) +
    editor(file, quoted, rootDir) +
    escape(finding.slice(match.index + quoted.length))
  );
}

export interface IndexedSection {
  collection: string;
  id: string;
  title?: string;
  titles?: string[];
  content?: string;
}

/**
 * What the search index holds.
 *
 * The search had three separate bugs — a filter fighting a filter, results that
 * were heading fragments, table cells run together without separators — and all
 * three were invisible because nobody could see the sections the index is built
 * from. This is that list, with the same query the client runs.
 */
export function renderSearch(term: string, sections: IndexedSection[]): string {
  const form = `<form method="get">
    <input type="search" name="q" value="${escape(term)}" placeholder="A word as a reader would type it" autofocus>
    <button type="submit">Search</button>
  </form>`;

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
      ? `Nothing in the index matches “${escape(term)}”. FTS5 matches terms and prefixes, so a typo returns nothing.`
      : 'The index is empty.'
  )}`;
}
