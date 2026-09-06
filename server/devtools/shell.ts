// @ts-expect-error virtual module, generated in modules/devtools.ts
import { devtools } from '#duxt-devtools';

/**
 * The frame every devtools panel is drawn in.
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

/**
 * A table, or an empty state that says what would have filled it.
 *
 * "Nothing to show" is the wrong answer in a debugging view: an empty table is
 * itself a finding, and the reader needs to know which. Every caller that can
 * be empty for an interesting reason passes its own sentence.
 */
export function table(
  headers: string[],
  rows: string[],
  empty = 'Nothing to show.',
  className = ''
): string {
  return `<div class="scroll"><table${className ? ` class="${className}"` : ''}>
    <thead><tr>${headers.map((header) => `<th scope="col">${header}</th>`).join('')}</tr></thead>
    <tbody>${rows.join('') || `<tr><td colspan="${headers.length}" class="empty">${empty}</td></tr>`}</tbody>
  </table></div>`;
}

/**
 * The one-line summary above a panel: counts and verdicts, before the detail.
 *
 * A panel that opens with two hundred rows makes the reader do the counting,
 * and the count is usually the whole answer — five collections, seventy-six
 * pages, no errors.
 */
export function stats(items: (string | undefined)[]): string {
  const kept = items.filter(Boolean);
  if (!kept.length) return '';

  return `<div class="stats">${kept.join('')}</div>`;
}

/** One figure in that row: the number large, what it counts underneath. */
export const stat = (value: unknown, label: string, kind = '') =>
  `<div class="stat ${kind}"><b>${escape(value)}</b><span>${escape(label)}</span></div>`;

/** A text box that hides every row of a table not matching what is typed. */
export const filter = (placeholder: string) =>
  `<input type="search" class="filter" data-filter placeholder="${escape(placeholder)}" aria-label="${escape(placeholder)}">`;

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

/**
 * The palette, borrowed rather than invented.
 *
 * The panel is an iframe inside the devtools window, so it cannot read that
 * window's theme — `prefers-color-scheme` is the only signal it gets, and a
 * page that ignores it is a white rectangle in a dark tool. The accent is
 * Nuxt's own green, which is what makes the tab read as part of devtools
 * instead of as a document someone embedded in it.
 */
const STYLE = `
  :root {
    color-scheme: light dark;
    --bg: #fff;
    --fg: #12141a;
    --muted: #6b7280;
    --faint: #9ca3af;
    --line: #e8e8ea;
    --raised: #f6f6f7;
    --accent: #00a86b;
    --accent-soft: #e6f7f0;
    --warn: #b45309;
    --error: #b91c1c;
    --ok: #15803d;
    --radius: 7px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f1115;
      --fg: #e8e8ea;
      --muted: #9099a8;
      --faint: #5b6472;
      --line: #23262d;
      --raised: #171a20;
      --accent: #00dc82;
      --accent-soft: #10291f;
      --warn: #f59e0b;
      --error: #f87171;
      --ok: #4ade80;
    }
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0 0 40px;
    font: 13px/1.55 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: var(--fg);
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

  header.bar {
    position: sticky; top: 0; z-index: 2;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line);
    padding: 10px 16px 0;
  }
  nav { display: flex; gap: 1px; flex-wrap: wrap; }
  nav a {
    padding: 5px 10px; border-radius: var(--radius) var(--radius) 0 0;
    text-decoration: none; color: var(--muted); font-weight: 500;
    border-bottom: 2px solid transparent; line-height: 1.4;
  }
  nav a:hover { color: var(--fg); background: var(--raised); }
  nav a[aria-current] { color: var(--fg); border-bottom-color: var(--accent); font-weight: 600; }

  main { padding: 18px 16px 0; max-width: 1400px; }
  h1 { margin: 0 0 3px; font-size: 15px; font-weight: 650; letter-spacing: -0.01em; }
  h2 {
    margin: 26px 0 8px; font-size: 12px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .05em; color: var(--muted);
  }
  p.hint { margin: 0 0 16px; color: var(--muted); max-width: 78ch; }

  .stats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .stat {
    display: flex; flex-direction: column; gap: 1px;
    padding: 7px 12px; min-width: 78px;
    border: 1px solid var(--line); border-radius: var(--radius); background: var(--raised);
  }
  .stat b { font-size: 16px; font-weight: 650; font-variant-numeric: tabular-nums; line-height: 1.2; }
  .stat span { font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
  .stat.ok b { color: var(--ok); }
  .stat.warn b { color: var(--warn); }
  .stat.error b { color: var(--error); }

  .scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius); margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 7px 11px; text-align: left; vertical-align: top; }
  /* Offset zero, not the height of the tab bar. .scroll sets overflow-x, which
     computes overflow-y to auto as well, so the box — not the page — is what a
     sticky heading offsets against. At 41px the heading sat 41px down from the
     box's top edge, leaving a blank band above it AND covering the first row:
     the Redirects panel counted eight rules and showed seven. */
  thead th {
    position: sticky; top: 0; z-index: 1;
    background: var(--raised);
    font-weight: 600; color: var(--muted);
    font-size: 10.5px; text-transform: uppercase; letter-spacing: .05em;
    white-space: nowrap; border-bottom: 1px solid var(--line);
  }
  tbody tr { border-top: 1px solid var(--line); }
  tbody tr:first-child { border-top: 0; }
  tbody tr:hover { background: var(--raised); }
  td.empty { color: var(--muted); padding: 16px 11px; text-align: center; }

  code {
    font: 11.5px/1.5 ui-monospace, 'SF Mono', Menlo, monospace;
    background: var(--raised); border: 1px solid var(--line);
    padding: 0 4px; border-radius: 4px; white-space: nowrap;
  }
  a.file { text-decoration: none; border-bottom: 1px dashed var(--faint); }
  a.file:hover { border-bottom-style: solid; color: var(--accent); }
  .dim { color: var(--faint); }
  .trunc {
    display: inline-block; max-width: 34ch; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom;
  }
  td.wide { min-width: 32ch; }

  .tag {
    display: inline-block; border-radius: 999px; padding: 1px 7px;
    font-size: 10px; font-weight: 600; white-space: nowrap;
    background: var(--accent-soft); color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  }
  .tag.warn { background: transparent; color: var(--warn); border-color: color-mix(in srgb, var(--warn) 40%, transparent); }
  .tag.error { background: transparent; color: var(--error); border-color: color-mix(in srgb, var(--error) 40%, transparent); }
  .tag.ok { background: transparent; color: var(--ok); border-color: color-mix(in srgb, var(--ok) 40%, transparent); }
  .tag.muted { background: var(--raised); color: var(--muted); border-color: var(--line); }

  form { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
  input[type=text], input[type=search] {
    flex: 1; min-width: 240px; padding: 6px 11px;
    border: 1px solid var(--line); border-radius: var(--radius);
    font: inherit; background: var(--bg); color: inherit;
  }
  input.filter { margin-bottom: 12px; }
  input::placeholder { color: var(--faint); }
  button {
    padding: 6px 14px; border: 1px solid var(--line); border-radius: var(--radius);
    background: var(--raised); font: inherit; font-weight: 500; cursor: pointer; color: inherit;
  }
  button:hover { border-color: var(--accent); color: var(--accent); }

  ol.steps { margin: 0 0 18px; padding: 0; list-style: none; counter-reset: step; }
  ol.steps li {
    position: relative; counter-increment: step;
    padding: 8px 0 8px 30px; border-left: 2px solid var(--line); margin-left: 9px;
  }
  ol.steps li::before {
    content: counter(step);
    position: absolute; left: -10px; top: 8px;
    width: 18px; height: 18px; border-radius: 999px;
    background: var(--raised); border: 1px solid var(--line);
    font-size: 10px; font-weight: 600; color: var(--muted);
    display: flex; align-items: center; justify-content: center;
  }
  ol.steps li:last-child { border-left-color: transparent; }

  .note {
    padding: 10px 13px; border-radius: var(--radius);
    background: var(--raised); border: 1px solid var(--line);
    color: var(--muted); margin-bottom: 16px; max-width: 90ch;
  }
  .note code { background: var(--bg); }

  details { margin-bottom: 10px; }
  details > summary {
    cursor: pointer; padding: 7px 11px; border-radius: var(--radius);
    background: var(--raised); border: 1px solid var(--line);
    font-weight: 600; list-style-position: inside;
  }
  details > summary:hover { border-color: var(--accent); }
  details[open] > summary { border-radius: var(--radius) var(--radius) 0 0; margin-bottom: -1px; }
  details[open] > summary + .scroll { border-radius: 0 0 var(--radius) var(--radius); }

  .matrix th:first-child, .matrix td:first-child {
    position: sticky; left: 0; background: var(--bg);
    border-right: 1px solid var(--line);
  }
  .matrix thead th:first-child { background: var(--raised); }
  .matrix tbody tr:hover td:first-child { background: var(--raised); }
  .matrix td.mark { text-align: center; }
  .matrix td.yes { color: var(--ok); font-weight: 700; }
  .matrix td.no { color: var(--faint); }
`;

/**
 * The filter box, in six lines rather than a framework.
 *
 * A collection of two hundred pages is a table nobody scrolls. Hiding rows
 * client-side keeps every panel a plain server-rendered document — the reader
 * types, the rows go, and a reload still shows everything.
 */
const SCRIPT = `
  document.addEventListener('input', (event) => {
    const input = event.target;
    if (!input.matches('[data-filter]')) return;

    const term = input.value.trim().toLowerCase();
    const scope = input.closest('details') ?? document;

    for (const row of scope.querySelectorAll('tbody tr')) {
      row.hidden = Boolean(term) && !row.textContent.toLowerCase().includes(term);
    }
  });
`;

/** The full document: tab row, panel heading, body. */
export function page(active: string, body: string): string {
  const panel = PANELS.find((entry) => entry.slug === active) ?? PANELS[0]!;

  const tabs = PANELS.map(
    (entry) =>
      `<a href="${href(entry.slug)}"${entry.slug === active ? ' aria-current="page"' : ''}>${escape(entry.title)}</a>`
  ).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>duxt — ${escape(panel.title)}</title><style>${STYLE}</style></head><body>
  <header class="bar"><nav aria-label="Panels">${tabs}</nav></header>
  <main>
    <h1>${escape(panel.title)}</h1>
    <p class="hint">${panel.hint.replace(/`([^`]+)`/g, (_, inner: string) => code(inner))}</p>
    ${body}
  </main>
  <script>${SCRIPT}</script>
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
