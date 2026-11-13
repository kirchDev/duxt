import { describe, expect, it, vi } from 'vitest';

const shared = { public: { i18n: { defaultLocale: 'en-GB' } } };

vi.mock('nitropack/runtime', () => ({
  defineNitroPlugin: (plugin: unknown) => plugin,
  useRuntimeConfig: () => shared
}));

const { default: plugin } =
  await import('../modules/runtime/shared-runtime-config/plugin');

/** The `request` hook the plugin registers, called with a bare event. */
function requestHook() {
  let hook: ((event: unknown) => void) | undefined;
  (plugin as unknown as (app: unknown) => void)({
    hooks: {
      hook: (name: string, callback: (event: unknown) => void) => {
        if (name === 'request') hook = callback;
      }
    }
  });
  return (path: string, context: Record<string, unknown> = {}) => {
    const event = { path, context };
    hook!(event);
    return event.context as { nitro?: { runtimeConfig?: unknown } };
  };
}

describe('shared runtime config for Content queries', () => {
  it('hands an internal Content request the config the process resolved', () => {
    const run = requestHook();

    expect(run('/__nuxt_content/docs/query?v=1').nitro?.runtimeConfig).toBe(
      shared
    );
  });

  it('leaves every other request to Nitro', () => {
    const run = requestHook();

    expect(run('/getting-started').nitro).toBeUndefined();
  });

  it('keeps per-request bindings on a Worker', () => {
    const run = requestHook();

    expect(
      run('/__nuxt_content/docs/query', { cloudflare: { env: {} } }).nitro
    ).toBeUndefined();
  });

  it('never replaces a config a request already has', () => {
    const run = requestHook();
    const own = {};

    expect(
      run('/__nuxt_content/docs/query', {
        nitro: { errors: [], runtimeConfig: own }
      }).nitro?.runtimeConfig
    ).toBe(own);
  });
});
