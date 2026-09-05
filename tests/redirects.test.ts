import { describe, expect, it } from 'vitest';
import { redirectRules } from '../modules/redirects';

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
