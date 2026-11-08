import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { linkCheckerSkipInspections } from '../build/config/link-checker';

const require = createRequire(import.meta.url);
const inspectorUrl = new URL(
  './runtime/shared/inspect.js',
  pathToFileURL(require.resolve('nuxt-link-checker'))
);
const { inspect } = await import(/* @vite-ignore */ inspectorUrl.href);

function check(link: string, options: { status?: number; text?: string } = {}) {
  return inspect({
    link,
    fromPath: '/',
    role: 'a',
    ids: [],
    textContent: options.text ?? 'Documentation',
    siteConfig: { url: 'https://docs.example' },
    response: { status: options.status ?? 200 },
    skipInspections: linkCheckerSkipInspections
  });
}

describe('LinkChecker URL policy', () => {
  it.each([
    '/de-DE/getting-started',
    '/pt-BR/guides/sources',
    '/demo/terraform/resources/agent_skill',
    '/de-DE/demo/terraform/data-sources/workflow_states'
  ])('accepts the existing public URL %s', (path) => {
    const result = check(path);
    expect(result.error).toEqual([]);
    expect(result.warning).toEqual([]);
    expect(result.fix).toBe(path);
  });

  it.each([
    '/de-DE/does-not-exist',
    '/demo/terraform/resources/does_not_exist'
  ])('still rejects a broken destination at %s', (path) => {
    expect(check(path, { status: 404 }).error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'no-error-response' })
      ])
    );
  });

  it('still reports unnamed links', () => {
    expect(check('/', { text: '' }).warning).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'link-text' })])
    );
  });

  it('still reports anchors without a destination', () => {
    expect(check('').warning).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'no-missing-href' })
      ])
    );
  });

  it('still reports absolute links to the same site', () => {
    expect(check('https://docs.example/guide').warning).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'absolute-site-urls' })
      ])
    );
  });
});
