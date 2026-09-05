// @ts-expect-error virtual module, generated in modules/devtools.ts
import { devtools } from '#duxt-devtools';

/**
 * The devtools tab's page.
 *
 * Plain HTML with inline styles rather than a Vue island: it is rendered inside
 * an iframe in the devtools panel, which shares nothing with the site — no
 * stylesheet, no component registry, no theme. Registered only in dev; see
 * `modules/devtools.ts`.
 */
interface ResolvedSource {
  collection: string;
  prefix: string;
  repo?: string;
  version?: string;
  isDefault: boolean;
  repository?: string;
  ref?: string;
  refKind?: string;
  path: string;
  status: string;
}

const escape = (value: unknown) =>
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

export default defineEventHandler((event) => {
  const data = devtools as {
    sources: ResolvedSource[];
    reserved: Record<string, string[]>;
  };

  const sources = data.sources ?? [];
  const reserved = data.reserved ?? {};

  const rows = sources
    .map(
      (source) => `<tr>
        <td><code>${escape(source.prefix || '/')}</code></td>
        <td><code>${escape(source.collection)}</code></td>
        <td>${escape(source.repository ?? 'this repository')}</td>
        <td>${escape(source.path)}</td>
        <td>${source.ref ? `${escape(source.ref)} <span class="dim">(${escape(source.refKind)})</span>` : '<span class="dim">checkout</span>'}</td>
        <td>${escape(source.version ?? '—')}${source.isDefault ? ' <span class="tag">default</span>' : ''}</td>
        <td>${escape(source.status)}</td>
        <td>${(reserved[source.collection] ?? []).map((segment) => `<code>${escape(segment)}</code>`).join(' ') || '<span class="dim">—</span>'}</td>
      </tr>`
    )
    .join('');

  event.node.res.setHeader('content-type', 'text/html; charset=utf-8');

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>duxt</title><style>
  body { margin: 0; padding: 16px; font: 13px/1.5 ui-sans-serif, system-ui, sans-serif; color: #111; background: #fff; }
  h1 { margin: 0 0 4px; font-size: 15px; }
  p { margin: 0 0 16px; color: #666; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  th { font-weight: 600; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  code { font: 12px/1.4 ui-monospace, monospace; background: #f4f4f5; padding: 1px 4px; border-radius: 3px; }
  .dim { color: #999; }
  .tag { background: #111; color: #fff; border-radius: 999px; padding: 1px 6px; font-size: 10px; }
  @media (prefers-color-scheme: dark) {
    body { color: #eee; background: #111; }
    th, td { border-color: #262626; }
    code { background: #1c1c1c; }
    .tag { background: #eee; color: #111; }
  }
</style></head><body>
  <h1>Resolved sources</h1>
  <p>What <code>duxt.sources</code> became: one collection per source and version, and the URL prefix each one serves.</p>
  <table>
    <thead><tr>
      <th>Prefix</th><th>Collection</th><th>Repository</th><th>Folder</th>
      <th>Ref</th><th>Version</th><th>Status</th><th>Reserved segments</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="8" class="dim">No sources resolved.</td></tr>'}</tbody>
  </table>
</body></html>`;
});
