#!/usr/bin/env node

/**
 * The search-index benchmark: what a reader pays to search this site today,
 * what a candidate index would cost instead, and the rule that decides between
 * them.
 *
 * WHY A HARNESS AND NOT A NUMBER. Issue #33 asked whether ONE index across
 * every source is the better shape, and named the thing the answer rests on:
 * "~100 KB for 2,500 pages including wasm, JS and the chunks actually fetched
 * is Pagefind's own figure from its XKCD demo, not ours. Measure it over
 * `www/`'s real content before anything else — everything below is opinion
 * until that number exists." The number now exists, it is in
 * `docs/99.adr/0010-keep-contents-per-collection-search-as-the-default.md`, and
 * this file is what it was computed by, so the next candidate is measured the
 * same way rather than argued about.
 *
 * THE REPRODUCTION IS THE POINT, not the verdict. `prerender-bench.ts` is the
 * same shape for the same reason: a conclusion computed by hand at the bottom
 * of a terminal is a conclusion nobody can check six months later. Everything
 * that decides anything is here, where a test can reach it; the expensive half
 * — building an index from the site's real records — is a command.
 *
 * NOTHING HERE IMPORTS THE LAYER. `scripts/` deliberately does not (see
 * `check-previews.ts`), and this file has no reason to be the exception: it
 * reads a built site's files and an index's files, both of which are on disk by
 * the time it runs.
 *
 *     node scripts/search-index-bench.ts \
 *       --output www/.output/public \
 *       --collections docs,docs_demo,docs_tf,docs_releases \
 *       --index /tmp/pagefind --language en-GB \
 *       --platforms linux-x64,darwin-arm64,windows-x64 \
 *       --engines linux-x64,darwin-arm64,windows-x64 \
 *       --not typo-tolerance
 *
 * `--not` is how the three properties a directory cannot be measured for are
 * stated — whether the candidate ranks its sources together, tolerates a typo
 * and stays at build time. They are arguments precisely so that a run records
 * what was claimed: the ADR then cites a verdict rather than a conviction.
 */

import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** One file of an index, as the thing that emitted it named it. */
export interface IndexFile {
  /** Path relative to the index root, in the spelling a browser requests. */
  path: string;
  bytes: number;
}

/** What a reader is charged for asking one question. */
export interface QueryFootprint {
  /** Everything the browser fetches, in bytes on the wire. */
  bytes: number;
  /** The part that is fetched once and reused for every later query. */
  constant: number;
  /** The part that moves with the question and the answers shown. */
  variable: number;
}

export interface PagefindQueryOptions {
  /**
   * Which language index answers, because exactly one of them does.
   *
   * Pagefind runs indexing independently per detected language and selects one
   * at runtime from the document's `lang`; its own documentation describes no
   * way to search two together, and `mergeIndex` against the same base path is
   * skipped outright. That is not a footnote about the benchmark — it is the
   * reason `interleave()` survives a move to Pagefind, and it is measured here
   * rather than assumed by charging for one language's files only.
   */
  language: string;
  /** How many index chunks the terms span; one for a single common word. */
  chunks: number;
  /** How many results the list draws, each of which costs its own fragment. */
  results: number;
  /**
   * A second query in the same session, which pays for neither the loader, the
   * wasm nor the metadata again.
   *
   * Worth separating because the two numbers answer different questions. The
   * cold one decides whether search is affordable at all; the warm one decides
   * whether it stays affordable while somebody is actually using it, and it is
   * the half that a per-collection database — which downloads the whole dump
   * before answering anything — has no equivalent of.
   */
  warm?: boolean;
}

/** The flat files every language shares. */
const SHARED = new Set(['pagefind.js', 'pagefind-entry.json']);

/**
 * Does this file belong to that language?
 *
 * THE LANGUAGE IS IN THE FILENAME, not in a directory, which is the one thing
 * about Pagefind's output a reader of this code would otherwise get wrong:
 * `wasm.en-GB.pagefind`, `pagefind.en-GB_<hash>.pf_meta`,
 * `index/en-GB_<hash>.pf_index`, `fragment/en-GB_<hash>.pf_fragment`. Selecting
 * by a `en-GB/` prefix matches nothing and charges a query for zero bytes,
 * which reads as a spectacular result rather than as a bug.
 *
 * Anchored on the separator that follows the code, so `en` never claims
 * `en-GB`'s files.
 */
function speaks(path: string, language: string): boolean {
  // `index/`, `fragment/` and `filter/` hold one file per language each; the
  // wasm and the metadata sit at the root behind a fixed word.
  const name = (
    path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path
  )
    .replace(/^pagefind\./, '')
    .replace(/^wasm\./, '');

  return name.startsWith(`${language}_`) || name.startsWith(`${language}.`);
}

/** The mean of a group, floored — a fragment is a whole file or none. */
function mean(files: IndexFile[]): number {
  if (!files.length) return 0;
  return Math.floor(
    files.reduce((total, file) => total + file.bytes, 0) / files.length
  );
}

/**
 * What one Pagefind query costs, off the files the index actually holds.
 *
 * A QUERY IS NOT AN INDEX. The whole case for a chunked index is that a reader
 * fetches a small part of it, so measuring the directory's size would answer a
 * question nobody asked — and would make Pagefind look six times worse than the
 * thing it replaces rather than better. What a browser fetches is the loader,
 * the entry, one language's wasm and metadata, whichever index chunks the terms
 * land in, and one fragment per result drawn.
 *
 * The fragments are charged at the index's MEAN rather than by naming files,
 * because which ten come back is a property of the question. The mean over
 * `www/` was 419 bytes and the 95th percentile 814, so a result list is a
 * rounding error against the wasm either way — which is itself the finding.
 */
export function pagefindQueryFootprint(
  files: readonly IndexFile[],
  options: PagefindQueryOptions
): QueryFootprint {
  const mine = files.filter((file) => speaks(file.path, options.language));

  const shared = files
    .filter((file) => SHARED.has(file.path))
    .reduce((total, file) => total + file.bytes, 0);

  const engine = mine
    .filter(
      (file) => file.path.startsWith('wasm.') || file.path.endsWith('.pf_meta')
    )
    .reduce((total, file) => total + file.bytes, 0);

  const chunks = mine.filter((file) => file.path.endsWith('.pf_index'));
  const fragments = mine.filter((file) => file.path.endsWith('.pf_fragment'));

  const constant = options.warm ? 0 : shared + engine;
  const variable =
    mean(chunks) * options.chunks + mean(fragments) * options.results;

  return { bytes: constant + variable, constant, variable };
}

export interface ContentQueryOptions {
  /**
   * The collections the reader's scope actually searches, which is NOT every
   * collection the site has.
   *
   * `searchSources` picks one edition per artefact and then the reader's
   * language ahead of the fallback, so a site with 33 collections searches 8 of
   * them in English and 9 in German. Charging for all 33 would overstate the
   * baseline by four times and win the argument dishonestly.
   */
  collections: readonly string[];
  /** A second query in the same session. */
  warm?: boolean;
}

/** Content's own client database, which search is what usually summons. */
const ENGINE = /^_nuxt\/sqlite3[.-]/;

/**
 * What one query against Content's per-collection search costs.
 *
 * EVERYTHING IS CONSTANT AND NOTHING IS VARIABLE, which is the shape of the
 * thing rather than a simplification: `useSearchCollection` downloads a
 * collection's whole `sql_dump.txt`, builds an FTS5 table from it in WASM
 * SQLite, and answers every later question out of memory. So the first query
 * pays for the entire corpus in scope and the second pays nothing — the exact
 * inverse of a chunked index, and the reason the two have to be compared at
 * both temperatures rather than at one.
 *
 * THE ENGINE IS CHARGED, WITH A CAVEAT THAT BELONGS IN THE NUMBER RATHER THAN
 * UNDER IT. Content loads its client database on demand, and search is the
 * surface that reliably demands it — but a client-side `queryCollection` on a
 * route change can summon it too, in which case part of this is a cost the
 * reader was going to pay anyway. `constant` and `variable` are reported apart
 * so a reader of the report can take the engine out and still have a number.
 */
export function contentQueryFootprint(
  files: readonly IndexFile[],
  options: ContentQueryOptions
): QueryFootprint {
  if (options.warm) return { bytes: 0, constant: 0, variable: 0 };

  const engine = files
    .filter((file) => ENGINE.test(file.path))
    .reduce((total, file) => total + file.bytes, 0);

  const wanted = new Set(
    options.collections.map((name) => `__nuxt_content/${name}/sql_dump.txt`)
  );

  const dumps = files
    .filter((file) => wanted.has(file.path))
    .reduce((total, file) => total + file.bytes, 0);

  return { bytes: engine + dumps, constant: engine, variable: dumps };
}

/**
 * How much better a candidate has to be before a DEFAULT is worth moving.
 *
 * A third off, and the threshold is about churn rather than about bytes. The
 * layer's search is public surface: changing it moves what a consumer's readers
 * download, what their build emits, what their deploy uploads and what their
 * own overrides sit on top of. A candidate that is ten percent smaller buys a
 * tenth of a payload and costs every consumer a migration, so the bar is set
 * where the win is large enough to be worth somebody else's afternoon.
 */
export const PAYLOAD_MARGIN = 1 / 3;

/**
 * How much of the platform's file ceiling a search index may take.
 *
 * Cloudflare Workers static assets cap a version at 20,000 files on the free
 * plan and 100,000 on paid. Half, because a documentation site grows: the
 * index's own growth law is one file per indexed SECTION, multiplied by every
 * source, version and locale the site serves, and a consumer who adds a
 * language should not discover the limit in a failed deploy. The ceiling is an
 * input rather than a constant here — another host counts differently, and a
 * layer must not bake one vendor's number into a rule.
 */
export const CEILING_HEADROOM = 0.5;

/** What a candidate index costs and what it can do, once measured. */
export interface SearchCandidate {
  /** Bytes for a reader's first query of a session. */
  coldBytes: number;
  /** Bytes for every query after it. */
  warmBytes: number;
  /** Files the index adds to the build's output. */
  files: number;
  /** One ranked list across every source, rather than a list per source. */
  rankedTogether: boolean;
  /** Near-misses match, so a transposed letter still finds the page. */
  typoTolerant: boolean;
  /** Built during the build and never refreshed at runtime — ADR-0006. */
  buildTimeOnly: boolean;
  /** The platforms it ships a prebuilt binary for; empty for pure JS. */
  platforms: readonly string[];
}

/** What the site it would replace costs today. */
export interface SearchBaseline {
  coldBytes: number;
  warmBytes: number;
  /** Files the build already emits, which the candidate's are added to. */
  files: number;
}

export interface SearchIndexConstraints {
  /** Static files one deployment may hold. */
  ceiling: number;
  /** The platforms `engines` promises the layer runs on. */
  platforms: readonly string[];
}

export interface SearchIndexVerdict {
  replace: boolean;
  /** The conditions the candidate cleared, in the order they are checked. */
  passed: string[];
  /** The conditions it did not — the whole of the reason, never a summary. */
  failed: string[];
}

/**
 * Does this candidate replace Content's per-collection search as the default?
 *
 * THE SIX CONDITIONS ARE ISSUE #33's, not this file's. That issue named three
 * problems with one index per collection — a payload that grows with the model,
 * sources that cannot be ranked against each other, no typo tolerance in the
 * primary path — and six things an evaluation had to settle. A replacement has
 * to fix the problems without losing what already works, so: it must be
 * materially smaller, it must rank every source together, it must keep typo
 * tolerance, it must stay inside ADR-0006's build-time rule, its binaries must
 * cover what `engines` promises, and what it emits must fit where the site
 * deploys.
 *
 * ALL OF THEM, AND THE FAILURES ARE NAMED. A candidate that wins on payload and
 * loses typo tolerance has traded one of the three problems for another, which
 * is a different shape rather than a better one — and the value of listing
 * every unmet condition instead of returning false is that the next candidate
 * is measured against the same list rather than against whichever objection is
 * remembered.
 *
 * WHAT IS DELIBERATELY NOT A CONDITION: what a record is. #33 listed it, and
 * `duxt:search:records` answered it before this rule ran — every section type
 * the site generates is already a record, so a candidate consuming that hook
 * cannot fail on it. A condition nothing can fail is not a condition.
 */
export function searchIndexVerdict(
  baseline: SearchBaseline,
  candidate: SearchCandidate,
  constraints: SearchIndexConstraints
): SearchIndexVerdict {
  const passed: string[] = [];
  const failed: string[] = [];

  const check = (name: string, ok: boolean) =>
    (ok ? passed : failed).push(name);

  check(
    'payload',
    candidate.coldBytes <= baseline.coldBytes * (1 - PAYLOAD_MARGIN)
  );
  check('ranked-together', candidate.rankedTogether);
  check('typo-tolerance', candidate.typoTolerant);
  check('build-time', candidate.buildTimeOnly);
  check(
    'platforms',
    constraints.platforms.every(
      (platform) =>
        !candidate.platforms.length || candidate.platforms.includes(platform)
    )
  );
  check(
    'file-ceiling',
    baseline.files + candidate.files <= constraints.ceiling * CEILING_HEADROOM
  );

  return { replace: !failed.length, passed, failed };
}

/** Read an index directory into the shape every function above takes. */
export function readIndexFiles(root: string): IndexFile[] {
  const files: IndexFile[] = [];

  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else
        files.push({
          path: relative(root, full).split('\\').join('/'),
          bytes: statSync(full).size
        });
    }
  };

  walk(root);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * The whole comparison, printed, off two directories that already exist.
 *
 * Deliberately a command rather than a check: it needs a finished build and an
 * index some provider wrote, neither of which `pnpm check` has, and the
 * conclusion it computes is recorded in an ADR rather than enforced on a
 * branch. `tests/search-index-bench.test.ts` is what runs on every commit.
 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const flag = (name: string) => {
    const at = process.argv.indexOf(`--${name}`);
    return at === -1 ? undefined : process.argv[at + 1];
  };
  const list = (name: string) => (flag(name) ?? '').split(',').filter(Boolean);

  const index = flag('index');
  const output = flag('output');

  if (!index || !output) {
    console.error(
      'usage: search-index-bench.ts --index <pagefind dir> --output <.output/public> ' +
        '[--collections a,b] [--language en-GB] [--chunks 1] [--results 10]'
    );
    process.exit(1);
  }

  const built = readIndexFiles(output);
  const candidate = readIndexFiles(index);

  const language = flag('language') ?? 'en';
  const query = {
    chunks: Number(flag('chunks') ?? 1),
    results: Number(flag('results') ?? 10)
  };

  const today = contentQueryFootprint(built, {
    collections: list('collections')
  });
  const cold = pagefindQueryFootprint(candidate, { language, ...query });
  const warm = pagefindQueryFootprint(candidate, {
    language,
    ...query,
    warm: true
  });

  const verdict = searchIndexVerdict(
    { coldBytes: today.bytes, warmBytes: 0, files: built.length },
    {
      coldBytes: cold.bytes,
      warmBytes: warm.bytes,
      files: candidate.length,
      // The three a directory cannot answer. Whoever runs this states them, and
      // the ADR records what they were stated as.
      rankedTogether: !list('not').includes('ranked-together'),
      typoTolerant: !list('not').includes('typo-tolerance'),
      buildTimeOnly: !list('not').includes('build-time'),
      platforms: list('platforms')
    },
    {
      ceiling: Number(flag('ceiling') ?? 20_000),
      platforms: list('engines')
    }
  );

  console.log(
    JSON.stringify(
      {
        language,
        today,
        candidate: { cold, warm },
        files: candidate.length,
        verdict
      },
      undefined,
      2
    )
  );
}
