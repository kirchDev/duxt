import { expect, it } from 'vitest';
import {
  DEPLOYMENT_ROUTES,
  verifyHandlerCoverage
} from '../scripts/check-routes';

it('exempts only the internal infobox probe and still rejects an unclassified child', () => {
  const baseline = [
    '',
    ...DEPLOYMENT_ROUTES.flatMap((entry) => entry.handlers)
  ];
  expect(verifyHandlerCoverage([...baseline, '/api/infobox-fixture'])).toEqual(
    []
  );
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
