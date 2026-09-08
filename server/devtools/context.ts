// @ts-expect-error virtual module, generated in modules/devtools.ts
import { devtools } from '#duxt-devtools';
import type { DevtoolsContext } from './shell';

/**
 * The two things a panel cannot render itself: where this build sits on disk,
 * and what the running app config resolved to.
 *
 * Split from `shell.ts` so that file stays free of both the virtual module and
 * the Nitro auto-imports. Everything in `shell.ts` and `render/` is then plain
 * data in, HTML out — importable from a plain Node script, which is how the
 * documentation renders a panel of its own with fixture data instead of a
 * screenshot that goes stale.
 */
export const context = devtools as DevtoolsContext;

/** The collections the site is serving, straight out of the running app config. */
export function resolvedSources(): DuxtResolvedSource[] {
  const { duxt } = useAppConfig() as { duxt?: Partial<DuxtConfig> };

  return (
    duxt?.resolvedSources ?? [
      {
        collection: 'docs',
        prefix: '',
        path: 'docs',
        isDefault: true,
        status: 'current',
        // A source read off disk is a full checkout, so its history is
        // readable without asking.
        history: true
      }
    ]
  );
}
