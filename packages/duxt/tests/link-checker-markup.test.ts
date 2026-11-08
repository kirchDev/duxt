import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveDocumentationPath } from '../app/utils/documentation-link';
import {
  relativeSiteLink,
  isAbsoluteHttpLink
} from '../app/utils/relative-site-link';

const require = createRequire(import.meta.url);
const vue = require('vue');
const { parse, compileScript } = require('vue/compiler-sfc');
const { renderToString } = require('vue/server-renderer');
const { transpileModule, ModuleKind, ScriptTarget } = require('typescript');
const checkerEntry = require.resolve('nuxt-link-checker');
const htmlParser = await import(
  new URL('../../ultrahtml/dist/index.js', pathToFileURL(checkerEntry)).href
);
const checkerSource = readFileSync(checkerEntry, 'utf8');
// Exercise the installed checker's HTML extraction as well as its inspections.
const extraction = checkerSource.slice(
  checkerSource.indexOf('async function extractPayload('),
  checkerSource.indexOf('function prerender(')
);
const extractPayload = new Function(
  'parse',
  'walkSync',
  'ELEMENT_NODE',
  `${extraction}; return extractPayload;`
)(htmlParser.parse, htmlParser.walkSync, htmlParser.ELEMENT_NODE);
const { inspect } = await import(
  new URL('./runtime/shared/inspect.js', pathToFileURL(checkerEntry)).href
);

const siteRequire = createRequire(
  new URL('../../../apps/www/package.json', import.meta.url)
);
const nuxtPackage = siteRequire.resolve('nuxt/package.json');
const nuxtRequire = createRequire(nuxtPackage);
const routerLib = nuxtRequire('vue-router');
const nativeUtils = await import(
  new URL('./dist/app/utils.js', pathToFileURL(nuxtPackage)).href
);
const nativeLinkSource = readFileSync(
  new URL('./dist/app/components/nuxt-link.js', pathToFileURL(nuxtPackage)),
  'utf8'
)
  .replaceAll('import.meta.server', 'true')
  .replaceAll('import.meta.client', 'false')
  .replaceAll('import.meta.dev', 'false');
const nativeLinkCode = transpileModule(nativeLinkSource, {
  compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 }
}).outputText;

function nativeNuxtLink(base: string) {
  const router = routerLib.createRouter({
    history: routerLib.createMemoryHistory(base),
    routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }]
  });
  const modules = {
    '../nuxt.js': {
      useRuntimeConfig: () => ({ app: { baseURL: base } }),
      useNuxtApp: () => ({})
    },
    '../utils.js': nativeUtils,
    '../composables/router.js': { useRouter: () => router },
    vue,
    ufo: nuxtRequire('ufo'),
    '#build/nuxt.config.mjs': { componentIslands: false, nuxtLinkDefaults: {} },
    '#build/router.options.mjs': { hashMode: false }
  };
  const exports = {};
  new Function('require', 'exports', nativeLinkCode)(
    (name: keyof typeof modules) => modules[name] ?? {},
    exports
  );
  return { component: (exports as { default: object }).default, router };
}

const config = {
  title: 'Consumer documentation',
  logo: { src: '/logo.svg', srcDark: '/logo-dark.svg', alt: 'Consumer' },
  navigation: [],
  sections: [],
  links: [],
  poweredBy: false
};

function component(
  name: string,
  duxt: object = config,
  siteUrl = 'https://duxt.app'
) {
  const filename = fileURLToPath(
    new URL(`../app/components/${name}.vue`, import.meta.url)
  );
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename });
  const script = compileScript(descriptor, {
    id: name,
    inlineTemplate: true,
    templateOptions: { compilerOptions: { comments: false } }
  });
  const code = transpileModule(
    script.content.replaceAll('import.meta.prerender', 'false'),
    {
      compilerOptions: {
        module: ModuleKind.CommonJS,
        target: ScriptTarget.ES2022
      }
    }
  ).outputText;
  const globals = {
    ...vue,
    useDuxtConfig: () => duxt,
    useColorMode: () => ({ value: 'dark' }),
    useDuxtPath: () => vue.ref('/demo/v1/guide'),
    useDuxtLink: () => (path: string) =>
      path.startsWith('/') ? `/de-DE${path === '/' ? '' : path}` : path,
    useI18n: () => ({ t: (key: string) => key }),
    useDuxtNavigation: async () => ({ data: vue.ref([]) }),
    useDuxtSection: () => ({ items: vue.ref([]) }),
    useDuxtThemeToggle: () => ({ toggle: () => {} }),
    useDuxtVersion: () => ({ switchable: false }),
    useRoute: () => ({ fullPath: '/demo/v1/guide' }),
    buildSheetNavigation: () => ({ entries: [], sections: [] }),
    sectionsInEdition: () => [],
    useDuxtCollection: () => ({ source: vue.ref({ prefix: '/demo/v1' }) }),
    resolveDocumentationPath,
    relativeSiteLink,
    isAbsoluteHttpLink,
    useSiteConfig: () => ({ url: siteUrl }),
    useActiveHeading: () => vue.ref(undefined)
  };
  const exports = {};
  new Function('require', 'exports', ...Object.keys(globals), code)(
    require,
    exports,
    ...Object.values(globals)
  );
  return {
    component: (exports as { default: object }).default,
    template: descriptor.template.content
  };
}

async function render(
  name: string,
  props = {},
  duxt: object = config,
  siteUrl = 'https://duxt.app',
  routerBase?: string
) {
  const target = component(name, duxt, siteUrl);
  const app = vue.createSSRApp({
    render: () =>
      vue.h(
        target.component,
        props,
        name === 'content/ProseA' ? () => 'Authored link' : undefined
      )
  });
  app.config.globalProperties.$t = (key: string) => key;
  app.config.globalProperties.relativeSiteLink = relativeSiteLink;
  app.config.globalProperties.isAbsoluteHttpLink = isAbsoluteHttpLink;
  app.config.warnHandler = () => {};
  for (const tag of new Set<string>(target.template.match(/(?<=<)[A-Z]\w+/g))) {
    if (['NuxtLink', 'DuxtBrand', 'DuxtLinkLabel', 'Icon'].includes(tag))
      continue;
    app.component(tag, {
      setup:
        (_props: unknown, { slots }: { slots: { default?: () => unknown } }) =>
        () =>
          vue.h('div', slots.default?.())
    });
  }
  const native = routerBase ? nativeNuxtLink(routerBase) : undefined;
  if (native) app.use(native.router);
  app.component(
    'NuxtLink',
    native?.component ?? {
      props: ['to', 'target'],
      setup:
        (
          link: { to: string; target?: string },
          { slots }: { slots: { default?: () => unknown } }
        ) =>
        () =>
          vue.h('a', { href: link.to, target: link.target }, slots.default?.())
    }
  );
  app.component('DuxtBrand', component('DuxtBrand', duxt).component);
  app.component('DuxtLinkLabel', {
    props: ['label'],
    render() {
      return vue.h('span', this.label);
    }
  });
  app.component('Icon', {
    render: () => vue.h('span', { 'aria-hidden': 'true' })
  });
  const html = await renderToString(app);
  return { html, payload: await extractPayload(html) };
}

function issues(
  payload: {
    ids: string[];
    links: { link: string; textContent: string; role: string }[];
  },
  siteUrl = 'https://duxt.app'
) {
  return payload.links.flatMap((link) => {
    const result = inspect({
      ...link,
      ids: payload.ids,
      fromPath: '/de-DE/demo/v1/guide',
      siteConfig: { url: siteUrl },
      response: { status: 200 },
      // Locale spelling and Terraform identifiers are independently tested route policy.
      skipInspections: ['no-uppercase-chars', 'no-underscores']
    });
    return [...result.error, ...result.warning];
  });
}

describe('link checker markup', () => {
  it.each([
    ['https://duxt.app/docs/guide?q=1#intro', false, '/docs/guide?q=1#intro'],
    ['https://duxt.app/', true, '/'],
    ['/guide', false, '/docs/de-DE/guide']
  ])(
    'preserves native NuxtLink navigation on a mounted site: %s',
    async (to, external, href) => {
      const duxt = {
        ...config,
        aside: { links: [{ to, external, label: 'Documentation' }] }
      };
      const { html, payload } = await render(
        'DuxtToc',
        { links: [] },
        duxt,
        'https://duxt.app',
        '/docs/'
      );
      expect(payload.links[0].link).toBe(href);
      expect(html.includes('rel="noopener noreferrer"')).toBe(
        to.startsWith('https:')
      );
      expect(html.includes('target="_blank"')).toBe(external);
    }
  );

  it.each([
    ['https://duxt.app', '/?ref=docs#start'],
    ['https://preview.example.org', 'https://duxt.app/?ref=docs#start']
  ])(
    'keeps the published documentation destination on %s',
    async (siteUrl, href) => {
      const duxt = {
        ...config,
        aside: {
          links: [
            {
              to: 'https://duxt.app/?ref=docs#start',
              label: 'Documentation',
              external: true
            }
          ]
        }
      };
      const { payload, html } = await render(
        'DuxtToc',
        { links: [] },
        duxt,
        siteUrl
      );
      expect(payload.links).toHaveLength(1);
      expect(payload.links[0].link).toBe(href);
      expect(html).toContain('target="_blank"');
      expect(issues(payload, siteUrl)).toEqual([]);
    }
  );

  it.each([
    ['/guide#setup', 'https://duxt.app', '/guide#setup'],
    [
      'https://duxt.app/guide?q=one%20two#setup',
      'https://duxt.app',
      '/guide?q=one%20two#setup'
    ],
    [
      'https://other.example/guide',
      'https://duxt.app',
      'https://other.example/guide'
    ],
    [
      'https://duxt.app:8443/guide',
      'https://duxt.app',
      'https://duxt.app:8443/guide'
    ],
    ['mailto:help@example.org', 'https://duxt.app', 'mailto:help@example.org'],
    [
      'https://duxt.app//other.example/path',
      'https://duxt.app',
      'https://duxt.app//other.example/path'
    ],
    [
      'https://user:secret@duxt.app/guide',
      'https://duxt.app',
      'https://user:secret@duxt.app/guide'
    ],
    ['https://duxt.app/guide', undefined, 'https://duxt.app/guide'],
    ['https://duxt.app/guide', 'invalid', 'https://duxt.app/guide']
  ])(
    'normalizes only the exact configured origin: %s',
    (to, siteUrl, expected) => {
      expect(relativeSiteLink(to, siteUrl)).toBe(expected);
    }
  );

  it.each(['DuxtHeader', 'DuxtFooter'])(
    'names %s brand links for image and text consumers',
    async (name) => {
      for (const duxt of [
        config,
        { ...config, logo: undefined },
        { ...config, logo: { ...config.logo, alt: '' } }
      ]) {
        const { payload } = await render(name, {}, duxt);
        const brands = payload.links.filter(
          (link: { link: string }) => link.link === '/de-DE'
        );
        expect(brands.length).toBe(name === 'DuxtHeader' ? 2 : 1);
        expect(
          brands.map((link: { textContent: string }) => link.textContent)
        ).toEqual(Array(brands.length).fill(duxt.logo?.alt || duxt.title));
        expect(issues(payload)).toEqual([]);
      }
    }
  );

  it('renders a URL-less OpenAPI license as readable text', async () => {
    const { html, payload } = await render('content/OpenApiOverview', {
      license: { name: 'MIT' }
    });
    expect(html).toContain('MIT');
    expect(payload.links).toEqual([]);
    expect(issues(payload)).toEqual([]);
  });

  it('keeps an OpenAPI license URL navigable', async () => {
    const { payload } = await render('content/OpenApiOverview', {
      license: { name: 'MIT', url: 'https://opensource.org/license/mit' }
    });
    expect(payload.links).toHaveLength(1);
    expect(payload.links[0].link).toBe('https://opensource.org/license/mit');
    expect(issues(payload)).toEqual([]);
  });

  it.each([
    { id: 'nestedatt--custom_views' },
    { name: 'legacy-anchor' },
    { id: 'empty-target', href: '' },
    { id: 'preferred', name: 'legacy' }
  ])('preserves a non-link fragment target: %j', async (props) => {
    const { payload, html } = await render('content/ProseA', props);
    expect(payload.links).toEqual([]);
    expect(payload.ids).toEqual(
      props.id && props.name && props.id !== props.name
        ? [props.id, props.name]
        : [props.id ?? props.name]
    );
    expect(html).toContain('<span');
    expect(html).toContain('Authored link');
    expect(issues(payload)).toEqual([]);
  });

  it.each([
    [
      { href: '/guide?mode=full#setup' },
      '/de-DE/demo/v1/guide?mode=full#setup'
    ],
    [{ href: '~/guide#setup' }, '/de-DE/guide#setup'],
    [{ href: '#nestedatt--custom_views' }, '#nestedatt--custom_views'],
    [
      { href: 'https://example.org/guide', target: '_self' },
      'https://example.org/guide'
    ]
  ])(
    'preserves source, locale and target semantics: %j',
    async (props, href) => {
      const { payload, html } = await render('content/ProseA', props);
      expect(payload.links[0].link).toBe(href);
      if (props.target) expect(html).toContain('target="_self"');
      if (href.startsWith('https:')) expect(html).toContain('rel="noopener"');
    }
  );
});
