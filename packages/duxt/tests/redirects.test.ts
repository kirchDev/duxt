import { describe, expect, it } from 'vitest';
import { isLiteralPath, redirectRules } from '../modules/redirects';

describe('redirectRules', () => {
  it('resolves an old URL against the page own source prefix', () => {
    // The frontmatter says `/old/url`; the site serves the page at
    // `/duxt/guide`, so the rule has to be written at `/duxt/old/url`.
    const rules = redirectRules(
      [{ path: '/duxt/guide', prefix: '/duxt', redirectFrom: ['/old/url'] }],
      []
    );

    expect(rules['/duxt/old/url']).toEqual({
      redirect: { to: '/duxt/guide', statusCode: 301 }
    });
  });

  it('writes one rule per locale that appears in a URL', () => {
    const rules = redirectRules(
      [{ path: '/guide', prefix: '', redirectFrom: ['/old'] }],
      ['de-DE']
    );

    expect(Object.keys(rules).sort()).toEqual(['/de-DE/old', '/old']);
    expect(rules['/de-DE/old']!.redirect.to).toBe('/de-DE/guide');
  });

  it('leaves an entry that already carries the prefix alone', () => {
    const rules = redirectRules(
      [{ path: '/duxt/guide', prefix: '/duxt', redirectFrom: ['/duxt/old'] }],
      []
    );

    expect(Object.keys(rules)).toEqual(['/duxt/old']);
  });

  it('refuses to redirect a page to itself', () => {
    const rules = redirectRules(
      [{ path: '/guide', prefix: '', redirectFrom: ['/guide'] }],
      []
    );

    expect(rules).toEqual({});
  });
});

/**
 * Route rules match by pattern, so a pattern in a page's frontmatter would be a
 * rule over every URL it matches — written by whoever may edit that page.
 */
describe('isLiteralPath', () => {
  it.each(['/old', '/old/url', '/old/', '/v1.2/guide', '/a-b_c'])(
    'accepts %j',
    (path) => {
      expect(isLiteralPath(path)).toBe(true);
    }
  );

  it.each([
    'old',
    '/**',
    '/api/**',
    '/:slug',
    '/a/:id/b',
    '/a/../mcp',
    '/./a',
    '//evil.test',
    '/a//b',
    '/a\\b'
  ])('refuses %j', (path) => {
    expect(isLiteralPath(path)).toBe(false);
  });

  it('writes no rule for a pattern a page names', () => {
    const rules = redirectRules(
      [{ path: '/guide', prefix: '', redirectFrom: ['/**', '/:slug', '/old'] }],
      []
    );

    expect(Object.keys(rules)).toEqual(['/old']);
  });
});
