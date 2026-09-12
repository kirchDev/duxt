#!/usr/bin/env node

/**
 * The prerender-concurrency benchmark: what a build log says, and what the
 * numbers from several of them are allowed to conclude.
 *
 * WHY A HARNESS AND NOT A NUMBER. `prerender.concurrency: 8` in
 * `www/nuxt.config.ts` is the response to a build that produced 335
 * `createImage timeout` lines — 335 pages that shipped with no OG image at all,
 * silently, because a missing OG image fails nothing. Eight brought that to
 * 140. Nobody has since measured whether it is the right number, and a local
 * build cannot settle it: one build of this site prerenders 1,205 routes,
 * almost every one of them rendering an image through satori, and the
 * contention that produces a timeout is a function of how many cores are
 * spare.
 *
 * HOW MUCH THAT MATTERS IS ITSELF MEASURED. Two builds of one commit on a
 * 24-core box: cold, 241 images rendered, 119.4s of prerender; warm, none
 * rendered, 109.0s — 9% off a phase that the same cold/warm pair cut by 38%
 * when #43 measured it, also locally, days earlier. Same code, same site, a
 * quarter of the effect, and no explanation available from either run for
 * which of them it is. That is the whole argument: a prerender number is a
 * fact about a machine at a moment, not about a setting, until it is taken
 * repeatedly on the machine that actually deploys. A local run of this harness
 * proves that the numbers parse and nothing else.
 *
 * So this measures rather than argues, and it measures on the runner class
 * production builds actually use. Issue #44 settled the shape: 4, 8 and 12,
 * three cold and three warm builds each, and a rule that replaces 8 ONLY on a
 * warm median at least 10% better with no timeouts, no missing images and no
 * new prerender errors. `.github/workflows/prerender-bench.yml` collects the
 * runs; everything that decides anything is here, where a test can reach it.
 *
 * THE PRERENDER PHASE IS NITRO'S OWN NUMBER, not a stopwatch around the build.
 * `Prerendered N routes in X seconds` is printed by nitropack at the end of the
 * crawl, so it excludes the module graph, the content parse and the Rollup
 * bundle — all of which move for reasons concurrency has nothing to do with.
 * Timing the whole build would bury a 40-second difference under them.
 *
 * THE OG NUMBERS COME FROM THE TOOL THAT OWNS THEM. `duxt-og-cache --report`
 * already counts the images in the output and the renders that ran out of time,
 * and it is tested where it lives. This reads its `--github` output rather than
 * walking `.output/public` a second time — `scripts/` deliberately does not
 * import the layer's sources (`check-previews.ts` says why), and a second
 * counter that disagreed with the first would be worse than either.
 *
 *     node scripts/prerender-bench.ts --measure --concurrency 8 --state cold \
 *       --run 1 --log build.log --og og.txt --build-ms 240000 >> runs.jsonl
 *     node scripts/prerender-bench.ts --verdict --results runs.jsonl
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** What `www/nuxt.config.ts` prerenders with when nothing overrides it. */
export const DEFAULT_PRERENDER_CONCURRENCY = 8;

/**
 * The one lever the benchmark moves, read from `DUXT_PRERENDER_CONCURRENCY`.
 *
 * IT THROWS ON ANYTHING IT CANNOT READ, and that is the property that makes
 * every number below trustworthy. A value that quietly fell back to the default
 * would build at 8 and be RECORDED as 12: the run stays green, the table fills
 * up, and the conclusion is drawn from six builds of the same setting. A loud
 * failure costs one run; a silent one costs the whole benchmark and says
 * nothing about having done so.
 */
export function prerenderConcurrency(raw: string | undefined): number {
  const value = (raw ?? '').trim();

  if (!value) return DEFAULT_PRERENDER_CONCURRENCY;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      `DUXT_PRERENDER_CONCURRENCY=${raw} is not a positive whole number. ` +
        'Leave it unset to prerender at the default ' +
        `${DEFAULT_PRERENDER_CONCURRENCY}.`
    );
  }

  return parsed;
}

/**
 * The escape sequences consola leaves in a captured log.
 *
 * COLOURS ARE ON IN CI, which is the opposite of what one assumes about a
 * process whose output is a pipe. colorette enables them when `CI` is set, so
 * the log this parser reads in the only place it matters is the coloured one,
 * and every pattern below would miss against a raw line.
 *
 * Built from a variable rather than written as a literal so the control
 * character does not have to be spelled inside a regular expression.
 */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/** Nitro's closing line for the crawl, and the only timing this trusts. */
const PRERENDERED = /Prerendered (\d+) routes in ([\d.]+) seconds/;

/** The opening line: how many routes seeded the crawl, not how many it found. */
const PRERENDERING = /Prerendering (\d+) (?:initial )?routes/;

/**
 * One rendered route: `[nitro]   ├─ /guides (150ms)`.
 *
 * NOT ANCHORED TO THE START OF THE LINE, and that is not laziness. Nitro logs
 * the crawl through a TAGGED consola instance, so every line of it arrives as
 * `[nitro]   ├─ …` — a pattern anchored on the indent matches a hand-written
 * example perfectly and finds nothing whatsoever in a real build. The `├─` lead
 * is distinctive enough to search for on its own.
 */
const ROUTE = /├─ (\S+) \((\d+)ms\)/;

/**
 * The line an error hangs on under its route: `  │ └── [404] Page not found`.
 *
 * `Linked from` uses the SAME lead, so the message has to be excluded by its
 * text rather than by its shape. On this site that is not a nicety: the routes
 * that fail are linked from up to 42 places each, and counting those lines
 * would report 42 errors where there is one.
 *
 * The whole `│ └── ` lead has to be in the pattern, tag prefix or not: Vite
 * draws its bundle table with the same box character, and a looser match reads
 * `manifest.json  101.95 kB │ gzip: 9.81 kB` as a prerender failure.
 */
const ERROR_LINE = /│ (?:└──|├──) (.+)$/;

export interface PrerenderError {
  /** The route that failed. */
  route: string;
  /** What Nitro said about it. */
  message: string;
}

export interface ParsedPrerenderLog {
  /** Routes the crawl started from. */
  seeded?: number;
  /** Routes the crawl finished with, as Nitro counted them. */
  routes?: number;
  /** How long the prerender phase took, in milliseconds. */
  prerenderMs?: number;
  /** Every route the crawl could not render, once each. */
  errors: PrerenderError[];
}

/**
 * A build log, reduced to the prerender pass inside it.
 *
 * NOTHING IS GUESSED WHEN THE PASS DID NOT FINISH. A build that died mid-crawl
 * has no closing line, and this returns no duration rather than the elapsed
 * time of a partial run — a fast number from a build that rendered half the
 * site is the most misleading value this file could produce.
 */
export function parsePrerenderLog(log: string): ParsedPrerenderLog {
  const parsed: ParsedPrerenderLog = { errors: [] };
  let current: string | undefined;

  for (const raw of log.split('\n')) {
    const line = raw.replaceAll(ANSI, '');

    const route = ROUTE.exec(line);
    if (route) {
      current = route[1];
      continue;
    }

    const failure = ERROR_LINE.exec(line);
    if (failure && current && !failure[1]!.startsWith('Linked from')) {
      parsed.errors.push({ route: current, message: failure[1]! });
      // One error per route: a second `│ ├──` line under the same route is the
      // link list, and the route is already recorded.
      current = undefined;
      continue;
    }

    const done = PRERENDERED.exec(line);
    if (done) {
      parsed.routes = Number(done[1]);
      parsed.prerenderMs = Math.round(Number(done[2]) * 1000);
      continue;
    }

    const started = PRERENDERING.exec(line);
    if (started) parsed.seeded = Number(started[1]);
  }

  return parsed;
}

export interface OgReport {
  /** OG images in the build's output. */
  images?: number;
  /** Renders that ran out of their budget, and therefore pages with no image. */
  timeouts?: number;
  /** Whether every image the build asked for came out of it. */
  complete: boolean;
}

/**
 * `duxt-og-cache --report --github`, read back.
 *
 * An ABSENT report is not a clean run. A build whose report step never ran
 * knows nothing about its images, and reporting that as zero timeouts would let
 * a candidate be adopted on evidence nobody collected.
 */
export function parseOgReport(text: string): OgReport {
  const values = new Map<string, string>();

  for (const line of text.split('\n')) {
    const index = line.indexOf('=');
    if (index > 0)
      values.set(line.slice(0, index).trim(), line.slice(index + 1).trim());
  }

  const number = (key: string) => {
    const raw = values.get(key);
    return raw !== undefined && raw !== '' && Number.isFinite(Number(raw))
      ? Number(raw)
      : undefined;
  };

  return {
    images: number('images'),
    timeouts: number('timeouts'),
    complete: values.get('complete') === 'true'
  };
}

/** The middle value, or the mean of the middle two. */
export function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** Whether a build carried in the images a previous one rendered. */
export type PrerenderCacheState = 'cold' | 'warm';

export interface PrerenderRun {
  /** The `prerender.concurrency` this build ran with. */
  concurrency: number;
  /** Whether the OG image cache was empty at the start of it. */
  state: PrerenderCacheState;
  /** Which repetition of that pair this was, from 1. */
  run: number;
  /** Whether the build command exited zero. */
  ok: boolean;
  /** The whole build, in milliseconds — the control on the prerender number. */
  buildMs?: number;
  /**
   * Peak resident memory across the build's process tree, in kilobytes.
   *
   * The resource half of #44's "record … resource use where available". It is
   * the number that says whether a higher concurrency bought its time with
   * memory — and on a runner that swaps, a fast median is not a real one.
   */
  maxRssKb?: number;
  /**
   * Cores the runner had.
   *
   * WITHOUT THIS THE WHOLE TABLE IS UNREADABLE LATER. Prerender concurrency is
   * a statement about contention, so a result from a four-core runner says
   * nothing about an eight-core one — and GitHub has changed what
   * `ubuntu-latest` means before.
   */
  cores?: number;
  /** Routes prerendered, as Nitro counted them. */
  routes?: number;
  /** The prerender phase alone, in milliseconds. */
  prerenderMs?: number;
  /** Routes the crawl could not render. */
  errors: PrerenderError[];
  /** OG images in the output. */
  images?: number;
  /** Renders that ran out of time. */
  timeouts?: number;
}

export interface PrerenderCandidate {
  concurrency: number;
  /** Builds recorded at this setting, cold and warm together. */
  runs: number;
  coldMedianMs?: number;
  warmMedianMs?: number;
  /** Fraction faster than the baseline's warm median; negative is slower. */
  improvement?: number;
  /** The highest peak memory any build at this setting reached, in kilobytes. */
  peakRssKb?: number;
  /** Timed-out renders across every build at this setting. */
  timeouts: number;
  /** Routes that failed here and did not fail for the baseline. */
  newErrors: string[];
  /** Why this setting may not replace the baseline. Empty means it may. */
  refusals: string[];
  eligible: boolean;
}

export interface PrerenderBenchVerdict {
  baseline: number;
  /** The setting this run concludes on — the baseline unless one earned it. */
  chosen: number;
  adopt: boolean;
  /** The most images any build produced, which is what a complete one looks like. */
  expectedImages?: number;
  /** Timed-out renders across every baseline build. */
  baselineTimeouts: number;
  /** Baseline builds recorded. */
  baselineRuns: number;
  /**
   * Core counts the runs were measured on, distinct and sorted.
   *
   * MORE THAN ONE INVALIDATES THE COMPARISON and the report says so out loud.
   * It is not a refusal: #44 settled the adoption rule and a run is not the
   * place to add clauses to it. It is the one fact that would otherwise let a
   * matrix leg that landed on a bigger runner read as a better setting.
   */
  cores: number[];
  candidates: PrerenderCandidate[];
}

export interface PrerenderBenchInput {
  runs: PrerenderRun[];
  /** The setting in force today, and the one a candidate has to beat. */
  baseline?: number;
  /** How much better a warm median must be before a default moves. */
  threshold?: number;
  /** Cold/warm pairs each setting owes. */
  repetitions?: number;
}

/**
 * The rule issue #44 settled, applied to whatever was collected.
 *
 * "A setting replaces 8 only when its median warm prerender time is at least
 * 10% lower than 8's, and all six runs have zero OG-image timeouts, complete OG
 * output, and no new prerender errors. Otherwise, retain 8."
 *
 * Every clause of that is a separate refusal below, and each one names itself,
 * because "not adopted" without a reason is the outcome a reader cannot check.
 *
 * WARM MEDIANS DECIDE IT, and the asymmetry is deliberate. A cold build
 * measures the RENDERER — hundreds of satori passes contending for a couple of
 * cores — and a warm one measures the CRAWL, which is what concurrency governs
 * for the rest of a site's life. Cold is still recorded and still gated on: it
 * is the run exposed to timeouts, and #43's cache does not change that for the
 * first build after any invalidation.
 *
 * NOT ZERO ERRORS — NO NEW ONES. This site prerenders 42 links to routes it
 * does not serve, on purpose, with `failOnError: false` beneath them. A clause
 * demanding a clean crawl would refuse every setting including the one in
 * force, for a reason that has nothing to do with concurrency.
 */
export function prerenderBenchVerdict(
  input: PrerenderBenchInput
): PrerenderBenchVerdict {
  const baseline = input.baseline ?? DEFAULT_PRERENDER_CONCURRENCY;
  const threshold = input.threshold ?? 0.1;
  const repetitions = input.repetitions ?? 3;
  const required = repetitions * 2;

  const images = input.runs
    .map((run) => run.images)
    .filter((count): count is number => count !== undefined);
  const expectedImages = images.length ? Math.max(...images) : undefined;

  const at = (concurrency: number) =>
    input.runs.filter((run) => run.concurrency === concurrency);

  const warmMedian = (concurrency: number) =>
    median(
      at(concurrency)
        .filter((run) => run.ok && run.state === 'warm')
        .map((run) => run.prerenderMs)
        .filter((ms): ms is number => ms !== undefined)
    );

  const baselineRuns = at(baseline);
  const baselineWarm = warmMedian(baseline);
  const baselineErrors = new Set(
    baselineRuns.flatMap((run) => run.errors.map((error) => error.route))
  );

  const settings = [...new Set(input.runs.map((run) => run.concurrency))].sort(
    (a, b) => a - b
  );

  const candidates = settings.map((concurrency): PrerenderCandidate => {
    const runs = at(concurrency);
    const warm = warmMedian(concurrency);
    const cold = median(
      runs
        .filter((run) => run.ok && run.state === 'cold')
        .map((run) => run.prerenderMs)
        .filter((ms): ms is number => ms !== undefined)
    );

    const timeouts = runs.reduce((sum, run) => sum + (run.timeouts ?? 0), 0);
    const rss = runs
      .map((run) => run.maxRssKb)
      .filter((kb): kb is number => kb !== undefined);
    const newErrors = [
      ...new Set(
        runs
          .flatMap((run) => run.errors.map((error) => error.route))
          .filter((route) => !baselineErrors.has(route))
      )
    ];

    const refusals: string[] = [];

    if (concurrency !== baseline) {
      if (runs.length < required) {
        refusals.push(
          `only ${runs.length} of ${required} builds were recorded.`
        );
      }

      const failed = runs.filter((run) => !run.ok).length;
      if (failed > 0) {
        refusals.push(`${failed} of ${runs.length} builds did not succeed.`);
      }

      if (timeouts > 0) {
        refusals.push(
          `${timeouts} render${timeouts === 1 ? '' : 's'} timed out, so that ` +
            'many pages would ship with no OG image.'
        );
      }

      if (expectedImages === undefined) {
        // Not "complete", not "incomplete": nobody counted. A candidate is
        // never adopted on a clause that was never evaluated.
        refusals.push(
          'no build reported an OG image count, so completeness could not be ' +
            'judged at all.'
        );
      } else {
        const short = runs.filter(
          (run) => run.images === undefined || run.images < expectedImages
        );

        if (short.length > 0) {
          refusals.push(
            `${short.length} build${short.length === 1 ? '' : 's'} produced ` +
              `fewer than the ${expectedImages} OG images the best build did.`
          );
        }
      }

      if (newErrors.length > 0) {
        refusals.push(
          `${newErrors.length} route${newErrors.length === 1 ? '' : 's'} ` +
            `failed here and not at ${baseline}: ${newErrors.join(', ')}.`
        );
      }

      if (
        warm === undefined ||
        baselineWarm === undefined ||
        warm > baselineWarm * (1 - threshold)
      ) {
        refusals.push(
          `the warm median is not at least ${Math.round(threshold * 100)}% ` +
            `lower than concurrency ${baseline}'s.`
        );
      }
    }

    return {
      concurrency,
      runs: runs.length,
      coldMedianMs: cold,
      warmMedianMs: warm,
      improvement:
        concurrency === baseline ||
        warm === undefined ||
        baselineWarm === undefined
          ? undefined
          : (baselineWarm - warm) / baselineWarm,
      peakRssKb: rss.length ? Math.max(...rss) : undefined,
      timeouts,
      newErrors,
      refusals,
      eligible: concurrency !== baseline && refusals.length === 0
    };
  });

  // The fastest of whatever survived every clause — and the baseline when
  // nothing did, which is the outcome #44 named as valid in advance.
  const winner = candidates
    .filter((candidate) => candidate.eligible)
    .sort((a, b) => (a.warmMedianMs ?? 0) - (b.warmMedianMs ?? 0))[0];

  return {
    baseline,
    chosen: winner?.concurrency ?? baseline,
    adopt: winner !== undefined,
    expectedImages,
    baselineTimeouts: baselineRuns.reduce(
      (sum, run) => sum + (run.timeouts ?? 0),
      0
    ),
    baselineRuns: baselineRuns.length,
    cores: [
      ...new Set(
        input.runs
          .map((run) => run.cores)
          .filter((count): count is number => count !== undefined)
      )
    ].sort((a, b) => a - b),
    candidates
  };
}

/** Milliseconds as something a person reads off a summary. */
function duration(ms: number | undefined): string {
  if (ms === undefined) return '—';

  const seconds = Math.round(ms / 1000);

  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/** Kilobytes as gigabytes, or an em dash where nothing measured it. */
function memory(kb: number | undefined): string {
  return kb === undefined ? '—' : `${(kb / 1024 / 1024).toFixed(1)} GB`;
}

/** A fraction as a signed percentage, or an em dash where there is none. */
function percentage(fraction: number | undefined): string {
  if (fraction === undefined) return '—';

  const rounded = Math.round(fraction * 1000) / 10;

  return `${rounded > 0 ? '−' : rounded < 0 ? '+' : ''}${Math.abs(rounded)}%`;
}

/**
 * The benchmark's conclusion, in the two shapes anyone asks for it.
 *
 * THE BASELINE'S TIMEOUT COUNT IS STATED WHETHER OR NOT IT IS ZERO. That number
 * is the open question in `CLAUDE.md` — `concurrency: 8` plus a 60-second
 * render budget has never been measured on a green full-site build — and a
 * report that mentioned timeouts only when they refused a candidate would show
 * nothing at all on the run that finally settles it.
 */
export function formatPrerenderBenchReport(
  argv: string[],
  verdict: PrerenderBenchVerdict
): string {
  const chosen = verdict.candidates.find(
    (candidate) => candidate.concurrency === verdict.chosen
  );

  if (argv.includes('--github')) {
    return [
      `baseline=${verdict.baseline}`,
      `chosen=${verdict.chosen}`,
      `adopt=${verdict.adopt}`,
      `baseline-timeouts=${verdict.baselineTimeouts}`,
      `baseline-warm-ms=${
        verdict.candidates.find((c) => c.concurrency === verdict.baseline)
          ?.warmMedianMs ?? ''
      }`,
      `chosen-warm-ms=${chosen?.warmMedianMs ?? ''}`,
      `expected-images=${verdict.expectedImages ?? ''}`
    ].join('\n');
  }

  const lines = [
    '## ⏱️ Prerender concurrency',
    '',
    `Baseline \`concurrency: ${verdict.baseline}\` recorded ` +
      `${verdict.baselineTimeouts} timed-out renders across ` +
      `${verdict.baselineRuns} builds` +
      (verdict.expectedImages === undefined
        ? '.'
        : `, and the best build produced ${verdict.expectedImages} OG images.`),
    '',
    // Stated above the table rather than under it: prerender concurrency is a
    // claim about contention, so a table read without this number means nothing.
    verdict.cores.length === 1
      ? `Measured on ${verdict.cores[0]} cores.`
      : verdict.cores.length === 0
        ? 'The runners did not report their core count.'
        : `> [!WARNING]\n> These runs were measured on runners with different ` +
          `core counts (${verdict.cores.join(', ')}). Prerender concurrency is ` +
          'a claim about contention, so the comparison below is not ' +
          'like-for-like and the verdict should not be acted on.',
    '',
    '| Concurrency | Cold median | Warm median | vs baseline | Peak RSS | Timeouts | Builds |',
    '|-------------|-------------|-------------|-------------|----------|----------|--------|',
    ...verdict.candidates.map(
      (candidate) =>
        `| ${candidate.concurrency}${candidate.concurrency === verdict.chosen ? ' ✅' : ''} ` +
        `| ${duration(candidate.coldMedianMs)} ` +
        `| ${duration(candidate.warmMedianMs)} ` +
        `| ${candidate.concurrency === verdict.baseline ? 'baseline' : percentage(candidate.improvement)} ` +
        `| ${memory(candidate.peakRssKb)} ` +
        `| ${candidate.timeouts} ` +
        `| ${candidate.runs} |`
    ),
    '',
    verdict.adopt
      ? `**Adopt \`concurrency: ${verdict.chosen}\`.** Its warm median is ` +
        `${percentage(chosen?.improvement)} against the baseline over ` +
        `${chosen?.runs} builds, with no timeouts, no missing images and no ` +
        'new prerender errors.'
      : `**Retain \`concurrency: ${verdict.baseline}\`.** No setting cleared ` +
        'every condition issue #44 set for replacing it.'
  ];

  const refused = verdict.candidates.filter(
    (candidate) => candidate.refusals.length > 0
  );

  if (refused.length > 0) {
    lines.push(
      '',
      '<details><summary>Why each setting was refused</summary>',
      ''
    );
    for (const candidate of refused) {
      lines.push(`- \`concurrency: ${candidate.concurrency}\``);
      for (const refusal of candidate.refusals) lines.push(`  - ${refusal}`);
    }
    lines.push('', '</details>');
  }

  lines.push(
    '',
    '<sub>The prerender phase is Nitro’s own `Prerendered N routes in X',
    'seconds`, not the whole build. Warm medians decide; cold builds are the',
    'ones exposed to render timeouts.</sub>',
    ''
  );

  return lines.join('\n');
}

/** The value after a flag, or nothing. */
function value(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);

  return index === -1 ? undefined : argv[index + 1];
}

/** A numeric flag, absent rather than `NaN` where it was not given. */
function numeric(argv: string[], flag: string): number | undefined {
  const raw = value(argv, flag);

  return raw === undefined || raw === '' || !Number.isFinite(Number(raw))
    ? undefined
    : Number(raw);
}

/** A file's contents, or an empty string where the step that writes it did not run. */
function read(path: string | undefined): string {
  return path && existsSync(path) ? readFileSync(path, 'utf8') : '';
}

/**
 * The command, dispatched on its one mode flag.
 *
 * Here rather than in the entry point below so that what it decides is
 * reachable from a test — the same reason `og-image-cache.ts` keeps its own
 * command out of `bin/`.
 */
export function prerenderBenchCommand(argv: string[]): {
  output: string;
  exitCode: number;
} {
  if (argv.includes('--measure')) {
    const parsed = parsePrerenderLog(read(value(argv, '--log')));
    const og = parseOgReport(read(value(argv, '--og')));

    const record: PrerenderRun = {
      concurrency:
        numeric(argv, '--concurrency') ?? DEFAULT_PRERENDER_CONCURRENCY,
      state: value(argv, '--state') === 'cold' ? 'cold' : 'warm',
      run: numeric(argv, '--run') ?? 1,
      // A build is a failure unless it said otherwise: a workflow that could
      // not report an outcome has not reported a success.
      ok: value(argv, '--ok') === 'true',
      buildMs: numeric(argv, '--build-ms'),
      maxRssKb: numeric(argv, '--max-rss-kb'),
      cores: numeric(argv, '--cores'),
      routes: parsed.routes,
      prerenderMs: parsed.prerenderMs,
      errors: parsed.errors,
      images: og.images,
      timeouts: og.timeouts
    };

    return { output: JSON.stringify(record), exitCode: 0 };
  }

  const results = read(value(argv, '--results'))
    .split('\n')
    .filter((line) => line.trim().startsWith('{'))
    .map((line) => JSON.parse(line) as PrerenderRun);

  const verdict = prerenderBenchVerdict({
    runs: results,
    baseline: numeric(argv, '--baseline'),
    threshold: numeric(argv, '--threshold'),
    repetitions: numeric(argv, '--repetitions')
  });

  return { output: formatPrerenderBenchReport(argv, verdict), exitCode: 0 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { output, exitCode } = prerenderBenchCommand(process.argv.slice(2));

  console.log(output);
  process.exitCode = exitCode;
}
