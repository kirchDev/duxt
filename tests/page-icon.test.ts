import { describe, expect, it } from 'vitest';
import { resolvePageIcon } from '../app/utils/navigation-tree';

/**
 * Three levels of precedence, and the one that matters is the middle one.
 *
 * A page states its icon in frontmatter and most do. Some cannot — an ADR's
 * frontmatter is fixed at `title`, `description`, `status` and `date` — so a
 * section standing in for its pages is what keeps a decision log from rendering
 * eight rows with nothing beside them.
 */
const SECTIONS = [
  { to: '/guides', pageIcon: 'lucide:book' },
  { to: '/adr', pageIcon: 'lucide:gavel' },
  // Deliberately without one: a section that sets no `pageIcon` falls through
  // to the site's, it does not block it.
  { to: '/concepts' },
  // Nested, and listed BEFORE its parent to prove order does not decide it.
  { to: '/guides/deep', pageIcon: 'lucide:layers' }
];

describe('resolvePageIcon', () => {
  it("prefers the page's own icon over everything", () => {
    expect(
      resolvePageIcon(
        { icon: 'lucide:star', path: '/adr/0001-a' },
        SECTIONS,
        'lucide:file'
      )
    ).toBe('lucide:star');
  });

  it("falls back to the section's pageIcon", () => {
    expect(
      resolvePageIcon({ path: '/adr/0001-a' }, SECTIONS, 'lucide:file')
    ).toBe('lucide:gavel');
  });

  it('falls back to the site-wide icon where the section sets none', () => {
    expect(
      resolvePageIcon({ path: '/concepts/layers' }, SECTIONS, 'lucide:file')
    ).toBe('lucide:file');
  });

  it('answers undefined when nothing sets one', () => {
    expect(
      resolvePageIcon({ path: '/concepts/layers' }, SECTIONS, undefined)
    ).toBeUndefined();
  });

  it('lets a nested section win over the one above it', () => {
    expect(
      resolvePageIcon({ path: '/guides/deep/page' }, SECTIONS, undefined)
    ).toBe('lucide:layers');
  });

  it('matches no section for a path outside all of them', () => {
    expect(resolvePageIcon({ path: '/credits' }, SECTIONS, 'lucide:file')).toBe(
      'lucide:file'
    );
  });

  // An empty string is a value a config can hold and an `<Icon>` cannot draw.
  it('treats an empty icon as absent', () => {
    expect(
      resolvePageIcon({ icon: '', path: '/adr/0001-a' }, SECTIONS, undefined)
    ).toBe('lucide:gavel');
  });

  it('survives a site with no sections at all', () => {
    expect(
      resolvePageIcon({ path: '/adr/0001-a' }, undefined, 'lucide:file')
    ).toBe('lucide:file');
  });
});
