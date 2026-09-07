import type { DuxtSource } from '../../sources-resolve';
import { resolveSources } from '../../sources-resolve';
import type { PageRecord } from '../../validate-report';
import { page, PANELS } from './shell';
import type { Doc, DocGroup, IndexedSection } from './render/content';
import { renderChecks, renderPages, renderSearch } from './render/content';
import { renderPaths, renderSources, renderVersions } from './render/sources';
import type { RedirectRule } from './render/system';
import {
  renderCache,
  renderConfig,
  renderI18n,
  renderRedirects
} from './render/system';

/**
 * Every panel, rendered from a site that does not exist.
 *
 * The documentation has to show what a panel looks like, and the two obvious
 * ways are both bad: a screenshot goes stale the day a column is added, and
 * pointing the reader at the real route only works inside a dev server — the
 * tab is not registered in a build at all, so a published page would frame a
 * 404.
 *
 * So the panels are rendered here through the SAME functions the tab uses,
 * over a fixture site. What the reader sees in the documentation is the real
 * renderer's output; when a panel gains a column, the pictures in the docs
 * gain it in the same commit, because there are no pictures.
 *
 * The fixture is one imagined site, not ten unrelated tables: `acme/sdk` in two
 * versions and two languages, `acme/cli` in one — which is the smallest shape
 * that makes every panel say something. A single-source site would render a
 * Versions tab with nothing in it.
 */

const SOURCES: DuxtSource[] = [
  {
    path: 'docs',
    repo: 'acme/sdk',
    refs: [
      { branch: 'main', label: 'v2' },
      { tag: 'v1.9.4', label: 'v1.9', status: 'deprecated' }
    ],
    locales: ['en', 'de'],
    history: true
  },
  { path: 'docs', repo: 'acme/cli' }
];

const RESOLVED = resolveSources(SOURCES, { defaultLocale: 'en' });

const ROOT = '/srv/acme-docs';

/** The layer's own config, as this fixture site would have written it. */
const CONSUMER = {
  title: 'Acme SDK',
  version: 'v2.4.0',
  sources: SOURCES,
  resolvedSources: RESOLVED,
  landing: {
    headline: {
      en: 'Ship the SDK, not the glue',
      de: 'Weniger Kleber, mehr SDK'
    },
    command: 'npm i @acme/sdk'
  },
  footer: { note: '© Acme Inc.' }
} as unknown as Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/* The pages the fixture site serves                                          */
/* -------------------------------------------------------------------------- */

interface PageSeed {
  path: string;
  title?: string;
  german?: string;
  description?: boolean;
  icon?: string;
  file: string;
  updated?: string;
  contributors?: number;
}

const SDK_PAGES: PageSeed[] = [
  {
    path: '/',
    title: 'Acme SDK',
    german: 'Acme SDK',
    description: true,
    icon: 'lucide:book-open-text',
    file: 'index.md',
    updated: '2026-02-11',
    contributors: 6
  },
  {
    path: '/getting-started',
    title: 'Getting started',
    german: 'Erste Schritte',
    description: true,
    icon: 'lucide:rocket',
    file: '1.getting-started/index.md',
    updated: '2026-02-09',
    contributors: 4
  },
  {
    path: '/getting-started/install',
    title: 'Install',
    german: 'Installation',
    description: true,
    file: '1.getting-started/1.install.md',
    updated: '2026-01-28',
    contributors: 3
  },
  {
    path: '/guides/deploying',
    title: 'Deploying',
    german: 'Deployen',
    description: true,
    icon: 'lucide:ship',
    file: '2.guides/1.deploying.md',
    updated: '2026-02-10',
    contributors: 2
  },
  {
    path: '/guides/caching',
    title: 'Caching',
    description: true,
    file: '2.guides/2.caching.md',
    updated: '2026-02-12',
    contributors: 1
  },
  {
    path: '/reference/client',
    title: 'Client',
    german: 'Client',
    description: true,
    icon: 'lucide:plug',
    file: '3.reference/1.client.md',
    updated: '2026-02-04',
    contributors: 5
  },
  {
    // The row every Pages panel is opened for: a page that made it into the
    // build with no frontmatter to speak of.
    path: '/reference/errors',
    file: '3.reference/2.errors.md',
    updated: '2025-12-19',
    contributors: 1
  },
  {
    path: '/changelog',
    title: 'Changelog',
    description: true,
    icon: 'lucide:history',
    file: '4.changelog.md',
    updated: '2026-02-12',
    contributors: 8
  }
];

const CLI_PAGES: PageSeed[] = [
  {
    path: '/',
    title: 'Acme CLI',
    description: true,
    icon: 'lucide:terminal',
    file: 'index.md'
  },
  {
    path: '/getting-started',
    title: 'Getting started',
    description: true,
    file: '1.getting-started.md'
  },
  {
    path: '/commands',
    title: 'Commands',
    description: true,
    icon: 'lucide:list',
    file: '2.commands/index.md'
  },
  {
    path: '/commands/run',
    title: 'acme run',
    description: true,
    file: '2.commands/1.run.md'
  }
];

/**
 * Which logical page each collection is missing.
 *
 * The gaps are the point. A translation lagging two pages behind and a version
 * that predates a guide are exactly what the Versions matrix exists to show,
 * and a fixture where every column is a full house would show nothing at all.
 */
const MISSING: Record<string, string[]> = {
  docs_de_sdk: ['/guides/caching', '/changelog'],
  docs_sdk_v1_9: ['/guides/caching'],
  docs_de_sdk_v1_9: ['/guides/caching', '/changelog', '/reference/errors']
};

function docsOf(source: DuxtResolvedSource): Doc[] {
  const seeds = source.repo === 'cli' ? CLI_PAGES : SDK_PAGES;
  const skip = new Set(MISSING[source.collection] ?? []);
  const german = source.locale === 'de';

  return seeds
    .filter((seed) => !skip.has(seed.path))
    .map((seed) => ({
      path: `${source.prefix}${seed.path === '/' ? '' : seed.path}` || '/',
      title: german ? seed.german : seed.title,
      description: seed.description
        ? 'One line, for the card and the OG image.'
        : undefined,
      icon: seed.icon,
      id: `${source.collection}/${german ? 'de/' : ''}${seed.file}`,
      lastUpdated:
        source.history && seed.updated
          ? `${seed.updated}T09:12:00Z`
          : undefined,
      contributors: Array.from(
        { length: seed.contributors ?? 0 },
        (_, index) => ({
          name: `Contributor ${index + 1}`
        })
      )
    }));
}

const GROUPS: DocGroup[] = RESOLVED.map((source) => ({
  collection: source.collection,
  docs: docsOf(source)
}));

const BY_COLLECTION = new Map(
  GROUPS.map((group) => [group.collection, group.docs.map((doc) => doc.path)])
);

/**
 * The same pages as the validator sees them.
 *
 * Two deliberate faults, because a Checks panel with nothing in it teaches
 * nobody what a finding looks like: one link to a page that was renamed, and
 * one page with no frontmatter.
 */
const RECORDS: PageRecord[] = GROUPS.flatMap((group) =>
  group.docs.map((doc) => ({
    collection: group.collection,
    path: doc.path,
    file: doc.id ?? doc.path,
    title: doc.title,
    description: doc.description,
    anchors: new Set(['install', 'usage']),
    links:
      doc.path.endsWith('/getting-started') && group.collection === 'docs_sdk'
        ? [{ href: '/guides/cacheing' }, { href: '/guides/deploying#install' }]
        : []
  }))
);

const SECTIONS: IndexedSection[] = [
  {
    collection: 'docs_sdk',
    id: 'docs_sdk/1.getting-started/1.install.md#install',
    title: 'Install',
    titles: ['Getting started'],
    content:
      'Add the package with your package manager of choice. The SDK ships types, so nothing else is needed to get autocompletion in an editor.'
  },
  {
    collection: 'docs_sdk',
    id: 'docs_sdk/2.guides/1.deploying.md#build-output',
    title: 'Build output',
    titles: ['Deploying'],
    content:
      'The build writes a single server bundle and a public directory. Both are what a host needs; nothing else in the repository is read at runtime.'
  },
  {
    collection: 'docs_sdk',
    id: 'docs_sdk/2.guides/2.caching.md#invalidation',
    title: 'Invalidation',
    titles: ['Guides', 'Caching'],
    content:
      'A cached response is keyed by the request path and the account tier, so a change of plan is visible without a purge.'
  },
  {
    collection: 'docs_de_sdk',
    id: 'docs_de_sdk/de/1.getting-started/1.install.md#installation',
    title: 'Installation',
    titles: ['Erste Schritte'],
    content:
      'Das Paket wird mit dem Paketmanager der Wahl hinzugefügt. Typen liegen bei, mehr braucht ein Editor nicht.'
  },
  {
    collection: 'docs_cli',
    id: 'docs_cli/2.commands/1.run.md#flags',
    title: 'Flags',
    titles: ['Commands', 'acme run'],
    content:
      'Every flag has a long form. The short forms exist for the three that are typed most often and are listed beside them.'
  }
];

const LOCALE_KEYS = [
  'duxt.nav.open',
  'duxt.nav.close',
  'duxt.search.placeholder',
  'duxt.search.empty',
  'duxt.toc.title',
  'duxt.page.edit',
  'duxt.page.updated',
  'duxt.version.switch'
];

const CACHE = [
  {
    name: 'github.com-acme-sdk-main',
    size: 4.6 * 1024 * 1024,
    modified: new Date('2026-02-12T08:41:00Z')
  },
  {
    name: 'github.com-acme-sdk-v1.9.4',
    size: 3.9 * 1024 * 1024,
    modified: new Date('2026-01-30T17:03:00Z')
  },
  {
    name: 'github.com-acme-cli-main',
    size: 820 * 1024,
    modified: new Date('2026-02-11T12:20:00Z')
  }
];

const REDIRECTS: RedirectRule[] = [
  {
    from: '/sdk/guides/deploy',
    to: '/sdk/guides/deploying',
    status: 301,
    mine: true
  },
  {
    from: '/de/sdk/guides/deploy',
    to: '/de/sdk/guides/deploying',
    status: 301,
    mine: true
  },
  {
    from: '/sdk/v1-9/guides/deploy',
    to: '/sdk/v1-9/guides/deploying',
    status: 301,
    mine: true
  },
  { from: '/sitemap.xml', to: '/sitemap_index.xml', status: 307, mine: false }
];

/* -------------------------------------------------------------------------- */
/* The panels                                                                 */
/* -------------------------------------------------------------------------- */

/** The body of one panel, rendered from the fixture site. */
export function previewBody(slug: string): string {
  switch (slug) {
    case 'paths':
      return renderPaths({
        // A page that v2 has and v1.9 does not: the fallback's own case, and
        // the reason this panel exists.
        input: '/de/sdk/v1-9/guides/caching',
        locales: ['en', 'de'],
        sources: RESOLVED,
        found: null,
        byCollection: BY_COLLECTION
      });
    case 'pages':
      return renderPages(GROUPS, ROOT);
    case 'versions':
      return renderVersions(RESOLVED, BY_COLLECTION);
    case 'checks':
      return renderChecks(RESOLVED, RECORDS, ROOT);
    case 'search':
      return renderSearch('install', SECTIONS);
    case 'config':
      return renderConfig(CONSUMER);
    case 'i18n':
      return renderI18n({
        files: [
          { dir: 'en', keys: LOCALE_KEYS },
          { dir: 'de', keys: LOCALE_KEYS },
          { dir: 'fr', keys: LOCALE_KEYS.slice(0, -2) },
          { dir: 'pt-BR', keys: [...LOCALE_KEYS, 'duxt.page.translate'] }
        ],
        locales: ['en', 'de', 'fr', 'pt-BR'],
        defaultLocale: 'en'
      });
    case 'cache':
      return renderCache({ dataDir: `${ROOT}/.data/content`, entries: CACHE });
    case 'redirects':
      return renderRedirects(REDIRECTS);
    default:
      return renderSources(RESOLVED, `${ROOT}/app/app.config.ts`);
  }
}

/** The file a preview is written to, and the name a docs page asks for. */
export const previewFile = (slug: string) => `${slug || 'sources'}.html`;

/** Every panel the documentation can embed. */
export const PREVIEW_TABS = PANELS.map((panel) => ({
  ...panel,
  file: previewFile(panel.slug)
}));

/** One panel as a whole document, without the tab row — see `page`. */
export function previewPage(slug: string): string {
  return page(slug, previewBody(slug), true);
}
