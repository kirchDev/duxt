import { expect, it } from 'vitest';
import {
  unreviewedAdvisories,
  type Advisory,
  type AdvisoryReview
} from '../../../scripts/security-audit';

const advisory: Advisory = {
  github_advisory_id: 'GHSA-test',
  module_name: 'test',
  severity: 'high',
  findings: [{ version: '1', paths: ['site>dev>test'] }]
};
const review: AdvisoryReview = {
  id: 'GHSA-test',
  package: 'test',
  severity: 'high',
  reviewBy: '2026-11-10',
  reachability: 'Development only',
  remediation: 'Upgrade parent',
  findings: advisory.findings
};
it('does not silently accept a new advisory, version, dependency path or severity', () => {
  expect(unreviewedAdvisories([advisory], [], '2026-10-11')).toHaveLength(1);
  for (const changed of [
    { ...advisory, severity: 'critical' },
    { ...advisory, findings: [{ version: '2', paths: ['site>dev>test'] }] },
    {
      ...advisory,
      findings: [{ version: '1', paths: ['site>production>test'] }]
    }
  ])
    expect(
      unreviewedAdvisories([changed], [review], '2026-10-11')
    ).toHaveLength(1);
});
it('requires fresh, complete triage and still reports known vulnerabilities', () => {
  expect(unreviewedAdvisories([advisory], [review], '2026-10-11')).toEqual([]);
  expect(unreviewedAdvisories([advisory], [review], '2026-11-10')).toHaveLength(
    1
  );
  expect(
    unreviewedAdvisories(
      [advisory],
      [{ ...review, remediation: '' }],
      '2026-10-11'
    )
  ).toHaveLength(1);
});
