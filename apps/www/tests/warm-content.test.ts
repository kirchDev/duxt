import { describe, expect, it } from 'vitest';
import { prefixesOf } from '../scripts/warm-content';

describe('prefixesOf', () => {
  it('reads every version prefix and every locale prefix once', () => {
    const listing = [
      '- / — v0.10.0 (current, default)',
      '  locales: en-GB → /, de-DE → /de-DE, pt-BR → /pt-BR',
      '  source: kirchDev/duxt, tag duxt@v0.10.0, docs',
      '- /demo/v1.x — v1.x (eol)',
      '  locales: en-GB → /demo/v1.x',
      '- /v0.8.1 — v0.8.1 (deprecated)',
      '  locales: en-GB → /v0.8.1, de-DE → /de-DE/v0.8.1'
    ].join('\n');

    expect(prefixesOf(listing)).toEqual([
      '/',
      '/de-DE',
      '/pt-BR',
      '/demo/v1.x',
      '/v0.8.1',
      '/de-DE/v0.8.1'
    ]);
  });
});
