import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContentNavigationItem } from '@nuxt/content';
import { describe, expect, it } from 'vitest';
import {
  findByPath,
  flattenedNavigationPages,
  navigationCardItems,
  trailBelowPrefix
} from '../app/utils/navigation-tree';
import { nearestPages } from '../app/utils/nearest-page';
import {
  normaliseTfplugindocsPage,
  tfplugindocsNavigation
} from '../tfplugindocs';

describe('normaliseTfplugindocsPage', () => {
  it('takes a resource name from its H1 rather than the Registry title', () => {
    const page = {
      title: 'linear_team (Resource)',
      page_title: 'linear_team Resource - terraform-provider-linear'
    };

    normaliseTfplugindocsPage(page, 'docs/resources/team.md');

    expect(page).toMatchObject({ title: 'linear_team', category: 'resources' });
  });

  it('falls back through page_title to the file name', () => {
    const registry = {
      page_title: 'linear_team Data Source - terraform-provider-linear'
    };
    normaliseTfplugindocsPage(registry, 'docs/data-sources/team.md');
    expect(registry.title).toBe('linear_team');

    const unnamed = {};
    normaliseTfplugindocsPage(unnamed, 'docs/future-things/an-example.md');
    expect(unnamed).toMatchObject({
      title: 'an-example',
      category: 'future-things'
    });
  });

  it('makes the provider index the overview in navigation without changing its page title', () => {
    const page = { title: 'Linear Provider (Provider)' };
    normaliseTfplugindocsPage(page, 'docs/index.md');

    expect(page).toMatchObject({ title: 'Linear Provider', category: 'index' });
  });

  it('normalises the committed generator fixture, including an unknown category', () => {
    const fixture = (relative: string) =>
      readFileSync(join('tests/fixtures/tfplugindocs/docs', relative), 'utf8');
    const pageFrom = (relative: string) => {
      const markdown = fixture(relative);
      return {
        title: markdown.match(/^# (.+)$/m)?.[1],
        page_title: markdown.match(/^page_title: "(.+)"$/m)?.[1]
      };
    };

    const resource = pageFrom('resources/team.md');
    normaliseTfplugindocsPage(resource, `docs/resources/team.md`);
    expect(resource).toMatchObject({
      title: 'linear_team',
      category: 'resources'
    });

    const unknown = pageFrom('future-things/an-example.md');
    normaliseTfplugindocsPage(unknown, `docs/future-things/an-example.md`);
    expect(unknown).toMatchObject({
      title: 'an_example',
      category: 'future-things'
    });
  });
});

describe('tfplugindocsNavigation', () => {
  it('orders categories and synthesises alphabetical subcategory groups after direct pages', () => {
    const tree = [
      { title: 'Data Sources', path: '/tf/data-sources' },
      {
        title: 'Resources',
        path: '/tf/resources',
        children: [
          { title: 'Team', path: '/tf/resources/team' },
          { title: 'Alpha', path: '/tf/resources/alpha' },
          { title: 'User', path: '/tf/resources/user', subcategory: 'People' },
          {
            title: 'Project',
            path: '/tf/resources/project',
            subcategory: 'Work'
          },
          {
            title: 'Account',
            path: '/tf/resources/account',
            subcategory: 'People'
          }
        ]
      },
      { title: 'Overview', path: '/tf' },
      { title: 'Experimental', path: '/tf/experimental' },
      { title: 'Guides', path: '/tf/guides' }
    ] as ContentNavigationItem[];

    const result = tfplugindocsNavigation(tree, '/tf');

    expect(result.map((item) => item.title)).toEqual([
      'Overview',
      'Guides',
      'Resources',
      'Data Sources',
      'Experimental'
    ]);
    expect(result[2]?.children?.map((item) => item.title)).toEqual([
      'Alpha',
      'Team',
      'People',
      'Work'
    ]);
    expect(
      result[2]?.children?.[2]?.children?.map((item) => item.title)
    ).toEqual(['Account', 'User']);
    expect(result[2]?.children?.[2]).toMatchObject({ page: false });
    expect(
      flattenedNavigationPages(result).map((item) => item.path)
    ).not.toContain('/tf/resources/__duxt-subcategory-0');
  });

  // The synthetic groups are Vue keys, never routes, so EVERY traversal has to
  // honour the marker — a consumer that reads the tree without checking `page`
  // links to a path that 404s, and the breadcrumb also ships its trail as
  // JSON-LD. One generated tree, read by each of them.
  describe('the synthetic groups reach no consumer as a link', () => {
    const nav = tfplugindocsNavigation(
      [
        {
          title: 'Resources',
          path: '/tf/resources',
          children: [
            { title: 'Team', path: '/tf/resources/team' },
            {
              title: 'User',
              path: '/tf/resources/user',
              subcategory: 'People'
            }
          ]
        }
      ] as ContentNavigationItem[],
      '/tf'
    );

    it('leaves the group out of the breadcrumb trail to a member page', () => {
      const trail = trailBelowPrefix(nav, '/tf/resources/user', '/tf');

      expect(trail.map((item) => item.path)).toEqual([
        '/tf/resources',
        '/tf/resources/user'
      ]);
    });

    it('never suggests the group as a near miss on a 404', () => {
      const candidates = flattenedNavigationPages(nav).map((item) => ({
        path: item.path,
        title: item.title
      }));

      expect(
        nearestPages('/tf/resources/users', candidates).map((page) => page.path)
      ).not.toContain('/tf/resources/__duxt-subcategory-0');
    });

    it('shows the member pages as cards rather than the group', () => {
      const cards = navigationCardItems(
        findByPath(nav, '/tf/resources'),
        '/tf/resources'
      );

      expect(cards.map((item) => item.path)).toEqual([
        '/tf/resources/team',
        '/tf/resources/user'
      ]);
    });
  });
});
