import { describe, expect, it } from 'vitest';
import { nearestPages } from '../app/utils/nearest-page';

const pages = [
  { path: '/duxt/guide/deploying', title: 'Deploying' },
  { path: '/duxt/guide/configuring', title: 'Configuring' },
  { path: '/workflows/guide/deploying', title: 'Deploying' },
  { path: '/duxt/reference/sources', title: 'Sources' }
];

describe('nearestPages', () => {
  it('finds the same page under another prefix', () => {
    // The commonest 404 in versioned docs: the right page, the wrong prefix.
    const [first] = nearestPages('/guide/deploying', pages);

    expect(first?.path).toBe('/duxt/guide/deploying');
  });

  it('prefers a match on the last segment over a shared prefix', () => {
    const [first] = nearestPages('/duxt/reference/deploying', pages);

    expect(first?.path).toBe('/duxt/guide/deploying');
  });

  it('catches a renamed page by a partial name', () => {
    const found = nearestPages('/duxt/guide/deploy', pages);

    expect(found.map((page) => page.path)).toContain('/duxt/guide/deploying');
  });

  it('never suggests the page that was asked for', () => {
    const found = nearestPages('/duxt/guide/deploying', pages);

    expect(found.map((page) => page.path)).not.toContain(
      '/duxt/guide/deploying'
    );
  });

  it('suggests nothing for the root', () => {
    expect(nearestPages('/', pages)).toEqual([]);
  });
});
