import { expect, it, vi } from 'vitest';
import type { Nuxt } from 'nuxt/schema';
import meilisearchModule from '../module';

const fixture = (options: unknown, dev = false) => {
  const hooks = new Map<string, (value: unknown) => unknown>();
  const nuxt = {
    options: { duxtMeilisearch: options, dev, runtimeConfig: { public: {} } },
    hook: (name: string, callback: (value: unknown) => unknown) =>
      hooks.set(name, callback)
  };
  return {
    nuxt,
    hooks,
    run: () => meilisearchModule({}, nuxt as unknown as Nuxt)
  };
};
it('publishes only browser configuration and gives the dialog override import priority', () => {
  const { nuxt, hooks, run } = fixture({
    host: 'https://search.example',
    index: 'docs',
    searchKey: 'public-only',
    syncKey: 'build-secret',
    taskKey: 'task-secret'
  });
  run();
  expect(nuxt.options.runtimeConfig.public).toEqual({
    duxtMeilisearch: {
      host: 'https://search.example',
      index: 'docs',
      searchKey: 'public-only'
    }
  });
  expect(hooks.has('duxt:search:records')).toBe(false);
  const imports: unknown[] = [];
  hooks.get('imports:extend')!(imports);
  expect(imports).toEqual([
    expect.objectContaining({
      name: 'useMeilisearchSearch',
      as: 'useDuxtSearch',
      priority: 20
    })
  ]);
});
it.each([undefined, 'preview', 'development'])(
  'keeps synchronization dormant outside explicit production (%s)',
  (deployment) => {
    const { hooks, run } = fixture({
      host: 'https://search.example',
      syncKey: 'build-secret',
      sync: { enabled: true, deployment }
    });
    run();
    expect(hooks.has('duxt:search:records')).toBe(false);
  }
);
it('registers production synchronization only when enabled and refuses development or PR environments', () => {
  const options = {
    host: 'https://search.example',
    syncKey: 'build-secret',
    sync: { enabled: true, deployment: 'production' }
  };
  const production = fixture(options);
  production.run();
  expect(production.hooks.has('duxt:search:records')).toBe(true);
  const dev = fixture(options, true);
  dev.run();
  expect(dev.hooks.has('duxt:search:records')).toBe(false);
  vi.stubEnv('GITHUB_EVENT_NAME', 'pull_request');
  try {
    const preview = fixture(options);
    preview.run();
    expect(preview.hooks.has('duxt:search:records')).toBe(false);
  } finally {
    vi.unstubAllEnvs();
  }
});
it('rejects embedding the known build key or URL credentials in public configuration', () => {
  expect(
    fixture({
      host: 'https://search.example',
      searchKey: 'secret',
      syncKey: 'secret'
    }).run
  ).toThrow('separate');
  expect(
    fixture({ host: 'https://secret@search.example', searchKey: 'public' }).run
  ).toThrow('credentials');
});

it('does not allow a Pages build with missing production branch metadata to write', () => {
  vi.stubEnv('CF_PAGES', 'true');
  vi.stubEnv('CF_PAGES_BRANCH', undefined);
  vi.stubEnv('DUXT_PRODUCTION_BRANCH', undefined);
  try {
    const { hooks, run } = fixture({
      host: 'https://search.example',
      syncKey: 'private',
      sync: { enabled: true, deployment: 'production' }
    });
    run();
    expect(hooks.has('duxt:search:records')).toBe(false);
  } finally {
    vi.unstubAllEnvs();
  }
});
