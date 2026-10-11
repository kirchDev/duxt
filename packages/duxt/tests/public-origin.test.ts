import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { duxtPublicOrigin } from '../server/utils/public-origin';

/**
 * The text exports write absolute links. Taken from the request alone, a
 * `Host` header would decide every one of them for whoever reads a cached copy.
 */
describe('duxtPublicOrigin', () => {
  let site: { url?: string };

  beforeEach(() => {
    site = {};
    vi.stubGlobal(
      'getRequestURL',
      () => new URL('https://attacker.test/llms.txt')
    );
    vi.stubGlobal('getSiteConfig', () => site);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('uses the configured site URL over the request', () => {
    site.url = 'https://docs.example/';
    expect(duxtPublicOrigin({} as never)).toBe('https://docs.example');
  });

  it('falls back to the request where nothing is configured', () => {
    expect(duxtPublicOrigin({} as never)).toBe('https://attacker.test');
  });

  it('falls back to the request where the configured URL does not parse', () => {
    site.url = 'not a url';
    expect(duxtPublicOrigin({} as never)).toBe('https://attacker.test');
  });
});
