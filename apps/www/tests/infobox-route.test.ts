import { expect, it } from 'vitest';
import {
  DEPLOYMENT_ROUTES,
  verifyHandlerCoverage
} from '../scripts/check-routes';

it('rejects the internal infobox probe, children and similarly named handlers', () => {
  const baseline = [
    '',
    ...DEPLOYMENT_ROUTES.flatMap((entry) => entry.handlers)
  ];
  expect(
    verifyHandlerCoverage([...baseline, '/api/infobox-fixture']).join('\n')
  ).toContain('/api/infobox-fixture');
  expect(
    verifyHandlerCoverage([
      ...baseline,
      '/api/infobox-fixture/new-endpoint'
    ]).join('\n')
  ).toContain('/api/infobox-fixture/new-endpoint');
  expect(
    verifyHandlerCoverage([...baseline, '/api/infobox-fixture-other']).join(
      '\n'
    )
  ).toContain('/api/infobox-fixture-other');
});
