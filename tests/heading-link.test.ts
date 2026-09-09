import { describe, expect, it } from 'vitest';
import { headingHasLink } from '../app/utils/heading-link';

/**
 * The check a Prose heading makes before wrapping itself in an anchor.
 *
 * The bug it exists over: `## [1.4.0](…/compare/…)` — what release-please
 * writes on every release, and what the changelog's `flat` granularity renders
 * as one page — put an anchor inside the anchor the heading already was. The
 * parser closes the outer one early, and `pnpm check:a11y` reported five links
 * a screen reader announces as nothing.
 */
describe('headingHasLink', () => {
  it('finds a link the heading carries', () => {
    expect(headingHasLink([{ props: { href: '/somewhere' } }])).toBe(true);
  });

  it('finds one wrapped in emphasis', () => {
    expect(
      headingHasLink([
        { props: {}, children: [{ props: { href: '/somewhere' } }] }
      ])
    ).toBe(true);
  });

  it('says no to an ordinary heading', () => {
    expect(headingHasLink(['Several versions'])).toBe(false);
    expect(headingHasLink(undefined)).toBe(false);
    expect(headingHasLink([{ props: { id: 'x' }, children: ['Text'] }])).toBe(
      false
    );
  });
});
