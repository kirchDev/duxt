import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startBuiltServer } from './built-server.ts';

const origin = 'http://127.0.0.1:3138';
const server = startBuiltServer({ port: 3138, origin });
let session: string | undefined;
let id = 0;
async function rpc(method: string, params?: unknown) {
  const response = await fetch(`${origin}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(session ? { 'mcp-session-id': session } : {})
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
    signal: AbortSignal.timeout(60_000)
  });
  assert.ok(response.ok, `MCP HTTP ${response.status}`);
  session ??= response.headers.get('mcp-session-id') ?? undefined;
  const body = await response.text();
  const text = body.trim().startsWith('{')
    ? body
    : body
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .at(-1)
        ?.slice(5);
  assert.ok(text, 'MCP response contains JSON-RPC');
  const payload = JSON.parse(text) as {
    error?: unknown;
    result?: { isError?: boolean; content?: { text?: string }[] };
  };
  assert.ok(!payload.error && !payload.result?.isError, text);
  return payload.result;
}
try {
  await server.ready();
  await rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'duxt-mcp-bench', version: '0' }
  });
  for (const [name, args] of [
    ['list_pages', { limit: 20 }],
    ['search_docs', { query: 'source', limit: 20 }]
  ] as const) {
    const started = performance.now();
    const cold = await rpc('tools/call', { name, arguments: args });
    const coldMs = Math.round(performance.now() - started);
    assert.ok(
      cold?.content?.some((part) => part.text?.includes('nextCursor')),
      'Real content provides more than one page of results'
    );
    const timings: number[] = [];
    for (let sample = 0; sample < 20; sample++) {
      const before = performance.now();
      await rpc('tools/call', { name, arguments: args });
      timings.push(performance.now() - before);
    }
    timings.sort((a, b) => a - b);
    let peakRssKiB: number | undefined;
    try {
      peakRssKiB = Number(
        /VmHWM:\s+(\d+)/.exec(
          readFileSync(`/proc/${server.child.pid}/status`, 'utf8')
        )?.[1]
      );
    } catch {
      /* Linux-only memory measurement. */
    }
    console.log(
      JSON.stringify({
        name,
        limit: 20,
        samples: timings.length,
        coldMs,
        p95Ms: Math.round(timings[Math.ceil(timings.length * 0.95) - 1]!),
        peakRssKiB
      })
    );
  }
} finally {
  await server.stop();
}
