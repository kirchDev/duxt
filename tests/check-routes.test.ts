import { expect, test } from 'vitest';
import {
  DEPLOYMENT_ROUTES,
  EXEMPT_HANDLERS,
  parseHandlerRoutes,
  verifyDeploymentRoutes,
  verifyHandlerCoverage,
  type DeploymentRoute
} from '../scripts/check-routes';

/**
 * The classification is data, so this is what keeps it honest.
 *
 * Two different things are asserted here and they are worth telling apart. The
 * first is that the table still answers the questions it exists to answer —
 * every route named, and none of them left with a blank where the delivery, the
 * D1 dependency or the fallback should be. The second is that the comparison
 * against the build artifact actually fails when the artifact disagrees; a
 * check that cannot go red is a comment with an exit code.
 */

/** The routes #70 requires an answer for, by their id in the table. */
const REQUIRED = [
  '/llms.txt',
  '/llms-full.txt',
  '/rss.xml',
  '/{page}.md',
  '/mcp',
  '/demo/echo'
];

function route(id: string): DeploymentRoute {
  const found = DEPLOYMENT_ROUTES.find((entry) => entry.route === id);
  if (!found) throw new Error(`No classification for ${id}`);

  return found;
}

/** An artifact listing that matches the table, built from the table itself. */
function matchingArtifact(): string[] {
  return DEPLOYMENT_ROUTES.filter(
    (entry) => entry.delivery === 'asset'
  ).flatMap((entry) => entry.probes);
}

test('every route #70 names is classified', () => {
  for (const id of REQUIRED) expect(route(id).route).toBe(id);
});

test('every classification answers all four questions', () => {
  for (const entry of DEPLOYMENT_ROUTES) {
    // Whether the normal deployed request is an asset or the Worker.
    expect(['asset', 'worker']).toContain(entry.delivery);
    // Whether answering it reads D1 at request time.
    expect(typeof entry.d1).toBe('boolean');
    // How a request that was not prerendered is answered.
    expect(entry.fallback.length).toBeGreaterThan(0);
    // Why it lands where it lands.
    expect(entry.why.length).toBeGreaterThan(0);
    // And the probe that makes the claim checkable against the artifact.
    expect(entry.probes.length).toBeGreaterThan(0);
  }
});

test('a documentation page is the one positive asset claim', () => {
  // Without it "served as a prerendered asset" is a value no row ever takes,
  // and the build that renders the SQL dumps and not one page — the exact
  // failure `nitro.prerender.routes` exists to prevent — passes silently.
  expect(DEPLOYMENT_ROUTES.some((entry) => entry.delivery === 'asset')).toBe(
    true
  );
});

test('an artifact that matches the table reports nothing', () => {
  expect(verifyDeploymentRoutes(matchingArtifact())).toEqual([]);
});

test('a worker route written into the artifact is reported', () => {
  const findings = verifyDeploymentRoutes([...matchingArtifact(), 'llms.txt']);

  expect(findings.join('\n')).toContain('/llms.txt');
  expect(findings).toHaveLength(1);
});

test('an asset route missing from the artifact is reported', () => {
  const anchor = DEPLOYMENT_ROUTES.find((entry) => entry.delivery === 'asset')!;
  const findings = verifyDeploymentRoutes(
    matchingArtifact().filter((file) => file !== anchor.probes[0])
  );

  expect(findings.join('\n')).toContain(anchor.probes[0]!);
});

test('page Markdown is matched by suffix, not by one example path', () => {
  // `…/page.md` is a family over arbitrary paths, so a single committed
  // example would go stale the moment that page was renamed.
  const findings = verifyDeploymentRoutes([
    ...matchingArtifact(),
    'guides/some-page-nobody-listed.md'
  ]);

  expect(findings.join('\n')).toContain('/{page}.md');
  expect(findings.join('\n')).toContain('guides/some-page-nobody-listed.md');
});

/**
 * The second half: a handler the table forgot.
 *
 * `verifyDeploymentRoutes` only ever asks whether a CLASSIFIED route is on the
 * side the table claims, so a registered handler with no row at all is invisible
 * to it — which is the exact gap that let `llms-full.txt` and `rss.xml` go
 * unaccounted for before this file existed. Handlers are enumerable from the
 * same build the check already reads, so they are enumerated and every one of
 * them has to be either classified or exempted by name.
 */

/** A handler manifest in the shape Nitro generates it. */
const MANIFEST = `
const handlers = [
  { route: '', handler: _vOaGnc, lazy: false, middleware: true, method: undefined },
  { route: '/llms.txt', handler: _lazy_hCk4l8, lazy: true, middleware: false, method: "get" },
  { route: '/_og/d/**', handler: _lazy_6iVvmj, lazy: true, middleware: false, method: undefined }
];
`;

test('the handler manifest is read out of the bundle', () => {
  expect(parseHandlerRoutes(MANIFEST)).toEqual(['', '/llms.txt', '/_og/d/**']);
});

test('a minified manifest is read too', () => {
  // Nothing promises the Cloudflare bundle keeps the whitespace, and a regex
  // that quietly matches nothing would turn this check into a no-op.
  expect(
    parseHandlerRoutes(
      `const handlers=[{route:"/mcp",handler:_zXQlYV,lazy:false,middleware:false,method:void 0}];`
    )
  ).toEqual(['/mcp']);
});

/** The handler routes the table itself claims, which is a passing build. */
function registeredHandlers(): string[] {
  return ['', ...DEPLOYMENT_ROUTES.flatMap((entry) => entry.handlers)];
}

test('a build whose handlers the table accounts for reports nothing', () => {
  expect(verifyHandlerCoverage(registeredHandlers())).toEqual([]);
});

test('a registered handler with no row and no exemption is reported', () => {
  const findings = verifyHandlerCoverage([
    ...registeredHandlers(),
    '/robots.txt.new'
  ]);

  expect(findings.join('\n')).toContain('/robots.txt.new');
  expect(findings).toHaveLength(1);
});

test('an exempted handler is not reported', () => {
  expect(
    verifyHandlerCoverage([
      ...registeredHandlers(),
      '/__nuxt_content/docs/query'
    ])
  ).toEqual([]);
});

test('every exemption says why the route is not the site’s to classify', () => {
  for (const entry of EXEMPT_HANDLERS) {
    expect(entry.handler.length).toBeGreaterThan(-1);
    expect(entry.why.length).toBeGreaterThan(0);
  }
});

test('a row naming a handler the build no longer registers is reported', () => {
  const findings = verifyHandlerCoverage(
    registeredHandlers().filter((route) => route !== '/llms.txt')
  );

  expect(findings.join('\n')).toContain('/llms.txt');
});

test('a bundle with no manifest in it fails open', () => {
  // A check that cannot find what it compares against must say so. Reporting
  // "nothing unclassified" from an empty reading is the one outcome that would
  // make this check worse than not having it.
  const findings = verifyHandlerCoverage([]);

  expect(findings.join('\n')).toContain('no handler manifest');
});

test('the classification carries the handler each row accounts for', () => {
  for (const entry of DEPLOYMENT_ROUTES) {
    // The `.md` twin is a middleware, and a middleware has no route of its own
    // in the manifest — it is the one row that can name none.
    if (entry.route === '/{page}.md') expect(entry.handlers).toEqual([]);
    else expect(entry.handlers.length).toBeGreaterThan(0);
  }
});
