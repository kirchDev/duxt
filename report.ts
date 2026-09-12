import { join } from 'node:path';
import { contentCacheFile, readContentCacheAt } from './content-cache';
import { readDuxtBuildConfig } from './duxt-app-config';
import { duxtManifest, duxtSectionTypes } from './sections-resolve';
import { readSectionReports } from './section-reports';
import { resolveLatestRefs } from './sources-git';
import { redirectRules } from './modules/redirects';
import type { Collected, PageRecord } from './validate-report';
import { report, walk } from './validate-report';
import type { DuxtResolvedSource } from './sources-resolve';

/**
 * The devtools tab's answers, as text a terminal — or a model — can read.
 *
 * The panels are HTML behind a route that exists only inside a dev server, and
 * the validator's findings are lines in a build log that has scrolled away.
 * Neither form survives being handed to somebody: "what is wrong with my
 * documentation" had no answer that fits in a paste. This is that answer, and
 * it is deliberately the SAME data rather than a second opinion — the manifest
 * comes from `duxtManifest`, the findings from `report`, the redirects from
 * `redirectRules`, exactly as the build and the panels take them.
 *
 * NO SERVER, and that is what makes it usable in CI and in a pipe. Everything
 * here is a file read: the site's `app.config.ts` through jiti, the artefacts
 * off disk, and the pages out of Content's parse cache — which is on disk after
 * any build or dev run, remote sources included.
 *
 * What it therefore CANNOT show is the three panels that ask a running server:
 * the search index, the path debugger and the cache directory's own listing.
 * Those are questions about a process, and a command that answered them from
 * the outside would be guessing.
 */
export interface DuxtReportOptions {
  /** The site being reported on — where `app.config.ts` and `.data/` live. */
  rootDir?: string;
}

export interface DuxtReport {
  rootDir: string;
  sources: DuxtResolvedSource[];
  /** Undefined when nothing has parsed this site yet — see `pages`. */
  pages: PageRecord[] | undefined;
  findings: { errors: string[]; warnings: string[]; notes: string[] };
  redirects: { from: string; to: string }[];
  locales: string[];
}

/** Everything the report says, before anything decides how to say it. */
export function duxtReport(options: DuxtReportOptions = {}): DuxtReport {
  const rootDir = options.rootDir ?? process.cwd();

  const config = readDuxtBuildConfig([rootDir, join(rootDir, 'app')]);
  const types = duxtSectionTypes(config?.sectionTypes);

  const sources = readSectionReports(
    duxtManifest(
      resolveLatestRefs(config?.sources ?? [{ path: 'docs' }]),
      config?.sourceOptions ?? {},
      types
    ),
    types
  );

  const locales = [
    ...new Set(
      sources
        .map((source) => source.locale)
        .filter((locale): locale is string => Boolean(locale))
    )
  ];

  const cached = readContentCacheAt(
    contentCacheFile(rootDir),
    sources.map((source) => source.collection)
  );

  const pages = cached?.map((entry) => {
    const collected: Collected = {
      anchors: new Set<string>(),
      links: [],
      commands: []
    };
    walk(entry.content.body, collected);

    const text = (key: string) =>
      typeof entry.content[key] === 'string'
        ? (entry.content[key] as string)
        : undefined;

    return {
      collection: entry.collection,
      path: entry.path,
      file: entry.file,
      title: text('title'),
      description: text('description'),
      anchors: collected.anchors,
      links: collected.links,
      commands: collected.commands,
      lastUpdated: text('lastUpdated')
    } satisfies PageRecord;
  });

  const byCollection = new Map(
    sources.map((source) => [source.collection, source.prefix])
  );

  const rules = redirectRules(
    (cached ?? [])
      .filter((entry) => Array.isArray(entry.content.redirectFrom))
      .map((entry) => ({
        path: entry.path,
        prefix: byCollection.get(entry.collection) ?? '',
        redirectFrom: entry.content.redirectFrom as string[]
      })),
    locales
  );

  return {
    rootDir,
    sources,
    pages,
    // Over the pages there ARE. A site nobody has built yet is reported as
    // exactly that further down, rather than as a site whose every collection
    // is empty — which is what running the checks over nothing would say.
    findings: pages
      ? report(sources, pages)
      : { errors: [], warnings: [], notes: [] },
    redirects: Object.entries(rules).map(([from, rule]) => ({
      from,
      to: rule.redirect.to
    })),
    locales
  };
}

/* -------------------------------------------------------------------------- */
/* Markdown                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The report as Markdown.
 *
 * Markdown rather than a drawn table, because the reader this exists for is as
 * likely to be a model as a person, and a pipe-table is the one tabular form
 * both read without ceremony. Nothing is truncated: a report that hides its
 * long tail is a report you cannot act on, and the whole point is to paste it
 * somewhere and ask.
 */
/**
 * The ref a source was read at.
 *
 * The kind is only printed when there IS one: a source that names its origin
 * without saying whether it is a branch or a tag reaches the manifest with a
 * `ref` and no `refKind`, and the obvious template then prints
 * `main (undefined)`.
 */
/**
 * A figure and the thing it counts, in the number the figure asks for.
 *
 * Written inline four times it read `1 collections, 0 versions, 1 languages` —
 * the kind of wrongness a reader stops trusting the rest of a report over.
 */
const count = (many: number, noun: string) =>
  `${many} ${noun}${many === 1 ? '' : 's'}`;

const ref = (source: DuxtResolvedSource) =>
  source.ref
    ? `${source.ref}${source.refKind ? ` (${source.refKind})` : ''}`
    : 'checkout';

export function duxtReportMarkdown(data: DuxtReport): string {
  const { sources, pages, findings } = data;
  const out: string[] = [`# duxt report`, '', `Site: \`${data.rootDir}\``, ''];

  const generated = sources.filter((source) => source.generated);
  const versions = new Set(
    sources
      .filter((source) => source.version)
      .map((source) => `${source.repo ?? ''}\u0000${source.version}`)
  );

  // A site with no `locales` has ONE language — the one it is written in — and
  // reaches here with an empty list rather than a list of one.
  const languages = data.locales.length || 1;

  out.push(
    '## Summary',
    '',
    `- ${count(sources.length, 'collection')}, ` +
      `${count(versions.size, 'version')}, ${count(languages, 'language')}`,
    `- ${count(generated.length, 'generated section')}`,
    pages
      ? `- ${pages.length} pages parsed`
      : '- **no parse cache found** — run a build or a dev server first; ' +
          'everything below that needs pages is missing, not empty',
    `- ${findings.errors.length} errors, ${findings.warnings.length} warnings`,
    `- ${data.redirects.length} redirects from \`redirectFrom\``,
    ''
  );

  out.push(
    '## Sources',
    '',
    '| Prefix | Collection | Kind | Repository | Folder / artefact | Ref | Version | Status | Pages |',
    '| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | --: |'
  );

  const counted = new Map<string, number>();
  for (const page of pages ?? []) {
    counted.set(page.collection, (counted.get(page.collection) ?? 0) + 1);
  }

  for (const source of sources) {
    out.push(
      `| \`${source.prefix || '/'}\` | \`${source.collection}\` | ` +
        `${source.generated ? source.generated.type : 'docs'}` +
        `${source.locale ? ` · ${source.locale}` : ''} | ` +
        `${source.repository ?? 'this repository'} | \`${source.path}\` | ` +
        `${ref(source)} | ` +
        `${source.version ?? '—'}${source.isDefault ? ' *default*' : ''} | ` +
        `${source.status} | ${pages ? (counted.get(source.collection) ?? 0) : '?'} |`
    );
  }

  out.push('');

  for (const [heading, list] of [
    ['Errors', findings.errors],
    ['Warnings', findings.warnings]
  ] as const) {
    if (!list.length) continue;

    out.push(`## ${heading}`, '');
    for (const finding of list) out.push(`- ${finding}`);
    out.push('');
  }

  if (!findings.errors.length && !findings.warnings.length && pages) {
    out.push('## Findings', '', 'None.', '');
  }

  if (findings.notes.length) {
    out.push('## Translations', '');
    for (const note of findings.notes) {
      // A note indented by two spaces belongs under the line above it — the
      // report is one summary per language, then the files behind the figure.
      out.push(note.startsWith('  ') ? `  - ${note.trim()}` : `- ${note}`);
    }
    out.push('');
  }

  if (data.redirects.length) {
    out.push('## Redirects', '', '| From | To |', '| :-- | :-- |');
    for (const rule of data.redirects) {
      out.push(`| \`${rule.from}\` | \`${rule.to}\` |`);
    }
    out.push('');
  }

  return out.join('\n');
}

/* -------------------------------------------------------------------------- */
/* The command                                                                 */
/* -------------------------------------------------------------------------- */

/** The two shapes the same report is printed in. */
export type DuxtReportFormat = 'markdown' | 'json';

/**
 * The report as text, and the exit code that goes with it.
 *
 * HERE rather than in the bin, and that is not tidiness. The bin has to be
 * plain JavaScript — Node refuses to strip types from a file under
 * `node_modules`, so a `.ts` entry point works in this workspace, where the
 * package is a symlink, and fails on the first real install with
 * `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. Everything the command decides
 * therefore lives on this side, where it is typed and tested, and the bin is
 * left with nothing to get wrong.
 *
 * It takes the format rather than the argv it was asked for in. Which spelling
 * selects JSON is the command line's business, and `cli.ts` is where the
 * command line is read — a second place sniffing argv is how the two drift
 * into disagreeing about what a valid invocation is.
 *
 * Returns the exit code rather than setting it: warnings do not fail, because
 * they are what somebody else's repository going stale looks like, and a check
 * that cannot survive that is a check that gets switched off.
 */
export function duxtReportOutput(
  data: DuxtReport,
  format: DuxtReportFormat = 'markdown'
): { output: string; exitCode: number } {
  const output =
    format === 'json'
      ? JSON.stringify(
          {
            ...data,
            // A Set does not survive `JSON.stringify` — it serialises as `{}`,
            // which is a silently empty anchor list rather than an error.
            pages: data.pages?.map((page) => ({
              ...page,
              anchors: [...page.anchors]
            }))
          },
          undefined,
          2
        )
      : duxtReportMarkdown(data);

  return { output, exitCode: data.findings.errors.length ? 1 : 0 };
}
