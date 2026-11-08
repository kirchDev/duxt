import { expect, it, vi } from 'vitest';
import module from '../modules/search-records';

it.each([
  [true, true],
  [true, false],
  [false, true]
])(
  'does not report a build-only index for bundle mode (%s) with listeners (%s)',
  async (enabled, listening) => {
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      let build: () => Promise<void> = async () => {};
      const nuxt = {
        options: {
          runtimeConfig: {
            duxt: { contentBundles: { dir: enabled ? '/bundles' : '' } }
          },
          appConfig: {}
        },
        hooks: {
          _hooks: { 'duxt:search:records': listening ? [() => {}] : [] }
        },
        hook: (_name: string, handler: () => Promise<void>) => {
          build = handler;
        }
      };
      module(undefined, nuxt as never);
      await build();
      expect(warnings).not.toHaveBeenCalled();
    } finally {
      warnings.mockRestore();
    }
  }
);
