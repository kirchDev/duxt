import { expect, it, vi } from 'vitest';
import module from '../modules/search-records';

it.each([
  [true, true],
  [true, false],
  [false, true]
])(
  'warns only for bundle mode (%s) with search listeners (%s)',
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
      if (enabled && listening) {
        expect(warnings).toHaveBeenCalledWith(
          expect.stringContaining('[duxt] content bundle')
        );
        expect(warnings.mock.calls.flat().join(' ')).toContain(
          'duxt:search:records'
        );
      } else expect(warnings).not.toHaveBeenCalled();
    } finally {
      warnings.mockRestore();
    }
  }
);
