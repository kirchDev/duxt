/**
 * The built `www` server, started for a check and stopped after it.
 *
 * Six checks run against `www/.output/server/index.mjs`, and each used to spawn
 * it, collect its stderr, wait for it and kill it on its own — two different
 * ways of waiting between them, and only two of the six waiting for the right
 * thing.
 *
 * TWO WAYS TO KNOW IT IS UP, and the difference is real:
 *
 *  - with an `origin`, the server is bound to that address and the wait is for
 *    Nitro's own `Listening on <origin>` line. It prints that only after its
 *    listen callback succeeds, so a server that failed to bind never satisfies
 *    it — whereas polling the port accepts whatever else is listening there and
 *    then reports on somebody else's server;
 *  - without one, the port is polled. That is what the checks that address the
 *    server as `localhost` do, and binding them to `127.0.0.1` instead would
 *    move them off an address `localhost` may resolve past.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const entry = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'www',
  '.output',
  'server',
  'index.mjs'
);

export interface BuiltServerOptions {
  port: number;
  /** Bind to this origin and wait for Nitro to announce it. See above. */
  origin?: string;
  /** Extra environment for the server, on top of the port (and host). */
  env?: NodeJS.ProcessEnv;
  /** How long the announcement may take, in milliseconds. */
  timeout?: number;
}

export interface BuiltServer {
  child: ChildProcess;
  /** Everything the server wrote to stderr so far, for a failure report. */
  stderr(): string;
  /** Resolves once the server answers — see the two ways above. */
  ready(): Promise<void>;
  /**
   * Rejects the moment the server dies or fails to spawn. Race work against it
   * so a crash mid-check is reported as a crash rather than as a fetch error.
   */
  exited: Promise<never>;
  /** SIGTERM, then SIGKILL a second later if it is still there. */
  stop(): Promise<void>;
}

export function startBuiltServer({
  port,
  origin,
  env = {},
  timeout = 30_000
}: BuiltServerOptions): BuiltServer {
  const bound = origin
    ? {
        HOST: '127.0.0.1',
        NITRO_HOST: '127.0.0.1',
        NITRO_UNIX_SOCKET: '',
        NITRO_SSL_CERT: '',
        NITRO_SSL_KEY: ''
      }
    : {};

  const child = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      PORT: String(port),
      NITRO_PORT: String(port),
      ...bound,
      ...env
    },
    // stdout is only read while waiting for the announcement. Piped and never
    // drained, it would fill and stall the server, so without one it is dropped.
    stdio: ['ignore', origin ? 'pipe' : 'ignore', 'pipe']
  });

  let stderr = '';
  child.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString()));

  const exited = new Promise<never>((_resolve, reject) => {
    child.once('error', (error) =>
      reject(new Error(`server spawn failed: ${error.message}`))
    );
    child.once('exit', (code, signal) =>
      reject(
        new Error(`server exited prematurely (code ${code}, signal ${signal})`)
      )
    );
  });
  // Handled here so a check that never races it does not die of an unhandled
  // rejection when `stop()` ends the process on purpose.
  exited.catch(() => {});

  return {
    child,
    stderr: () => stderr,
    exited,
    ready: () => (origin ? announced(child, origin, timeout) : answering(port)),
    stop: () => stop(child)
  };
}

function announced(
  child: ChildProcess,
  origin: string,
  timeout: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    let stdout = '';

    const timer = setTimeout(() => {
      child.stdout?.off('data', onData);
      reject(
        new Error(
          `server startup timed out after ${timeout}ms at ${origin}. Run \`pnpm build:app\` first.`
        )
      );
    }, timeout);

    function onData(chunk: Buffer) {
      stdout = (stdout + chunk.toString()).slice(-4096);

      if (stdout.split(/\r?\n/).includes(`Listening on ${origin}`)) {
        clearTimeout(timer);
        child.stdout?.off('data', onData);
        resolve();
      }
    }

    child.once('exit', () => clearTimeout(timer));
    child.once('error', () => clearTimeout(timer));
    child.stdout?.on('data', onData);
  });
}

async function answering(port: number): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch(`http://localhost:${port}/`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(
    `the built server did not answer on port ${port}. Run \`pnpm build:app\` first.`
  );
}

function stop(child: ChildProcess): Promise<void> {
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
