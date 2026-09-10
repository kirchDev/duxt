import { beforeEach, expect, it, vi } from 'vitest';
import { resolveSources } from '../sources-resolve';

const database = vi.hoisted(
  () => new Map<string, Record<string, { rawbody: string }>>()
);
vi.mock('@nuxt/content/nitro', () => ({
  queryCollection: (_event: unknown, collection: string) => ({
    path: (path: string) => ({
      select: () => ({ first: async () => database.get(collection)?.[path] })
    })
  })
}));

const runtime = {
  public: {
    i18n: { defaultLocale: 'en-GB', locales: ['en-GB', { code: 'de-DE' }] }
  }
};
const config = {
  duxt: {
    resolvedSources: resolveSources([{ locales: ['en', 'de'] }], {
      defaultLocale: 'en'
    })
  }
};
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler);
vi.stubGlobal('useAppConfig', () => config);
vi.stubGlobal('useRuntimeConfig', () => runtime);
vi.stubGlobal('setHeader', vi.fn());
const { default: handler } = await import('../server/middleware/raw-markdown');
const request = (path: string) =>
  handler({
    path,
    context: { nuxtI18n: { vueI18nOptions: { fallbackLocale: 'en-GB' } } }
  } as never);

beforeEach(() => {
  database.clear();
  vi.clearAllMocks();
  runtime.public.i18n.locales = ['en-GB', { code: 'de-DE' }];
  config.duxt.resolvedSources = resolveSources([{ locales: ['en', 'de'] }], {
    defaultLocale: 'en'
  });
  runtime.public.i18n.defaultLocale = 'en-GB';
  database.set('docs', {
    '/getting-started': { rawbody: 'duxt is a Nuxt layer.' }
  });
  database.set('docs_de', {
    '/getting-started': { rawbody: 'duxt ist eine Nuxt-Ebene.' }
  });
});

it('serves the German collection for a regional Markdown URL', async () => {
  expect(await request('/de-DE/getting-started.md')).toBe(
    'duxt ist eine Nuxt-Ebene.'
  );
});

it('uses the configured default locale for an unprefixed URL', async () => {
  runtime.public.i18n.defaultLocale = 'de-DE';
  expect(await request('/getting-started.md')).toBe(
    'duxt ist eine Nuxt-Ebene.'
  );
});

it('ignores query strings and preserves the Markdown response contract', async () => {
  database.set('docs_de', {
    '/getting-started': {
      rawbody: '---\ntitle: Einstieg\n---\n\nduxt ist eine Nuxt-Ebene.\n'
    }
  });
  expect(await request('/de-DE/getting-started.md?download=true')).toBe(
    'duxt ist eine Nuxt-Ebene.'
  );
  expect(setHeader).toHaveBeenCalledWith(
    expect.anything(),
    'content-type',
    'text/markdown; charset=utf-8'
  );
});

it('falls back for a missing translation within the selected version only', async () => {
  config.duxt.resolvedSources = resolveSources(
    [
      {
        repo: 'acme/app',
        slug: 'app',
        refs: ['v2', 'v1'],
        locales: ['en', 'de']
      }
    ],
    { defaultLocale: 'en', defaultRef: 'v2' }
  );
  const old = config.duxt.resolvedSources.find(
    (source) => source.prefix === '/app/v1' && source.isDefaultLocale
  )!;
  database.set(old.collection, {
    '/app/v1/guide': { rawbody: 'Version one original.' }
  });
  expect(await request('/de-DE/app/v1/guide.md')).toBe('Version one original.');
  database.delete(old.collection);
  for (const source of config.duxt.resolvedSources.filter(
    (source) => source.prefix !== '/app/v1'
  )) {
    database.set(source.collection, {
      '/app/v1/guide': { rawbody: 'Wrong version.' }
    });
  }
  expect(await request('/de-DE/app/v1/guide.md')).toBeUndefined();
});

it('uses the configured fallback before the original', async () => {
  config.duxt.resolvedSources = resolveSources([{ locales: ['de', 'en-GB'] }], {
    defaultLocale: 'de'
  });
  database.set('docs', { '/getting-started': { rawbody: 'German original.' } });
  const fallback = config.duxt.resolvedSources.find(
    (source) => source.locale === 'en-GB'
  )!;
  database.set(fallback.collection, {
    '/getting-started': { rawbody: 'English fallback.' }
  });
  runtime.public.i18n.locales.push('fr-FR');
  expect(await request('/fr-FR/getting-started.md')).toBe('English fallback.');
});

it('keeps one-source sites working and leaves absent pages to the app 404', async () => {
  config.duxt.resolvedSources = resolveSources([{}]);
  expect(await request('/getting-started.md')).toBe('duxt is a Nuxt layer.');
  expect(await request('/de-DE/missing.md')).toBeUndefined();
  expect(await request('/getting-started')).toBeUndefined();
});
