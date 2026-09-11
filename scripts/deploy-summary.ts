#!/usr/bin/env node

/**
 * Writes the deployment step summary, and with it the one number the deploy
 * pipeline had no way of stating: how long the published commit waited.
 *
 * FRESHNESS IS REPORTED, NOT GATED. Nothing here fails a deploy — by the time
 * this runs the Worker is already live, and a slow queue is a fact to look at
 * rather than an error to raise. There is deliberately no threshold, no SLO and
 * no non-zero exit: the row exists so that a regression in delivery time shows
 * up in the deploy log instead of being noticed months later as "the site feels
 * behind".
 *
 * WHICH CLOCK IT STARTS ON, and why it is not the push. A push event's payload
 * does carry a push time, but a release build and a manual one have none, and a
 * freshness number that means a different thing per trigger is worse than one
 * that means the same thing every time. So the start is the COMMITTER DATE of
 * the commit that was built — `git log -1 --format=%cI`, readable afterwards
 * from the same repository by anyone checking the figure. For the merges that
 * actually reach `main` the two are seconds apart: GitHub writes the merge
 * commit when the button is pressed, and that press is the push.
 */

/** One publication, as the workflow knows it at the moment it finishes. */
export interface Publication {
  /** The full commit sha that was built. */
  sha: string;
  /** The Cloudflare Worker the artefact went to. */
  worker: string;
  /** The event that started the run — `push`, `release`, `workflow_dispatch`. */
  trigger: string;
  /** ISO-8601 committer date of `sha`. */
  committedAt: string;
  /** ISO-8601 instant the upload to Cloudflare completed. */
  publishedAt: string;
}

/**
 * The gap between two instants, or `undefined` where there is no gap to state.
 *
 * A source dated AFTER the publication is not a negative age, it is a clock
 * that cannot be trusted — an amended commit date, a runner out of step — so it
 * reports nothing rather than a number the reader would have to discount.
 */
export function elapsed(fromIso: string, toIso: string): string | undefined {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return undefined;

  const total = Math.floor((to - from) / 1000);
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** The Markdown GitHub renders under the run. */
export function deploymentSummary(publication: Publication): string {
  const wait = elapsed(publication.committedAt, publication.publishedAt);

  return [
    '## 🚀 www deployed',
    '',
    '| Property | Value |',
    '|----------|-------|',
    `| Commit | \`${publication.sha.slice(0, 7)}\` |`,
    `| Worker | \`${publication.worker}\` |`,
    `| Trigger | \`${publication.trigger}\` |`,
    `| Time to publish | ${wait ?? 'unknown'} |`,
    '',
    '<sub>Time to publish is measured from the committer date of the published',
    'commit to the moment the upload to Cloudflare finished. It is reported,',
    'not enforced.</sub>',
    ''
  ].join('\n');
}

/**
 * The workflow entry point: print the summary, exit 0 whatever it found.
 *
 * `deploy.yml` redirects this into `$GITHUB_STEP_SUMMARY` rather than appending
 * from here, so the same command can be run locally to see what a deploy would
 * print.
 */
if (process.env.DEPLOY_WORKER) {
  process.stdout.write(
    deploymentSummary({
      sha: process.env.DEPLOY_SHA ?? '',
      worker: process.env.DEPLOY_WORKER,
      trigger: process.env.DEPLOY_TRIGGER ?? 'unknown',
      committedAt: process.env.DEPLOY_COMMITTED_AT ?? '',
      publishedAt: new Date().toISOString()
    })
  );
}
