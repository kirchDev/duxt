import { reservedSegments } from '../../../sources-resolve';
import { stripLocalePrefix } from '../../../app/utils/locale-path';
import { sourceForPath } from '../../../app/utils/version-paths';
import { code, dim, escape, row, stat, stats, table, tag } from '../shell';

/**
 * The three panels that answer "what did my `sources` list turn into".
 *
 * They share one idea: the resolver is pure and already tested, so none of this
 * reimplements it — the panels call the same functions the theme calls and
 * print what came back. A panel that computed its own answer would be able to
 * disagree with the site, which is the one thing a debugging view must not do.
 *
 * Data in, HTML out. The queries that produce that data live in
 * `../sources.ts`, and keeping the two apart is what lets the documentation
 * render these very panels from fixtures instead of shipping screenshots.
 */

export interface FoundPage {
  path: string;
  title?: string;
  id?: string;
}

/** The sources table — what a consumer wrote, as the site resolved it. */
export function renderSources(
  sources: DuxtResolvedSource[],
  appConfigFile?: string
): string {
  const reserved = reservedSegments(sources);

  const rows = sources.map((source) =>
    row([
      code(source.prefix || '/'),
      code(source.collection),
      source.repositoryUrl
        ? `<a class="file" href="${escape(source.repositoryUrl)}" target="_blank">${escape(source.repository)}</a>`
        : (escape(source.repository) ?? dim('this repository')),
      code(source.path),
      source.ref
        ? `${escape(source.ref)} ${dim(`(${source.refKind})`)}`
        : dim('checkout'),
      `${escape(source.version ?? '—')}${source.isDefault ? ` ${tag('default')}` : ''}`,
      source.status === 'current'
        ? tag('current', 'ok')
        : tag(source.status, source.status === 'eol' ? 'error' : 'warn'),
      (reserved.get(source.collection)
        ? [...reserved.get(source.collection)!]
        : []
      )
        .map((segment) => code(segment))
        .join(' ') || dim('—')
    ])
  );

  const configured = appConfigFile
    ? `<p class="hint">Configured in ${escape(appConfigFile)}.</p>`
    : '';

  const repos = new Set(
    sources.map((source) => source.repository ?? 'this repository')
  );
  const versioned = sources.filter((source) => source.version);
  const notCurrent = sources.filter((source) => source.status !== 'current');

  const summary = stats([
    stat(sources.length, sources.length === 1 ? 'collection' : 'collections'),
    stat(repos.size, repos.size === 1 ? 'repository' : 'repositories'),
    stat(versioned.length, 'versions'),
    // Not "the default version": with two repositories there are two defaults,
    // and the figure worth seeing is how many versions carry a warning the
    // reader will meet — deprecated, eol, or a branch still moving.
    stat(notCurrent.length, 'not current', notCurrent.length ? 'warn' : 'ok')
  ]);

  return `${summary}${table(
    [
      'Prefix',
      'Collection',
      'Repository',
      'Folder',
      'Ref',
      'Version',
      'Status',
      'Reserved segments'
    ],
    rows,
    'No sources resolved at all — `duxt.sources` is empty or unreadable.'
  )}${configured}`;
}

export interface PathsData {
  /** The URL as the reader pasted it, locale segment and all. */
  input: string;
  locales: string[];
  sources: DuxtResolvedSource[];
  /** The page the claiming collection holds at that path, if it holds one. */
  found: FoundPage | null;
  /** Every page path the site serves, by collection. */
  byCollection: Map<string, string[]>;
}

/**
 * The path debugger.
 *
 * Every version bug this repo had was a disagreement between what a URL looks
 * like and which source claims it — `/workflows/v0.7.0` 404ing, and
 * `/workflows/v0.7.0/v0.7.0` being generated. Both were arithmetic on prefixes
 * that nothing printed. This prints it.
 */
export function renderPaths({
  input,
  locales,
  sources,
  found,
  byCollection
}: PathsData): string {
  const form = `<form method="get">
    <input type="text" name="path" value="${escape(input)}" placeholder="/workflows/v0.7.0/guides/add-a-body" autofocus>
    <button type="submit">Resolve</button>
  </form>`;

  if (!input) {
    return `${form}<div class="note">Paste a URL as the browser shows it — locale segment included. The steps below are the ones the theme walks on every request.</div>`;
  }

  const steps: string[] = [];

  // 1. The locale segment, which is interface and not content.
  const documentationPath = stripLocalePrefix(input, locales);
  steps.push(
    documentationPath === input
      ? `No locale segment. Documentation path is ${code(input)}.`
      : `Locale segment stripped: ${code(input)} → ${code(documentationPath)}. ${dim('The locale translates the interface, never the content tree.')}`
  );

  // 2. Which source claims it, by longest prefix.
  const source = sourceForPath(documentationPath, sources);

  if (!source) {
    steps.push(
      `${tag('stops here', 'error')} No source claims this path, and none serves the root. Add a source without a prefix, or check the Sources panel.`
    );

    return `${form}<ol class="steps">${steps.map((step) => `<li>${step}</li>`).join('')}</ol>`;
  }

  steps.push(
    `Longest matching prefix is ${code(source.prefix || '/')} → collection ${code(source.collection)}${source.version ? `, version ${code(source.version)}` : ''}.`
  );

  // 3. Does that collection hold the page.
  if (found) {
    steps.push(
      `${tag('found', 'ok')} ${escape(found.title ?? documentationPath)} — ${escape(found.id ?? '')}`
    );
  } else {
    steps.push(
      `${tag('stops here', 'error')} Collection ${code(source.collection)} has no page at ${code(documentationPath)}.`
    );
  }

  const body = `<ol class="steps">${steps.map((step) => `<li>${step}</li>`).join('')}</ol>`;

  // 4. Whether it exists elsewhere. A page missing from one version and present
  //    in another is the fallback's case; a page missing everywhere is a typo.
  const rest = source.prefix
    ? documentationPath.slice(source.prefix.length)
    : documentationPath;

  // Only versions of the SAME repository: `/duxt/guide` and `/workflows/guide`
  // are two projects that happen to share a folder name, and putting them in
  // one table invents a comparison nobody asked for.
  const siblings = sources.filter(
    (other) =>
      (other.repo ?? other.repository) === (source.repo ?? source.repository)
  );

  const elsewhere = siblings.map((other) => {
    const candidate = `${other.prefix}${rest}` || '/';
    const has = byCollection.get(other.collection)?.includes(candidate);

    return row([
      code(other.prefix || '/'),
      escape(other.version ?? '—'),
      code(candidate),
      has ? tag('present', 'ok') : tag('missing', 'muted')
    ]);
  });

  const near = found
    ? ''
    : `<h2>Nearest paths in ${escape(source.collection)}</h2>${table(
        ['Path'],
        nearest(
          byCollection.get(source.collection) ?? [],
          documentationPath
        ).map((path) => row([code(path)]))
      )}`;

  return `${form}${body}<h2>The same page in other sources</h2>${table(['Prefix', 'Version', 'Would be', 'State'], elsewhere)}${near}`;
}

/** The handful of paths that share the longest leading run with the miss. */
function nearest(paths: string[], target: string): string[] {
  const score = (path: string) => {
    let index = 0;
    while (index < path.length && path[index] === target[index]) index += 1;
    return index;
  };

  return [...paths].sort((a, b) => score(b) - score(a)).slice(0, 8);
}

/**
 * Which version — and which language — carries which page.
 *
 * Nothing else shows this. The fallback's whole job is the gap between two
 * columns of this table, and until now the only way to find one was to open a
 * URL and see a 404. A translation falls back exactly the same way, so the
 * missing `de` page is the same question one axis over.
 */
export function renderVersions(
  sources: DuxtResolvedSource[],
  byCollection: Map<string, string[]>
): string {
  // Two groupings, one grid. Versions of different repositories share no paths
  // and would invent gaps that are not gaps — and a locale is that same case
  // one level down: `de` and `en` are two collections of the SAME version, so
  // comparing them as versions drew a matrix of identical columns whose
  // headings were all empty, because a translation carries neither a version
  // nor a prefix of its own. Each axis therefore holds the other fixed.
  const versions = groupBy(
    sources,
    (source) => `${repoKey(source)}\u0000${source.locale ?? ''}`
  );
  const locales = groupBy(
    sources,
    (source) => `${repoKey(source)}\u0000${source.version ?? ''}`
  );

  const sections = [
    ...versions.map((group) =>
      matrix(
        group,
        byCollection,
        (source) =>
          `${escape(source.version || source.ref || source.prefix || '—')}${source.isDefault ? ' *' : ''}`,
        group[0]!.locale ? tag(group[0]!.locale, 'muted') : '',
        '* the version served without a version segment.'
      )
    ),
    ...locales.map((group) =>
      matrix(
        group,
        byCollection,
        (source) =>
          `${escape(source.locale ?? '—')}${source.isDefaultLocale ? ' *' : ''}`,
        group[0]!.version ? tag(group[0]!.version, 'muted') : '',
        '* the language served from the source path itself, without a folder.'
      )
    )
  ];

  return (
    sections.join('') ||
    '<div class="note">No source is published at more than one version or in more than one language, so there is no matrix to draw. Add a second entry to <code>refs</code> or to <code>locales</code> to see one.</div>'
  );
}

const repoKey = (source: DuxtResolvedSource) =>
  source.repo ?? source.repository ?? '';

/** The groups worth a table: a single column compares nothing. */
function groupBy(
  sources: DuxtResolvedSource[],
  key: (source: DuxtResolvedSource) => string
): DuxtResolvedSource[][] {
  const groups = new Map<string, DuxtResolvedSource[]>();

  for (const source of sources) {
    const list = groups.get(key(source)) ?? [];
    list.push(source);
    groups.set(key(source), list);
  }

  return [...groups.values()].filter((group) => group.length > 1);
}

/**
 * One grid: every page of the group down the side, the group's members across.
 *
 * The column heading falls through by truthiness rather than `??`, because
 * `prefix` is an EMPTY STRING for the source served without a segment — `??`
 * keeps it, and the column then has no name at all. That is what the Versions
 * tab showed as a row of bare asterisks.
 */
function matrix(
  group: DuxtResolvedSource[],
  byCollection: Map<string, string[]>,
  label: (source: DuxtResolvedSource) => string,
  badge: string,
  footnote: string
): string {
  const { repo, repository } = group[0]!;
  const logical = new Set<string>();

  for (const source of group) {
    for (const path of byCollection.get(source.collection) ?? []) {
      logical.add(source.prefix ? path.slice(source.prefix.length) : path);
    }
  }

  const rows = [...logical].sort().map((path) => {
    const cells = group.map((source) => {
      const has = byCollection
        .get(source.collection)
        ?.includes(`${source.prefix}${path}` || '/');

      return has ? '<td class="mark yes">✓</td>' : '<td class="mark no">·</td>';
    });

    return `<tr><td>${code(path || '/')}</td>${cells.join('')}</tr>`;
  });

  // Through `table()` like every other panel. Built by hand it was the one
  // table in the tab without the scroll container, the border and the column
  // scopes — visibly a different component for no reason.
  // The repository's real name before its URL slug: `acme/sdk` says which
  // project this grid is about, `sdk` only says which segment it took.
  return `<h2>${escape(repository || repo || 'This repository')}${badge ? ` ${badge}` : ''}</h2>${table(
    ['Page', ...group.map(label)],
    rows,
    'This repository resolved to sources but to no pages at all.',
    'matrix'
  )}<p class="hint">${escape(footnote)}</p>`;
}
