import type { H3Event } from 'h3';
import { queryCollection } from '@nuxt/content/nitro';
import { reservedSegments } from '../../sources-resolve';
import { stripLocalePrefix } from '../../app/utils/locale-path';
import { sourceForPath } from '../../app/utils/version-paths';
import {
  code,
  context,
  dim,
  escape,
  resolvedSources,
  row,
  table,
  tag
} from './shell';

/**
 * The three panels that answer "what did my `sources` list turn into".
 *
 * They share one idea: the resolver is pure and already tested, so none of this
 * reimplements it — the panels call the same functions the theme calls and
 * print what came back. A panel that computed its own answer would be able to
 * disagree with the site, which is the one thing a debugging view must not do.
 */

interface FoundPage {
  path: string;
  title?: string;
  id?: string;
}

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
  const sources = resolvedSources();
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

  const configured = context.appConfigFile
    ? `<p class="hint">Configured in ${escape(context.appConfigFile)}.</p>`
    : '';

  return `${table(
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
    rows
  )}${configured}`;
}

/**
 * The path debugger.
 *
 * Every version bug this repo had was a disagreement between what a URL looks
 * like and which source claims it — `/workflows/v0.7.0` 404ing, and
 * `/workflows/v0.7.0/v0.7.0` being generated. Both were arithmetic on prefixes
 * that nothing printed. This prints it.
 */
export async function pathsPanel(
  event: H3Event,
  input: string
): Promise<string> {
  const form = `<form method="get">
    <input type="text" name="path" value="${escape(input)}" placeholder="/workflows/v0.7.0/guides/add-a-body" autofocus>
    <button type="submit">Resolve</button>
  </form>`;

  if (!input) {
    return `${form}<div class="note">Paste a URL as the browser shows it — locale segment included. The steps below are the ones the theme walks on every request.</div>`;
  }

  const steps: string[] = [];

  // 1. The locale segment, which is interface and not content.
  const documentationPath = stripLocalePrefix(input, context.locales);
  steps.push(
    documentationPath === input
      ? `No locale segment. Documentation path is ${code(input)}.`
      : `Locale segment stripped: ${code(input)} → ${code(documentationPath)}. ${dim('The locale translates the interface, never the content tree.')}`
  );

  // 2. Which source claims it, by longest prefix.
  const sources = resolvedSources();
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
  let found: FoundPage | null = null;

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

  const byCollection = await pathsByCollection(event);

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
 * Which version carries which page.
 *
 * Nothing else shows this. The fallback's whole job is the gap between two
 * columns of this table, and until now the only way to find one was to open a
 * URL and see a 404.
 */
export async function versionsPanel(event: H3Event): Promise<string> {
  const sources = resolvedSources();
  const byCollection = await pathsByCollection(event);

  // One table per repository: versions of different repositories share no
  // paths, and putting them in one grid would invent gaps that are not gaps.
  const repos = new Map<string, DuxtResolvedSource[]>();

  for (const source of sources) {
    const key = source.repo ?? source.repository ?? '';
    const list = repos.get(key) ?? [];
    list.push(source);
    repos.set(key, list);
  }

  const sections = [...repos.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([repo, group]) => {
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

          return has ? '<td class="yes">✓</td>' : '<td class="no">·</td>';
        });

        return `<tr><td>${code(path || '/')}</td>${cells.join('')}</tr>`;
      });

      const headers = group.map(
        (source) =>
          `<th>${escape(source.version ?? source.prefix ?? '—')}${source.isDefault ? ' *' : ''}</th>`
      );

      return `<h2>${escape(repo || 'This repository')}</h2>
        <table class="matrix">
          <thead><tr><th>Page</th>${headers.join('')}</tr></thead>
          <tbody>${rows.join('') || `<tr><td colspan="${group.length + 1}" class="dim">No pages.</td></tr>`}</tbody>
        </table>
        <p class="hint">* the version served without a version segment.</p>`;
    });

  return (
    sections.join('') ||
    '<div class="note">No source is published at more than one version, so there is no matrix to draw. Add a second entry to <code>refs</code> to see one.</div>'
  );
}
