import { reservedSegments, sourcesForRoute } from '../../../sources-resolve';
import { splitLocalePath } from '../../../app/utils/locale-path';
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
      // A generated section is a collection like any other, which is what makes
      // the rest of the layer work on it unchanged — and what made it
      // indistinguishable here from a docs tree whose folder happens to be
      // called CHANGELOG.md. The type is the one thing that tells them apart,
      // so it is said rather than left to be inferred from the Folder column.
      source.generated
        ? `${code(source.collection)} ${tag(source.generated.type)}`
        : code(source.collection),
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
  const generated = sources.filter((source) => source.generated);
  // DISTINCT versions, not entries carrying one. A version is a collection per
  // language and per generated section, so counting rows told a site with two
  // versions in two languages that it had four — and eight once it declared a
  // reference beside them. Keyed with the repository, because two projects may
  // both call a version `v2`.
  const versioned = new Set(
    sources
      .filter((source) => source.version)
      .map((source) => `${repoKey(source)}\u0000${source.version}`)
  );
  const notCurrent = sources.filter((source) => source.status !== 'current');

  const summary = stats([
    stat(sources.length, sources.length === 1 ? 'collection' : 'collections'),
    stat(repos.size, repos.size === 1 ? 'repository' : 'repositories'),
    stat(versioned.size, 'versions'),
    stat(
      generated.length,
      generated.length === 1 ? 'generated section' : 'generated sections'
    ),
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
      'Folder / artefact',
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
  /** Where the locale chain ends — vue-i18n's own fallback. */
  fallbackLocale?: string | string[];
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
  fallbackLocale,
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

  // 1. The locale segment, which is interface and not content — but which is
  //    kept, because it decides WHICH COLLECTION serves the path below.
  const { locale, path: documentationPath } = splitLocalePath(input, locales);
  steps.push(
    documentationPath === input
      ? `No locale segment. Documentation path is ${code(input)}.`
      : `Locale segment stripped: ${code(input)} → ${code(documentationPath)}, language ${code(locale!)}. ${dim('The locale translates the interface, never the content tree — but it does pick the collection.')}`
  );

  // 2. Which source claims it: longest prefix, then the language. Both at once,
  //    because a translation carries the SAME prefix as its original — taking
  //    the prefix alone answers with whichever collection sorted first.
  const chain = sourcesForRoute(
    documentationPath,
    locale,
    sources,
    fallbackLocale
  );
  const source = chain[0];

  if (!source) {
    steps.push(
      `${tag('stops here', 'error')} No source claims this path, and none serves the root. Add a source without a prefix, or check the Sources panel.`
    );

    return `${form}<ol class="steps">${steps.map((step) => `<li>${step}</li>`).join('')}</ol>`;
  }

  steps.push(
    `Longest matching prefix is ${code(source.prefix || '/')} → collection ${code(source.collection)}${source.version ? `, version ${code(source.version)}` : ''}${source.locale ? `, language ${code(source.locale)}` : ''}.`
  );

  // 2b. Where a page missing from that collection goes next. Nothing else
  //     shows the chain, and the fallback is the half of translation support
  //     that has no visible symptom until a page is silently English.
  if (chain.length > 1) {
    steps.push(
      `Falls back to ${chain
        .slice(1)
        .map((other) => code(other.collection))
        .join(
          ' → '
        )}. ${dim('A page is translated whole or not at all, so this is a chain of collections rather than a merge.')}`
    );
  }

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
      // A translation shares its original's prefix and version, so without the
      // language the two are one row printed twice.
      other.locale
        ? `${escape(other.locale)}${other.isDefaultLocale ? ` ${tag('original')}` : ''}`
        : dim('—'),
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

  return `${form}${body}<h2>The same page in other sources</h2>${table(['Prefix', 'Version', 'Language', 'Would be', 'State'], elsewhere)}${near}`;
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
  //
  // A GENERATED SECTION is the same argument a third time, and the one that
  // reads worst when it is got wrong. A docs page and an endpoint page are
  // never the same page — they share no path — so a grid holding both drew a
  // column per collection rather than per version (`v2 | v1.9 | v2 | v1.9`,
  // with nothing saying which pair was the reference) and filled every
  // cross-quadrant cell with the `·` that means MISSING, for pages that were
  // never meant to be there. Each declaration therefore gets a grid of its own.
  const versions = groupBy(
    sources,
    (source) =>
      `${repoKey(source)}\u0000${source.locale ?? ''}\u0000${sectionKey(source)}`
  );
  const locales = groupBy(
    sources,
    (source) =>
      `${repoKey(source)}\u0000${source.version ?? ''}\u0000${sectionKey(source)}`
  );

  const sections = [
    ...versions.map((group) =>
      matrix(
        group,
        byCollection,
        (source) =>
          `${escape(source.version || source.ref || source.prefix || '—')}${source.isDefault ? ' *' : ''}`,
        badges(group[0]!, group[0]!.locale),
        '* the version served without a version segment.'
      )
    ),
    ...locales.map((group) =>
      matrix(
        group,
        byCollection,
        (source) =>
          `${escape(source.locale ?? '—')}${source.isDefaultLocale ? ' *' : ''}`,
        badges(group[0]!, group[0]!.version),
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

/**
 * Which grid a source belongs in: the docs tree, or one named declaration.
 *
 * The DECLARATION rather than the label or the type, because that is the
 * identity `resolveGeneratedSections` recorded for exactly this question — two
 * sections of one repository may share both of the others.
 */
const sectionKey = (source: DuxtResolvedSource) =>
  source.generated ? String(source.generated.declaration) : '';

/** What this grid holds, beside the repository it is named after. */
const badges = (source: DuxtResolvedSource, held?: string) =>
  `${held ? tag(held, 'muted') : ''}${
    source.generated ? ` ${tag(source.generated.label, 'muted')}` : ''
  }`.trim();

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
