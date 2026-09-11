import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { duxtManifest } from '../sections-resolve';

const database = vi.hoisted(() => ({
  pages: {} as Record<
    string,
    { path: string; title: string; rawbody: string }[]
  >,
  selections: [] as { name: string; fields: string[] }[]
}));
vi.mock('@nuxt/content/nitro', () => ({
  queryCollection: (_event: unknown, name: string) => ({
    select(...fields: string[]) {
      database.selections.push({ name, fields });
      return this;
    },
    async all() {
      return database.pages[name] ?? [];
    }
  })
}));

let sources = duxtManifest([{ path: 'docs', locales: ['en', 'de'] }], {
  defaultLocale: 'en'
});
let i18n = {
  locales: ['en-GB', 'de-DE'],
  defaultLocale: 'en-GB',
  strategy: 'prefix_except_default'
};
const event = {
  context: {
    nuxtI18n: { vueI18nOptions: { fallbackLocale: 'en' as string | string[] } }
  }
};

beforeEach(() => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
  vi.stubGlobal('useAppConfig', () => ({
    duxt: { title: 'Test docs', resolvedSources: sources }
  }));
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { i18n } }));
  vi.stubGlobal(
    'getRequestURL',
    () => new URL('https://docs.example/llms.txt')
  );
  vi.stubGlobal('setHeader', vi.fn());
  database.pages = {};
  database.selections = [];
  event.context.nuxtI18n.vueI18nOptions.fallbackLocale = 'en';
  sources = duxtManifest([{ path: 'docs', locales: ['en', 'de'] }], {
    defaultLocale: 'en'
  });
  i18n = {
    locales: ['en-GB', 'de-DE'],
    defaultLocale: 'en-GB',
    strategy: 'prefix_except_default'
  };
});
afterEach(() => vi.unstubAllGlobals());

async function exportsText() {
  const { default: index } = await import('../server/routes/llms.txt.get');
  const { default: full } = await import('../server/routes/llms-full.txt.get');
  return {
    index: await index(event as never),
    full: await full(event as never)
  };
}

async function indexText() {
  const { default: index } = await import('../server/routes/llms.txt.get');
  return index(event as never);
}

it('does not load page bodies for the llms index', async () => {
  database.pages.docs = [
    { path: '/guide', title: 'Guide', rawbody: 'Only the full export needs me' }
  ];

  await indexText();

  expect(database.selections).toHaveLength(2);
  for (const { fields } of database.selections)
    expect(fields).toEqual(['path', 'title', 'description']);
});

it('links translations to the represented public URL in both exports', async () => {
  database.pages.docs = [
    { path: '/getting-started', title: 'Introduction', rawbody: 'English body' }
  ];
  database.pages.docs_de = [
    { path: '/getting-started', title: 'Einführung', rawbody: 'Deutscher Text' }
  ];
  const text = await exportsText();
  expect(text.index).toContain(
    '[Einführung](https://docs.example/de-DE/getting-started.md)'
  );
  expect(
    text.index.match(/https:\/\/docs.example\/getting-started\.md/g)
  ).toHaveLength(1);
  expect(text.full).toContain(
    'Source: https://docs.example/de-DE/getting-started\n\nDeutscher Text'
  );
});

it('exports incomplete translations and regional aliases with their actual fallback body', async () => {
  sources = duxtManifest(
    [{ path: 'docs', locales: ['en', 'de', 'pt', 'it'] }],
    { defaultLocale: 'en' }
  );
  i18n.locales = ['en-GB', 'de-DE', 'pt-PT', 'pt-BR'];
  database.pages.docs = [
    { path: '/guide', title: 'Guide', rawbody: 'Original guide' }
  ];
  database.pages.docs_pt = [
    { path: '/guide', title: 'Guia', rawbody: 'Guia português' }
  ];
  database.pages.docs_it = [
    { path: '/unserved', title: 'Italian only', rawbody: 'Hidden' }
  ];
  const text = await exportsText();
  expect(text.index).toContain('[Guide](https://docs.example/de-DE/guide.md)');
  expect(text.full).toContain(
    'Source: https://docs.example/de-DE/guide\n\nOriginal guide'
  );
  for (const locale of ['pt-PT', 'pt-BR']) {
    expect(text.index).toContain(
      `[Guia](https://docs.example/${locale}/guide.md)`
    );
    expect(text.full).toContain(
      `Source: https://docs.example/${locale}/guide\n\nGuia português`
    );
  }
  expect(text.index).not.toContain('/unserved');
  expect(text.full).not.toContain('Hidden');
  expect(text.index.match(/https:\/\/docs.example/g)).toHaveLength(4);
});

it('exports only default-version Markdown twins, including their generated sections', async () => {
  sources = duxtManifest(
    [
      {
        repo: 'acme/docs',
        path: 'docs',
        locales: ['en', 'de'],
        refs: ['main', 'v1'],
        generated: [
          { type: 'changelog', path: 'CHANGELOG.md', label: 'Releases' }
        ]
      }
    ],
    { defaultLocale: 'en' }
  );
  for (const source of sources)
    database.pages[source.collection] = [
      {
        path: `${source.prefix}/guide`,
        title: source.collection,
        rawbody: `Body ${source.collection}`
      }
    ];
  const text = await exportsText();
  expect(text.index).toContain('https://docs.example/de-DE/releases/guide.md');
  expect(text.index).not.toContain('https://docs.example/de-DE/v1/guide.md');
  expect(text.full).not.toContain(
    'Source: https://docs.example/de-DE/v1/guide'
  );
  expect(text.full).toContain(
    'Source: https://docs.example/de-DE/releases/guide'
  );
});

it.each([
  ['prefix_except_default', ['/guide', '/en-GB/guide']],
  ['prefix', ['/de-DE/guide', '/en-GB/guide']],
  ['prefix_and_default', ['/guide', '/de-DE/guide', '/en-GB/guide']],
  ['no_prefix', ['/guide']]
])(
  'respects %s with a non-English default locale',
  async (strategy, expected) => {
    i18n.defaultLocale = 'de-DE';
    i18n.strategy = strategy;
    sources = duxtManifest([{ path: 'docs', locales: ['de', 'en'] }], {
      defaultLocale: 'de'
    });
    database.pages.docs = [
      { path: '/guide', title: 'Deutsch', rawbody: 'Deutscher Text' }
    ];
    database.pages.docs_en = [
      { path: '/guide', title: 'English', rawbody: 'English body' }
    ];
    const text = await exportsText();
    const urls = [
      ...text.index.matchAll(/\]\(https:\/\/docs.example([^)]*)\)/g)
    ].map((match) => match[1]);
    expect(urls.sort()).toEqual(expected.map((path) => `${path}.md`).sort());
    const germanPath = strategy === 'prefix' ? '/de-DE/guide' : '/guide';
    expect(text.full).toContain(
      `Source: https://docs.example${germanPath}\n\nDeutscher Text`
    );
  }
);

it('keeps the unconfigured single-collection site working', async () => {
  sources = [];
  i18n.locales = [];
  database.pages.docs = [
    { path: '/guide', title: 'Guide', rawbody: 'Only body' }
  ];
  const text = await exportsText();
  expect(text.index.match(/https:\/\/docs.example/g)).toHaveLength(1);
  expect(text.full).toContain(
    'Source: https://docs.example/guide\n\nOnly body'
  );
});

it('uses the configured fallback before the original for an incomplete translation', async () => {
  sources = duxtManifest([{ path: 'docs', locales: ['en', 'de', 'fr'] }], {
    defaultLocale: 'en'
  });
  event.context.nuxtI18n.vueI18nOptions.fallbackLocale = ['fr'];
  database.pages.docs = [
    { path: '/guide', title: 'Guide', rawbody: 'Original' }
  ];
  database.pages.docs_fr = [
    { path: '/guide', title: 'Guide français', rawbody: 'Texte français' }
  ];
  const text = await exportsText();
  expect(text.index).toContain(
    '[Guide français](https://docs.example/de-DE/guide.md)'
  );
  expect(text.full).toContain(
    'Source: https://docs.example/de-DE/guide\n\nTexte français'
  );
});

it('does not emit translations on a single-locale site', async () => {
  i18n.locales = ['en-GB'];
  database.pages.docs = [
    { path: '/guide', title: 'Guide', rawbody: 'Original' }
  ];
  database.pages.docs_de = [
    { path: '/only-german', title: 'Deutsch', rawbody: 'Unserved translation' }
  ];
  const text = await exportsText();
  expect(text.index.match(/https:\/\/docs.example/g)).toHaveLength(1);
  expect(text.full).not.toContain('Unserved translation');
});
