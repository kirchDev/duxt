#!/usr/bin/env node

/**
 * Restores every Content collection into D1 right after a deploy, one at a
 * time, before a reader's request has to.
 *
 * Content restores a collection lazily, on the first request that reads it
 * after a deploy, and on duxt.app that takes about ten seconds a collection. A
 * docs page reads every version's collection to draw its version switcher, so
 * the first reader of a page after a release triggers a dozen restores at
 * once — and a reader who gives up cancels them halfway, which leaves the
 * collection's `_content_info` row unready and every later read of it waiting
 * 90 seconds and failing. `server/plugins/content-import-lifetime.ts` in the
 * layer keeps a cancelled request's work alive for the platform's grace
 * period; this makes sure the work is not left to readers in the first place.
 *
 * It asks the site's own MCP server, because that is the one public surface
 * that names every prefix and reads exactly the collections behind it:
 * `list_versions` for the prefixes in every language, then `list_pages` on
 * each, sequentially, so no two restores contend.
 *
 * REPORTED, NOT GATED, like the deployment summary: the Worker is live when
 * this runs. A prefix that still fails is a `::warning::`, not a red deploy.
 *
 *   node apps/www/scripts/warm-content.ts https://duxt.app
 */

/** Long enough for one restore to finish where Content's own wait gives up. */
const TIMEOUT_MS = 150_000;

const ATTEMPTS = 2;

async function call(
  origin: string,
  tool: string,
  args: Record<string, unknown>
): Promise<string> {
  const response = await fetch(new URL('/mcp', origin), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: tool, arguments: args }
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  // The toolkit answers as a single server-sent event.
  const text = await response.text();
  const data = text
    .split('\n')
    .find((line) => line.startsWith('data: '))
    ?.slice('data: '.length);
  const payload = JSON.parse(data ?? text) as {
    result?: { isError?: boolean; content?: { text?: string }[] };
    error?: { message?: string };
  };
  const body = payload.result?.content?.map((part) => part.text).join('\n');

  if (payload.error) throw new Error(payload.error.message ?? 'JSON-RPC error');
  // The SDK reports a thrown handler as a RESULT, not as an error.
  if (payload.result?.isError) throw new Error(body ?? 'tool error');

  return body ?? '';
}

/** Every prefix `list_versions` names, each language's included. */
export function prefixesOf(listing: string): string[] {
  const prefixes = new Set<string>();

  for (const line of listing.split('\n')) {
    const version = line.match(/^- (\/\S*) —/);
    if (version) prefixes.add(version[1]!);

    for (const locale of line.matchAll(/→ (\/\S*?)(?:,|$)/g)) {
      prefixes.add(locale[1]!);
    }
  }

  return [...prefixes];
}

async function main() {
  const origin = process.argv[2];
  if (!origin) {
    console.error('usage: warm-content.ts <origin>');
    process.exit(2);
  }

  const prefixes = prefixesOf(await call(origin, 'list_versions', {}));
  const failed: string[] = [];

  for (const prefix of prefixes) {
    const started = Date.now();
    let error: unknown;

    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        await call(origin, 'list_pages', { prefix, limit: 1 });
        error = undefined;
        break;
      } catch (caught) {
        error = caught;
      }
    }

    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (error) {
      failed.push(prefix);
      console.log(`::warning::Content for ${prefix} did not warm: ${error}`);
    } else {
      console.log(`warmed ${prefix} in ${seconds}s`);
    }
  }

  console.log(
    `${prefixes.length - failed.length} of ${prefixes.length} prefixes warm`
  );
}

if (import.meta.main) await main();
