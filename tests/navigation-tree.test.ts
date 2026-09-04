import type { ContentNavigationItem } from '@nuxt/content';
import { describe, expect, it } from 'vitest';
import {
  findByPath,
  sectionItems,
  trailBelowPrefix
} from '../app/utils/navigation-tree';

/** What Content builds for a one-segment prefix: `/workflows`. */
const branchTree: ContentNavigationItem[] = [
  {
    title: 'workflows documentation',
    path: '/workflows',
    children: [
      { title: 'workflows documentation', path: '/workflows' },
      {
        title: 'Guides',
        path: '/workflows/guides',
        children: [
          { title: 'Add a body', path: '/workflows/guides/add-a-body' }
        ]
      }
    ]
  }
] as ContentNavigationItem[];

/** And for a two-segment prefix: `/workflows/v0.7.0` gets a wrapper above it. */
const taggedTree: ContentNavigationItem[] = [
  {
    title: 'Workflows',
    path: '/workflows',
    children: [
      {
        title: 'workflows documentation',
        path: '/workflows/v0.7.0',
        children: [
          { title: 'workflows documentation', path: '/workflows/v0.7.0' },
          {
            title: 'Guides',
            path: '/workflows/v0.7.0/guides',
            children: [
              {
                title: 'Add a body',
                path: '/workflows/v0.7.0/guides/add-a-body'
              }
            ]
          }
        ]
      }
    ]
  }
] as ContentNavigationItem[];

describe('findByPath', () => {
  it('finds a node nested any number of levels down', () => {
    expect(findByPath(taggedTree, '/workflows/v0.7.0/guides')?.title).toBe(
      'Guides'
    );
  });

  it('returns nothing for a path the tree does not hold', () => {
    expect(findByPath(branchTree, '/elsewhere')).toBeUndefined();
  });
});

describe('sectionItems', () => {
  it('lists the section entries on an unversioned tree', () => {
    const items = sectionItems(branchTree, '/workflows', '/workflows/guides');

    expect(items.map((item) => item.title)).toEqual([
      'workflows documentation',
      'Guides'
    ]);
  });

  it('unwraps the extra level a version prefix adds', () => {
    // The bug: the sidebar drew one collapsible group whose only child was
    // itself, because the section matched the wrapper node.
    const items = sectionItems(
      taggedTree,
      '/workflows',
      '/workflows/v0.7.0/guides'
    );

    expect(items.map((item) => item.title)).toEqual([
      'workflows documentation',
      'Guides'
    ]);
  });

  it('gives the same entries for the branch and the tag', () => {
    const fromBranch = sectionItems(
      branchTree,
      '/workflows',
      '/workflows/guides'
    );
    const fromTag = sectionItems(
      taggedTree,
      '/workflows',
      '/workflows/v0.7.0/guides'
    );

    expect(fromTag.map((item) => item.title)).toEqual(
      fromBranch.map((item) => item.title)
    );
  });

  it('stops unwrapping where the route leaves the node', () => {
    // A single root the route is NOT inside must stay visible, or the sidebar
    // would show its children as if they were the section.
    const items = sectionItems(taggedTree, undefined, '/somewhere-else');

    expect(items.map((item) => item.title)).toEqual(['Workflows']);
  });

  it('returns the whole tree when the section is unknown', () => {
    const items = sectionItems(
      branchTree,
      '/nothing-here',
      '/workflows/guides'
    );

    expect(items.map((item) => item.title)).toEqual([
      'workflows documentation',
      'Guides'
    ]);
  });
});

describe('trailBelowPrefix', () => {
  it('drops the wrapper nodes on a versioned page', () => {
    const trail = trailBelowPrefix(
      taggedTree,
      '/workflows/v0.7.0/guides/add-a-body',
      '/workflows/v0.7.0'
    );

    expect(trail.map((item) => item.title)).toEqual(['Guides', 'Add a body']);
  });

  it('gives the same trail as the unversioned page', () => {
    const versioned = trailBelowPrefix(
      taggedTree,
      '/workflows/v0.7.0/guides/add-a-body',
      '/workflows/v0.7.0'
    );
    const plain = trailBelowPrefix(
      branchTree,
      '/workflows/guides/add-a-body',
      '/workflows'
    );

    expect(versioned.map((item) => item.title)).toEqual(
      plain.map((item) => item.title)
    );
  });

  it('returns nothing for a page that is not in the tree', () => {
    expect(trailBelowPrefix(branchTree, '/missing', '/workflows')).toEqual([]);
  });
});
