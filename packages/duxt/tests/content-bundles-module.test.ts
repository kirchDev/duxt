import { expect, it } from 'vitest';
import module from '../modules/content-bundles';

it('registers its Node importer only for production Node SQLite servers', () => {
  for (const [node, staticOutput, dev, adapter, expected] of [
    [true, false, false, 'sqlite', 1],
    [false, false, false, 'sqlite', 0],
    [true, true, false, 'sqlite', 0],
    [true, false, true, 'sqlite', 0],
    [true, false, false, 'd1', 0],
    [true, false, false, 'postgresql', 0],
    [true, false, false, 'libsql', 0],
    [true, false, false, 'pglite', 0]
  ] as const) {
    const hooks: Record<string, (value: unknown) => void> = {};
    const nuxt = {
      options: {
        dev,
        buildDir: '/fixture/.nuxt',
        build: { templates: [] },
        runtimeConfig: { content: { database: { type: adapter } } }
      },
      hook: (name: string, callback: (value: unknown) => void) => {
        hooks[name] = callback;
      }
    };
    module(undefined, nuxt as never);
    const nitro = {
      options: { node, static: staticOutput, plugins: [], virtual: {} }
    };
    hooks['nitro:init']!(nitro);
    expect(nitro.options.plugins).toHaveLength(expected);
    expect(Object.keys(nitro.options.virtual)).toHaveLength(expected * 2);
    expect(nuxt.options.runtimeConfig).toMatchObject({
      duxt: { contentBundles: { dir: '', statusRoute: false } }
    });
  }
});

it.each([
  ['Bun', ['bun', 'worker', 'node', 'import', 'default']],
  ['Deno', ['deno']]
])(
  'excludes %s presets even when Nitro advertises Node compatibility',
  (_name, exportConditions) => {
    const hooks: Record<string, (value: unknown) => void> = {};
    const nuxt = {
      options: {
        dev: false,
        buildDir: '/fixture/.nuxt',
        build: { templates: [] },
        runtimeConfig: { content: { database: { type: 'sqlite' } } }
      },
      hook: (name: string, callback: (value: unknown) => void) => {
        hooks[name] = callback;
      }
    };
    module(undefined, nuxt as never);
    const nitro = {
      options: {
        node: true,
        static: false,
        exportConditions,
        plugins: [],
        virtual: {}
      }
    };
    hooks['nitro:init']!(nitro);
    expect(nitro.options.plugins).toEqual([]);
    expect(nitro.options.virtual).toEqual({});
  }
);
