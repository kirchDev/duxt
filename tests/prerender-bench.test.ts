import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  DEFAULT_PRERENDER_CONCURRENCY,
  formatPrerenderBenchReport,
  median,
  parseOgReport,
  parsePrerenderLog,
  prerenderBenchVerdict,
  prerenderConcurrency,
  type PrerenderRun
} from '../scripts/prerender-bench';

/**
 * The benchmark's arithmetic, which is the only part of it a test can reach.
 *
 * What #44 asks for is a MEASUREMENT on a runner class this process is not
 * running on, so nothing here claims a concurrency is better than another. What
 * it does claim is that the numbers the workflow collects mean what the report
 * says they mean: that a build log is read the way Nitro writes one, that a
 * median is a median, and above all that the rule which would replace `8` fires
 * on exactly the conditions issue #44 settled and on no others.
 *
 * That last one is the point. A benchmark whose verdict is computed by hand at
 * the bottom of a workflow log is a benchmark whose conclusion nobody can check
 * six months later.
 */

/** Wraps a line the way colorette does when it detects CI. */
const gray = (text: string) => `[90m${text}[39m`;
const yellow = (text: string) => `[33m${text}[39m`;

/**
 * A prerender pass as nitropack 2.13 actually writes one.
 *
 * THE `[nitro]` PREFIX IS THE POINT OF THIS FIXTURE. Nitro logs the crawl
 * through a TAGGED consola instance, so not one line of it starts where
 * `formatPrerenderRoute` suggests it does — a parser written from that function
 * alone matches a hand-typed example and finds zero routes in a real build.
 * This shape was copied off a `pnpm build:www` log, not reconstructed.
 *
 * The Vite row is here for the same reason: its bundle table is drawn with the
 * same `│` the error lines use, and a looser pattern reads it as a failure.
 */
const lines = (paint: (text: string) => string) =>
  [
    'ℹ Building for Cloudflare Workers',
    '.nuxt/dist/client/manifest.json    101.95 kB │ gzip:   9.81 kB',
    paint('[nitro] ℹ Prerendering 1 initial routes with crawler'),
    paint('[nitro]   ├─ / (245ms)'),
    paint('[nitro]   ├─ /de (198ms)'),
    paint(
      `[nitro]   ├─ /demo/api/shipments (12ms)\n  │ └── ${yellow('[404] Page not found: /demo/api/shipments')}`
    ),
    paint(
      `[nitro]   ├─ /de/demo/api/shipments (9ms)\n  │ ├── ${yellow('[404] Page not found: /de/demo/api/shipments')}\n  │ └── Linked from /de/demo`
    ),
    paint('[nitro]   ├─ /guides (150ms) (skipped)'),
    'ERROR renderer.createImage timeout',
    'ERROR renderer.createImage timeout',
    paint('[nitro] ℹ Prerendered 1132 routes in 189.7 seconds'),
    '✔ Nitro server built'
  ].join('\n');

/** What a local build writes: a pipe, so colorette leaves the colour off. */
const plain = lines((text) => text);

/** What CI captures: colorette turns colour ON when `CI` is set. */
const log = lines(gray);

describe('the prerender concurrency lever', () => {
  it('is 8 when nothing sets it', () => {
    expect(prerenderConcurrency(undefined)).toBe(DEFAULT_PRERENDER_CONCURRENCY);
    expect(prerenderConcurrency('')).toBe(8);
    expect(prerenderConcurrency('  ')).toBe(8);
  });

  it('takes the value the benchmark sets', () => {
    expect(prerenderConcurrency('4')).toBe(4);
    expect(prerenderConcurrency('12')).toBe(12);
    expect(prerenderConcurrency(' 12 ')).toBe(12);
  });

  /**
   * THE ONE BEHAVIOUR THAT MAKES THE BENCHMARK TRUSTWORTHY. A value that fell
   * back to the default silently would build at 8 and be RECORDED as 12, which
   * is worse than no measurement at all: the run looks green and the table
   * lies. Every bad spelling is loud.
   */
  it.each(['eight', '0', '-4', '1.5', 'NaN', 'Infinity'])(
    'refuses %s rather than quietly building at 8',
    (raw) => {
      expect(() => prerenderConcurrency(raw)).toThrow(
        /DUXT_PRERENDER_CONCURRENCY/
      );
    }
  );
});

describe('reading a prerender pass off the build log', () => {
  it('takes the phase duration from Nitro rather than timing the build', () => {
    const parsed = parsePrerenderLog(log);

    expect(parsed.routes).toBe(1132);
    expect(parsed.prerenderMs).toBe(189_700);
  });

  /**
   * A local build's log has no escape sequences in it and a CI one is full of
   * them. Both are read by the same command, so both are read here.
   */
  it('reads the same pass with the colour on and with it off', () => {
    expect(parsePrerenderLog(plain)).toEqual(parsePrerenderLog(log));
  });

  it('does not read Vite’s bundle table as a prerender failure', () => {
    expect(
      parsePrerenderLog('dist/manifest.json    101.95 kB │ gzip:   9.81 kB\n')
        .errors
    ).toEqual([]);
  });

  it('reports the routes that errored, and where they were linked from', () => {
    const parsed = parsePrerenderLog(log);

    expect(parsed.errors).toEqual([
      {
        route: '/demo/api/shipments',
        message: '[404] Page not found: /demo/api/shipments'
      },
      {
        route: '/de/demo/api/shipments',
        message: '[404] Page not found: /de/demo/api/shipments'
      }
    ]);
  });

  /**
   * `Linked from` hangs off the SAME `│ └──` lead as the error message above
   * it, so a parser matching the lead alone counts one dead link twice — and
   * the routes that fail on this site are linked from up to 42 places.
   */
  it('does not mistake a "Linked from" line for a second error', () => {
    expect(parsePrerenderLog(log).errors).toHaveLength(2);
  });

  it('says nothing rather than guessing when the pass never finished', () => {
    const parsed = parsePrerenderLog('ℹ Prerendering 1 initial routes\n');

    expect(parsed.routes).toBeUndefined();
    expect(parsed.prerenderMs).toBeUndefined();
    expect(parsed.errors).toEqual([]);
  });
});

describe('the OG numbers, taken from the tool that owns them', () => {
  it('reads what `duxt-og-cache --report --github` writes', () => {
    const report = parseOgReport(
      [
        'images=281',
        'rendered=237',
        'reused=0',
        'repeated=44',
        'restored=0',
        'timeouts=0',
        'hit-rate=0%',
        'complete=true'
      ].join('\n')
    );

    expect(report).toEqual({ images: 281, timeouts: 0, complete: true });
  });

  it('treats an absent report as no evidence, not as a clean run', () => {
    expect(parseOgReport('')).toEqual({
      images: undefined,
      timeouts: undefined,
      complete: false
    });
  });
});

describe('median', () => {
  it('is the middle of an odd sample', () => {
    expect(median([189_700, 116_900, 161_000])).toBe(161_000);
  });

  it('is the mean of the middle two of an even one', () => {
    expect(median([100, 200, 300, 400])).toBe(250);
  });

  it('is undefined for nothing', () => {
    expect(median([])).toBeUndefined();
  });
});

/** One recorded build, with everything the verdict reads set to a clean run. */
function run(overrides: Partial<PrerenderRun> & { concurrency: number }) {
  return {
    state: 'warm' as const,
    run: 1,
    ok: true,
    routes: 1132,
    prerenderMs: 120_000,
    errors: [],
    images: 281,
    timeouts: 0,
    ...overrides
  } satisfies PrerenderRun;
}

/** Three cold and three warm builds of one concurrency, all identical. */
function sixRuns(concurrency: number, overrides: Partial<PrerenderRun> = {}) {
  return [1, 2, 3].flatMap((n) => [
    run({
      concurrency,
      state: 'cold',
      run: n,
      prerenderMs: 190_000,
      ...overrides
    }),
    run({ concurrency, state: 'warm', run: n, ...overrides })
  ]);
}

describe('the rule that would replace concurrency 8', () => {
  it('keeps 8 when nothing was measured at all', () => {
    const verdict = prerenderBenchVerdict({ runs: [] });

    expect(verdict.chosen).toBe(8);
    expect(verdict.adopt).toBe(false);
  });

  it('keeps 8 when a candidate is faster by less than the threshold', () => {
    const verdict = prerenderBenchVerdict({
      runs: [
        ...sixRuns(8),
        // 5% faster: the right direction, and not enough to move a default.
        ...sixRuns(12, { prerenderMs: 114_000 })
      ]
    });

    expect(verdict.chosen).toBe(8);
    expect(verdict.adopt).toBe(false);
    expect(
      verdict.candidates.find((c) => c.concurrency === 12)?.refusals
    ).toEqual([expect.stringContaining('10%')]);
  });

  it('adopts a candidate that clears the threshold on a clean six', () => {
    const verdict = prerenderBenchVerdict({
      runs: [...sixRuns(8), ...sixRuns(12, { prerenderMs: 100_000 })]
    });

    expect(verdict.chosen).toBe(12);
    expect(verdict.adopt).toBe(true);
  });

  /**
   * THE WHOLE REASON CONCURRENCY WAS LOWERED TO 8. A faster pass that drops
   * pages' OG images is not a faster pass, and a timeout fails nothing on its
   * own — no file is missing, no step goes red. If this rule does not refuse
   * it, nothing does.
   */
  it('refuses a faster candidate that timed out even once', () => {
    const runs = [...sixRuns(8), ...sixRuns(12, { prerenderMs: 100_000 })];
    runs.at(-1)!.timeouts = 1;

    const verdict = prerenderBenchVerdict({ runs });

    expect(verdict.chosen).toBe(8);
    expect(
      verdict.candidates.find((c) => c.concurrency === 12)?.refusals
    ).toEqual([expect.stringContaining('timed out')]);
  });

  /**
   * A render can also be lost without logging a timeout at all. The count in
   * the output is the second, independent witness — the best count any run
   * achieved is what a complete build looks like.
   */
  it('refuses a candidate whose output is missing images', () => {
    const runs = [...sixRuns(8), ...sixRuns(12, { prerenderMs: 100_000 })];
    runs.at(-1)!.images = 275;

    const verdict = prerenderBenchVerdict({ runs });

    expect(verdict.chosen).toBe(8);
    expect(
      verdict.candidates.find((c) => c.concurrency === 12)?.refusals
    ).toEqual([expect.stringContaining('281')]);
  });

  /**
   * NOT ZERO ERRORS — NO NEW ONES. This site prerenders 42 links to routes
   * nothing serves, deliberately, and a rule demanding a clean crawl would
   * refuse every candidate including the baseline for a reason that has
   * nothing to do with concurrency.
   */
  it('ignores the errors the baseline already has', () => {
    const dead = [{ route: '/demo/api/shipments', message: '[404]' }];
    const verdict = prerenderBenchVerdict({
      runs: [
        ...sixRuns(8, { errors: dead }),
        ...sixRuns(12, { prerenderMs: 100_000, errors: dead })
      ]
    });

    expect(verdict.chosen).toBe(12);
    expect(verdict.adopt).toBe(true);
  });

  it('refuses a candidate that broke a route the baseline rendered', () => {
    const runs = [...sixRuns(8), ...sixRuns(12, { prerenderMs: 100_000 })];
    runs.at(-1)!.errors = [{ route: '/guides', message: '[500] boom' }];

    const verdict = prerenderBenchVerdict({ runs });

    expect(verdict.chosen).toBe(8);
    expect(
      verdict.candidates.find((c) => c.concurrency === 12)?.refusals
    ).toEqual([expect.stringContaining('/guides')]);
  });

  it('refuses a candidate that did not complete its six builds', () => {
    const verdict = prerenderBenchVerdict({
      runs: [
        ...sixRuns(8),
        ...sixRuns(12, { prerenderMs: 100_000 }).slice(0, 4)
      ]
    });

    expect(verdict.chosen).toBe(8);
    expect(
      verdict.candidates.find((c) => c.concurrency === 12)?.refusals
    ).toEqual([expect.stringContaining('4 of 6')]);
  });

  /**
   * A clause that was never evaluated must not read as one that passed. If the
   * OG report step did not run, nothing is known about the images, and "nothing
   * known" is not "no images missing".
   */
  it('refuses a candidate nobody counted the images for', () => {
    const verdict = prerenderBenchVerdict({
      runs: [
        ...sixRuns(8, { images: undefined }),
        ...sixRuns(12, { prerenderMs: 100_000, images: undefined })
      ]
    });

    expect(verdict.chosen).toBe(8);
    expect(
      verdict.candidates.find((c) => c.concurrency === 12)?.refusals
    ).toEqual([expect.stringContaining('could not be judged')]);
  });

  it('refuses a candidate whose build failed', () => {
    const runs = [...sixRuns(8), ...sixRuns(12, { prerenderMs: 100_000 })];
    runs.at(-1)!.ok = false;

    const verdict = prerenderBenchVerdict({ runs });

    expect(verdict.chosen).toBe(8);
  });

  it('picks the fastest when two candidates both clear the bar', () => {
    const verdict = prerenderBenchVerdict({
      runs: [
        ...sixRuns(8),
        ...sixRuns(4, { prerenderMs: 100_000 }),
        ...sixRuns(12, { prerenderMs: 90_000 })
      ]
    });

    expect(verdict.chosen).toBe(12);
  });

  /**
   * The comparison is between WARM medians, because a cold run measures the
   * renderer and a warm one measures the crawl. Cold is still recorded — it is
   * the run that is exposed to timeouts — but it is not what moves a default.
   */
  it('compares warm medians and not cold ones', () => {
    const verdict = prerenderBenchVerdict({
      runs: [
        ...sixRuns(8),
        // Far faster cold, no better warm: nothing to adopt.
        ...sixRuns(12, { prerenderMs: 119_000 }).map((r) =>
          r.state === 'cold' ? { ...r, prerenderMs: 60_000 } : r
        )
      ]
    });

    expect(verdict.chosen).toBe(8);
    const twelve = verdict.candidates.find((c) => c.concurrency === 12)!;
    expect(twelve.coldMedianMs).toBe(60_000);
    expect(twelve.warmMedianMs).toBe(119_000);
  });
});

describe('the report', () => {
  const verdict = prerenderBenchVerdict({
    runs: [...sixRuns(8), ...sixRuns(12, { prerenderMs: 100_000 })]
  });

  it('states the verdict and every candidate it rests on', () => {
    const markdown = formatPrerenderBenchReport([], verdict);

    expect(markdown).toContain('concurrency: 12');
    // A row each, and the one the rule picked marked in the table rather than
    // only in the sentence under it.
    expect(markdown).toMatch(/^\| 8 \|/m);
    expect(markdown).toMatch(/^\| 12 ✅ \|/m);
  });

  it('hands the workflow the decision as step outputs', () => {
    const outputs = formatPrerenderBenchReport(['--github'], verdict);

    expect(outputs).toContain('chosen=12');
    expect(outputs).toContain('adopt=true');
    expect(outputs).toContain('baseline=8');
  });

  /**
   * The timeout question CLAUDE.md leaves open is about the BASELINE, and it is
   * answered by a count rather than by silence. A report that only mentions
   * timeouts when a candidate is refused would show nothing at all on the run
   * that finally proves 8 is clean.
   */
  it('always states the baseline timeout count, clean or not', () => {
    const markdown = formatPrerenderBenchReport([], verdict);

    expect(markdown).toMatch(/0 timed-out renders/);
  });

  it('states the core count the numbers were taken on', () => {
    const markdown = formatPrerenderBenchReport(
      [],
      prerenderBenchVerdict({ runs: sixRuns(8, { cores: 4 }) })
    );

    expect(markdown).toContain('Measured on 4 cores.');
  });

  /**
   * A matrix leg that landed on a differently-sized runner is not a faster
   * setting, and nothing else in the run would ever say so. It is a warning
   * rather than a refusal: #44 settled the adoption rule, and a run is not the
   * place to add a clause to it.
   */
  it('warns loudly when the legs were not measured on the same machine', () => {
    const markdown = formatPrerenderBenchReport(
      [],
      prerenderBenchVerdict({
        runs: [
          ...sixRuns(8, { cores: 4 }),
          ...sixRuns(12, { prerenderMs: 100_000, cores: 16 })
        ]
      })
    );

    expect(markdown).toContain('> [!WARNING]');
    expect(markdown).toContain('different core counts (4, 16)');
    expect(markdown).toContain('not like-for-like');
  });

  it('reports peak memory as the resource use #44 asked for', () => {
    const markdown = formatPrerenderBenchReport(
      [],
      prerenderBenchVerdict({ runs: sixRuns(8, { maxRssKb: 6_291_456 }) })
    );

    expect(markdown).toContain('6.0 GB');
  });
});

describe('the benchmark workflow', () => {
  const workflow = parse(
    readFileSync(
      fileURLToPath(
        new URL('../.github/workflows/prerender-bench.yml', import.meta.url)
      ),
      'utf8'
    )
  ) as {
    on: Record<string, unknown>;
    jobs: Record<string, { steps?: { run?: string; uses?: string }[] }>;
  };

  /**
   * #44 decided the benchmark is manual. Eighteen full builds of this site on
   * any other trigger is not a measurement, it is a bill.
   */
  it('runs only when somebody presses the button', () => {
    expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch']);
  });

  /**
   * BUILD-ONLY, AND THE ONE THING THAT MUST NEVER DRIFT. This workflow builds
   * the production artefact eighteen times; a `wrangler deploy` reaching it
   * would publish an unreviewed commit eighteen times over.
   */
  it('never publishes anything', () => {
    const commands = Object.values(workflow.jobs)
      .flatMap((job) => job.steps ?? [])
      .map((step) => `${step.uses ?? ''} ${step.run ?? ''}`)
      .join('\n');

    expect(commands).not.toMatch(/wrangler|deploy:www|publish:cf/);
  });
});
