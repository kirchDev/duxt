import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  unreviewedAdvisories,
  type Advisory,
  type AdvisoryReview
} from './security-audit.ts';

const audit = spawnSync('pnpm', ['audit', '--json'], {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
  timeout: 120_000
});
if (audit.error) throw audit.error;
const report = JSON.parse(audit.stdout) as {
  advisories?: Record<string, Advisory>;
  error?: unknown;
  metadata?: unknown;
};
if (
  !report.advisories ||
  !report.metadata ||
  report.error ||
  ![0, 1].includes(audit.status ?? -1)
) {
  throw new Error(
    `Advisory check could not run: ${audit.stdout || audit.stderr}`
  );
}
const reviews = JSON.parse(
  readFileSync(new URL('../security-advisories.json', import.meta.url), 'utf8')
) as AdvisoryReview[];
const advisories = Object.values(report.advisories);
for (const advisory of advisories)
  console.log(
    `${advisory.severity}: ${advisory.github_advisory_id} (${advisory.module_name})`
  );
const failures = unreviewedAdvisories(
  advisories,
  reviews,
  new Date().toISOString().slice(0, 10)
);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `${advisories.length} advisories remain, with current path-specific reviews in security-advisories.json.`
  );
