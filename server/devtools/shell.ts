// @ts-expect-error virtual module, generated in modules/devtools.ts
import { devtools } from '#duxt-devtools';

/**
 * The chrome every devtools panel is drawn in.
 *
 * Plain HTML with inline styles, not a Vue island: the panel renders inside an
 * iframe in the devtools window, which shares nothing with the site — no
 * stylesheet, no component registry, no theme. One page per panel, linked by a
 * row of tabs, because a single template string stops being editable at about
 * the second panel and there are ten.
 *
 * Nothing here is bundled into a production build: `modules/devtools.ts`
 * returns early outside dev, so the route these files serve is never
 * registered.
 */

/** Paths the module knew at build time and a request handler cannot discover. */
export interface DevtoolsContext {
  rootDir: string;
  layerDir: string;
  dataDir: string;
  appConfigFile?: string;
  locales: string[];
  defaultLocale?: string;
}

export const context = devtools as DevtoolsContext;

export const escape = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
      })[character] ?? character
  );

export const code = (value: unknown) => `<code>${escape(value)}</code>`;
export const dim = (value: unknown) =>
  `<span class="dim">${escape(value)}</span>`;
export const tag = (value: unknown, kind = '') =>
  `<span class="tag ${kind}">${escape(value)}</span>`;

/**
 * A link that opens the file in the editor.
 *
 * Nuxt Devtools serves this endpoint on the site's own origin, and the panel is
 * an iframe on that origin, so a plain anchor is the whole integration. It only
 * works while devtools is running, which is exactly when this page is reachable.
 */
export function editor(file: string | undefined, label?: string): string {
  if (!file) return dim('—');

  const absolute = file.startsWith('/') ? file : `${context.rootDir}/${file}`;

  return `<a class="file" href="/__nuxt_devtools__/open-in-editor?file=${encodeURIComponent(absolute)}" target="_blank" title="${escape(absolute)}">${escape(label ?? file)}</a>`;
}

/** A table, or a single row saying there is nothing in it. */
export function table(headers: string[], rows: string[]): string {
  return `<table>
    <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
    <tbody>${rows.join('') || `<tr><td colspan="${headers.length}" class="dim">Nothing to show.</td></tr>`}</tbody>
  </table>`;
}

export const row = (cells: string[]) =>
  `<tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;

export interface Panel {
  slug: string;
  title: string;
  hint: string;
}

/**
 * The tabs, in the order a problem is usually chased: what the config became,
 * then what a URL does with it, then what the content behind it looks like,
 * then the machinery around it.
 */
export const PANELS: Panel[] = [
  {
    slug: '',
    title: 'Sources',
    hint: 'What `duxt.sources` became: one collection per source and version, and the URL prefix each serves.'
  },
  {
    slug: 'paths',
    title: 'Paths',
    hint: 'Resolve a URL the way the theme does, step by step — and say which step failed.'
  },
  {
    slug: 'pages',
    title: 'Pages',
    hint: 'Every page in every collection, with the frontmatter and git metadata attached to it.'
  },
  {
    slug: 'versions',
    title: 'Versions',
    hint: 'Which versions carry which page. The view the fallback is debugged from.'
  },
  {
    slug: 'checks',
    title: 'Checks',
    hint: 'The build validator, run against what the site is serving now.'
  },
  {
    slug: 'search',
    title: 'Search',
    hint: 'Ask the search index what it actually holds.'
  },
  {
    slug: 'config',
    title: 'Config',
    hint: 'The merged `duxt` config, and which side of the merge each value came from.'
  },
  {
    slug: 'i18n',
    title: 'i18n',
    hint: 'Message keys per locale, against the base language.'
  },
  {
    slug: 'cache',
    title: 'Cache',
    hint: "Content's download cache under `.data/content`, and a way to drop an entry."
  },
  {
    slug: 'redirects',
    title: 'Redirects',
    hint: 'The route rules `redirectFrom` generated, as they shipped.'
  }
];

const href = (slug: string) => `/_duxt/devtools${slug ? `/${slug}` : ''}`;

/** The full document: tab row, panel heading, body. */
export function page(active: string, body: string): string {
  const panel = PANELS.find((entry) => entry.slug === active) ?? PANELS[0]!;

  const tabs = PANELS.map(
    (entry) =>
      `<a href="${href(entry.slug)}"${entry.slug === active ? ' class="on"' : ''}>${escape(entry.title)}</a>`
  ).join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>duxt — ${escape(panel.title)}</title><style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0 16px 32px; font: 13px/1.5 ui-sans-serif, system-ui, sans-serif; color: #111; background: #fff; }
  nav { display: flex; gap: 2px; flex-wrap: wrap; position: sticky; top: 0; background: #fff; padding: 12px 0 10px; margin-bottom: 14px; border-bottom: 1px solid #e5e5e5; z-index: 1; }
  nav a { padding: 4px 10px; border-radius: 6px; text-decoration: none; color: #555; font-weight: 500; }
  nav a:hover { background: #f4f4f5; color: #111; }
  nav a.on { background: #111; color: #fff; }
  h1 { margin: 0 0 4px; font-size: 15px; }
  h2 { margin: 24px 0 8px; font-size: 13px; }
  p.hint { margin: 0 0 16px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  th { font-weight: 600; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; }
  code { font: 12px/1.4 ui-monospace, monospace; background: #f4f4f5; padding: 1px 4px; border-radius: 3px; }
  a.file { color: inherit; text-decoration: none; border-bottom: 1px dotted #999; }
  a.file:hover { border-bottom-style: solid; }
  .dim { color: #999; }
  .tag { background: #111; color: #fff; border-radius: 999px; padding: 1px 6px; font-size: 10px; white-space: nowrap; }
  .tag.warn { background: #b45309; }
  .tag.error { background: #b91c1c; }
  .tag.ok { background: #15803d; }
  .tag.muted { background: #e5e5e5; color: #555; }
  form { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
  input[type=text], input[type=search] { flex: 1; min-width: 240px; padding: 6px 10px; border: 1px solid #d4d4d8; border-radius: 6px; font: inherit; background: #fff; color: inherit; }
  button { padding: 6px 12px; border: 1px solid #d4d4d8; border-radius: 6px; background: #fff; font: inherit; cursor: pointer; color: inherit; }
  button:hover { background: #f4f4f5; }
  ol.steps { margin: 0 0 16px; padding-left: 20px; }
  ol.steps li { margin-bottom: 6px; }
  .note { padding: 10px 12px; border-radius: 6px; background: #f4f4f5; margin-bottom: 16px; }
  .matrix td.yes { color: #15803d; font-weight: 600; }
  .matrix td.no { color: #c4c4c4; }
  @media (prefers-color-scheme: dark) {
    body, nav { color: #eee; background: #111; }
    nav { border-color: #262626; }
    nav a { color: #a3a3a3; }
    nav a:hover { background: #1c1c1c; color: #eee; }
    nav a.on { background: #eee; color: #111; }
    p.hint, th { color: #a3a3a3; }
    th, td, nav { border-color: #262626; }
    code, .note { background: #1c1c1c; }
    input[type=text], input[type=search], button { background: #1c1c1c; border-color: #333; }
    button:hover { background: #262626; }
    .tag { background: #eee; color: #111; }
    .tag.muted { background: #333; color: #ccc; }
    .tag.warn, .tag.error, .tag.ok { color: #fff; }
    .matrix td.no { color: #444; }
  }
</style></head><body>
  <nav>${tabs}</nav>
  <h1>${escape(panel.title)}</h1>
  <p class="hint">${panel.hint.replace(/`([^`]+)`/g, (_, inner: string) => code(inner))}</p>
  ${body}
</body></html>`;
}

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
