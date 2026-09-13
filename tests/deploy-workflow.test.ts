import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

/**
 * Proves the deploy workflow's supersession policy, because nothing else can.
 *
 * `.github/workflows/deploy.yml` is the one file in that directory carrying its
 * own body, and the only rules it states about which build wins a race live in
 * `concurrency` — evaluated by the runner before a job starts, so no script can
 * be asked what it decided. The alternative to this file is a comment claiming
 * a behaviour that is exercised once, in production, during exactly the burst
 * of pushes nobody is watching.
 *
 * So the workflow is read as GitHub reads it: the expressions are evaluated
 * against the trigger contexts, and what falls out is checked against the
 * decisions on issue #46. The evaluator below understands one expression shape
 * and THROWS on anything else — an unreadable expression has to fail this test,
 * never quietly pass it.
 */

/** The `github` context a run carries, reduced to what this workflow reads. */
interface RunContext {
  event_name: string;
  sha: string;
  run_id: string;
}

interface Step {
  uses?: string;
  name?: string;
  run?: string;
  id?: string;
  with?: Record<string, string>;
  env?: Record<string, string>;
}

interface Job {
  needs?: string | string[];
  outputs?: Record<string, string>;
  concurrency?: { group: string; 'cancel-in-progress': boolean };
  environment?: { name: string } | string;
  steps: Step[];
}

interface Workflow {
  on: Record<string, unknown>;
  concurrency?: unknown;
  jobs: Record<string, Job>;
  [key: string]: unknown;
}

const workflow = parse(
  readFileSync(
    fileURLToPath(new URL('../.github/workflows/deploy.yml', import.meta.url)),
    'utf8'
  )
) as Workflow;

/** One operand: a single-quoted literal, or a field of the `github` context. */
function operand(token: string, github: RunContext): string {
  const literal = /^'(.*)'$/.exec(token);
  if (literal) return literal[1]!;

  const field = /^github\.(\w+)$/.exec(token);
  if (field && field[1]! in github) return github[field[1] as keyof RunContext];

  throw new Error(`deploy.yml uses an operand this test cannot read: ${token}`);
}

/**
 * `a == b && x || y` — GitHub's ternary idiom, and the only shape allowed here.
 * Both branches are non-empty strings, so the `||` never picks up a falsy `x`.
 */
function evaluate(expression: string, github: RunContext): string {
  const body = expression.trim();
  const ternary = /^(\S+) == (\S+) && (\S+) \|\| (\S+)$/.exec(body);
  if (!ternary) return operand(body, github);

  const [, left, right, whenTrue, whenFalse] = ternary;
  return operand(left!, github) === operand(right!, github)
    ? operand(whenTrue!, github)
    : operand(whenFalse!, github);
}

/** A YAML scalar with `${{ … }}` holes in it, resolved for one run. */
function interpolate(template: string, github: RunContext): string {
  return template.replaceAll(/\$\{\{(.+?)\}\}/g, (_, expression: string) =>
    evaluate(expression, github)
  );
}

function push(sha: string, runId: string): RunContext {
  return { event_name: 'push', sha, run_id: runId };
}

function dispatch(runId: string): RunContext {
  return { event_name: 'workflow_dispatch', sha: 'ccc', run_id: runId };
}

function release(runId: string): RunContext {
  return { event_name: 'release', sha: 'ddd', run_id: runId };
}

const build = () => workflow.jobs.build!;
const publish = () => workflow.jobs.publish!;

/** What `actions/checkout` is told to check out, for one run. */
function checkoutRef(job: Job, github: RunContext): string {
  const step = job.steps.find((s) => s.uses?.startsWith('actions/checkout@'));
  if (!step) throw new Error('deploy.yml has a job that checks nothing out');

  const ref = step.with?.ref;
  // No `ref` is GitHub's own default: the commit that triggered the run.
  return ref === undefined ? github.sha : interpolate(ref, github);
}

describe('deploy build supersession', () => {
  it('puts two pushes to main in one group that cancels the older build', () => {
    // The complaint on #46: a running build finishes even though its commit is
    // already stale, and the newest state waits behind it. Same group plus
    // cancel-in-progress is what GitHub needs to drop the stale one.
    const concurrency = build().concurrency!;
    const first = interpolate(concurrency.group, push('aaa', '1'));
    const second = interpolate(concurrency.group, push('bbb', '2'));

    expect(first).toBe(second);
    expect(concurrency['cancel-in-progress']).toBe(true);
  });

  it('leaves a manual run in a group of its own, so no push cancels it', () => {
    // A manual deploy is somebody asking for production to be refreshed — a
    // rotated token, a hostname that has just been applied. It serializes with
    // a running publication, but a push landing meanwhile must not discard it.
    const { group } = build().concurrency!;

    expect(interpolate(group, dispatch('7'))).not.toBe(
      interpolate(group, push('aaa', '1'))
    );
    expect(interpolate(group, dispatch('7'))).not.toBe(
      interpolate(group, dispatch('8'))
    );
  });

  it('leaves a published release in a group of its own too', () => {
    // The release build is what makes `latest` resolve from the new tag. A
    // push cancelling it would leave the site on the previous `latest` until
    // the next commit happened to come along.
    const { group } = build().concurrency!;

    expect(interpolate(group, release('9'))).not.toBe(
      interpolate(group, push('aaa', '1'))
    );
    expect(interpolate(group, release('9'))).not.toBe(
      interpolate(group, release('10'))
    );
  });
});

describe('deploy publication', () => {
  it('serializes publication without ever cancelling one in flight', () => {
    // An upload to Cloudflare that has started completes: a newer successful
    // build publishes AFTER it, never over it.
    const concurrency = publish().concurrency!;

    expect(concurrency.group).toBe('deploy-www-publish');
    expect(concurrency['cancel-in-progress']).toBe(false);
  });

  it('publishes nothing unless the build it belongs to succeeded', () => {
    // A superseded build is cancelled and a failed build fails, and `needs`
    // is what turns either into "production keeps the last published version"
    // rather than "an older artifact goes out".
    expect(publish().needs).toBe('build');
  });

  it('holds the whole deploy in one concurrency policy per job', () => {
    // A workflow-level group would serialize the RUNS, so a newer build could
    // not even start while an older publication is uploading — which is the
    // delay #46 is about.
    expect(workflow.concurrency).toBeUndefined();
  });
});

describe('deploy source ref', () => {
  it('builds the pushed commit for an automatic deploy', () => {
    expect(checkoutRef(build(), push('aaa', '1'))).toBe('aaa');
  });

  it('ignores the ref a manual dispatch was started from', () => {
    // Otherwise `workflow_dispatch` on any branch is a way to put arbitrary
    // code into production, and the dropdown makes it a two-click one.
    expect(checkoutRef(build(), dispatch('7'))).toBe('main');
  });

  it('rebuilds main for a published release rather than its tag', () => {
    // The release build exists to refresh `latest` once the tag is there. It
    // must not also roll production back to the tag when main has moved on.
    expect(checkoutRef(build(), release('9'))).toBe('main');
  });
});

describe('deploy freshness report', () => {
  const summaryStep = () => {
    const step = publish().steps.find((s) =>
      s.run?.includes('scripts/deploy-summary.ts')
    );
    if (!step) throw new Error('No job writes the deployment summary');
    return step;
  };

  it('carries the built commit own date across the job boundary', () => {
    // The publish job checks out `main` and downloads an artefact; it has no
    // way of knowing how old the commit inside that artefact is unless the
    // build job hands the date over. Without this the row reads `unknown` on
    // every deploy, silently, which is worse than no row at all.
    expect(build().outputs?.['committed-at']).toContain(
      'steps.source.outputs.committed-at'
    );
  });

  it('hands that date to the summary it renders', () => {
    expect(Object.values(summaryStep().env ?? {})).toContain(
      '${{ needs.build.outputs.committed-at }}'
    );
  });

  it('never lets the report fail a deploy that already reached Cloudflare', () => {
    // Reported, not gated. The upload has happened by the time this step runs.
    expect(summaryStep().run).not.toContain('exit 1');
  });
});
