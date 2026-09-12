#!/usr/bin/env node
/**
 * PROVES THAT THE LAYER PASSES A CONTENT DATABASE ADAPTER THROUGH UNTOUCHED.
 *
 * Content v3 runs on five adapters, and duxt claims to care about none of them
 * — the adapter is the consuming site's deployment decision and Content owns
 * the surface. A claim like that is worth exactly as much as the last time
 * somebody checked it, which is why this script exists and why the
 * compatibility table in `docs/2.concepts/11.databases.md` marks an adapter
 * "verified in CI" only where the matrix actually runs it.
 *
 * WHAT IS ACTUALLY BEING TESTED, because it is narrower than it looks. Content
 * keeps TWO databases, and only one of them is the adapter's:
 *
 *   - `content._localDatabase` — the parse cache at `.data/content/
 *     contents.sqlite`, which Content types `sqlite | d1` and nothing else.
 *     This is what `content-cache.ts`, the build validator and `duxt report`
 *     read, and no adapter choice moves it. It exists only during a build.
 *   - `content.database` — the deployed one, which is any of the five. Only
 *     code answering a request ever reads it.
 *
 * So the interesting surface is small: the endpoints that call
 * `queryCollection()` at runtime. Those are what this probes, against a server
 * built with `DUXT_CONTENT_ADAPTER` set. A page is probed too — not because a
 * prerendered page reads the database, but because a build that produced no
 * page did not get far enough for the rest of this to mean anything.
 *
 * IT DOES NOT BUILD. Like `check:a11y` and `check:seo` it runs the server that
 * is already in `www/.output`, so the adapter under test is whatever that build
 * was given. Build first:
 *
 *   DUXT_CONTENT_ADAPTER=libsql pnpm build:app
 *   DUXT_CONTENT_ADAPTER=libsql pnpm check:adapters
 *
 * With the variable unset it probes the default (`sqlite` through
 * `node:sqlite`), which is a useful smoke test and is not what the matrix is
 * for.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = join(root, 'www', '.output', 'server', 'index.mjs');

const PORT = Number(process.env.ADAPTER_CHECK_PORT ?? 3125);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const TIMEOUT = Number(process.env.ADAPTER_CHECK_TIMEOUT_MS ?? 60_000);

/** What the build was pointed at, for the report line only. */
const ADAPTER = process.env.DUXT_CONTENT_ADAPTER ?? 'sqlite (Content default)';

/**
 * A page that exists in every build of `www`, and its Markdown twin.
 *
 * The same page `check:seo` uses, for the same reason: it is a real
 * documentation page rather than the landing page, so it comes out of a
 * collection rather than out of `app.config.ts`.
 */
const PAGE = '/getting-started';

async function main() {
  if (
    !Number.isInteger(PORT) ||
    PORT < 1 ||
    PORT > 65535 ||
    !Number.isInteger(TIMEOUT) ||
    TIMEOUT < 1 ||
    TIMEOUT > 300_000
  ) {
    throw new Error(
      'ADAPTER_CHECK_PORT must be 1..65535 and ADAPTER_CHECK_TIMEOUT_MS must be 1..300000'
    );
  }

  const child = spawn(process.execPath, [server], {
    env: {
      ...process.env,
      PORT: String(PORT),
      NITRO_PORT: String(PORT),
      HOST: '127.0.0.1',
      NITRO_HOST: '127.0.0.1',
      NITRO_UNIX_SOCKET: '',
      NITRO_SSL_CERT: '',
      NITRO_SSL_KEY: '',
      NUXT_PUBLIC_I18N_BASE_URL: ORIGIN,
      NUXT_SITE_URL: ORIGIN
    },
    stdio: 'pipe'
  });

  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));

  const failed = new Promise<never>((_resolve, reject) => {
    child.once('error', (error) =>
      reject(new Error(`server spawn failed: ${error.message}`))
    );
    child.once('exit', (code, signal) =>
      reject(
        new Error(`server exited prematurely (code ${code}, signal ${signal})`)
      )
    );
  });

  try {
    const failures = await Promise.race([
      failed,
      (async () => {
        await waitForServer(child);

        return [
          ...(await checkPage()),
          ...(await checkRawMarkdown()),
          ...(await checkLlms()),
          ...(await checkMcp())
        ];
      })()
    ]);

    if (failures.length) {
      console.error(
        `\nAdapter check failed on ${ADAPTER}:\n  - ${failures.join('\n  - ')}\n`
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      `Adapter check passed on ${ADAPTER} — page, .md source, llms.txt and /mcp all answered from the database.`
    );
  } catch (error) {
    console.error(`\nAdapter check could not run: ${String(error)}`);
    if (stderr.trim()) console.error(stderr.trim());
    process.exitCode = 1;
  } finally {
    await stop(child);
  }
}

/**
 * A rendered page.
 *
 * Not a database assertion on its own — `www` prerenders nothing in a Node
 * build, so this one IS server-rendered and does read the collection — but
 * mostly a statement that the build is a working site before the endpoints
 * below are asked anything.
 */
async function checkPage(): Promise<string[]> {
  const response = await fetch(`${ORIGIN}${PAGE}`, {
    headers: { accept: 'text/html' }
  });

  if (!response.ok) return [`${PAGE} answered ${response.status}`];

  const html = await response.text();

  // A Nuxt error page is also 200 in some presets, so assert on content.
  if (!/<h1[^>]*>/i.test(html)) {
    return [
      `${PAGE} rendered no <h1> — the page did not come out of a collection`
    ];
  }

  return [];
}

/**
 * `…/page.md` — the raw-markdown middleware.
 *
 * The first of the endpoints that cannot be a file, and the clearest read
 * through `queryCollection()`: it selects `rawbody` for one path.
 */
async function checkRawMarkdown(): Promise<string[]> {
  const response = await fetch(`${ORIGIN}${PAGE}.md`);

  if (!response.ok) return [`${PAGE}.md answered ${response.status}`];

  const body = await response.text();

  if (body.trim().length < 40) {
    return [
      `${PAGE}.md answered ${body.length} bytes — the row came back empty`
    ];
  }

  return [];
}

/** `/llms.txt` and `/llms-full.txt`, both of which list the collection. */
async function checkLlms(): Promise<string[]> {
  const failures: string[] = [];

  for (const route of ['/llms.txt', '/llms-full.txt']) {
    const response = await fetch(`${ORIGIN}${route}`);

    if (!response.ok) {
      failures.push(`${route} answered ${response.status}`);
      continue;
    }

    const body = await response.text();

    // Both are built by walking every collection; an empty one is the shape a
    // database that answered but returned nothing takes.
    if (!body.includes(PAGE)) {
      failures.push(
        `${route} does not list ${PAGE} — the collection read came back empty`
      );
    }
  }

  return failures;
}

/**
 * `POST /mcp` — a full MCP session, not just a handshake.
 *
 * `initialize` alone proves nothing about the database: the transport answers
 * it out of the module. So this runs the whole streamable-HTTP dance —
 * initialize, the `initialized` notification, then `tools/call` on `list_pages`
 * — because the tool call is the only part that reaches a collection.
 */
async function checkMcp(): Promise<string[]> {
  const accept = 'application/json, text/event-stream';

  const initialize = await fetch(`${ORIGIN}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'duxt-adapter-check', version: '0' }
      }
    })
  });

  if (!initialize.ok)
    return [`POST /mcp initialize answered ${initialize.status}`];

  const session = initialize.headers.get('mcp-session-id');
  const withSession: Record<string, string> = session
    ? { 'mcp-session-id': session }
    : {};

  await initialize.text();

  await fetch(`${ORIGIN}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept, ...withSession },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    })
  }).then((response) => response.text());

  const called = await fetch(`${ORIGIN}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept, ...withSession },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'list_pages', arguments: {} }
    })
  });

  if (!called.ok) return [`POST /mcp tools/call answered ${called.status}`];

  const payload = parseJsonRpc(await called.text());

  if (!payload) return ['POST /mcp tools/call answered no JSON-RPC body'];
  if (payload.error) {
    return [`POST /mcp list_pages failed: ${JSON.stringify(payload.error)}`];
  }

  const text = JSON.stringify(payload.result ?? '');

  if (!text.includes(PAGE)) {
    return [
      `POST /mcp list_pages listed no pages — the collection read came back empty`
    ];
  }

  return [];
}

/**
 * One JSON-RPC response, however the transport framed it.
 *
 * Streamable HTTP answers either `application/json` or an SSE stream, and which
 * one is the server's choice rather than ours — so both are read here instead
 * of pinning a negotiation this check has no opinion about.
 */
function parseJsonRpc(
  body: string
): { result?: unknown; error?: unknown } | undefined {
  const candidates = body.trim().startsWith('{')
    ? [body]
    : body
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice('data:'.length).trim());

  for (const candidate of candidates.reverse()) {
    try {
      const parsed = JSON.parse(candidate) as {
        result?: unknown;
        error?: unknown;
      };
      if ('result' in parsed || 'error' in parsed) return parsed;
    } catch {
      continue;
    }
  }

  return undefined;
}

/**
 * Wait for OUR child to bind, not for something to answer the port.
 *
 * The same reason `check:seo` reads stdout: polling alone accepts an unrelated
 * process once our own fails to bind, and the check then reports on somebody
 * else's server.
 */
function waitForServer(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolve, reject) => {
    let stdout = '';

    const timer = setTimeout(() => {
      child.stdout.off('data', onData);
      reject(
        new Error(
          `the built server did not announce ${ORIGIN} within ${TIMEOUT}ms. Run \`pnpm build:app\` first.`
        )
      );
    }, TIMEOUT);

    const onData = (chunk: Buffer) => {
      stdout += chunk.toString();

      if (stdout.includes(`Listening on ${ORIGIN}`)) {
        clearTimeout(timer);
        child.stdout.off('data', onData);
        resolve();
      }
    };

    child.stdout.on('data', onData);
  });
}

/** SIGTERM, then SIGKILL a second later if it is still there. */
function stop(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const kill = setTimeout(() => child.kill('SIGKILL'), 1000);

    child.once('exit', () => {
      clearTimeout(kill);
      resolve();
    });

    child.kill('SIGTERM');
  });
}

await main();
