import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { expect, test } from 'vitest';

test('SEO fixture rejects unknown paths without reflecting request text into HTML', async () => {
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const address = reservation.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  const port = address.port;
  await new Promise<void>((done) => reservation.close(() => done()));
  const child = spawn(process.execPath, ['tests/fixtures/seo-server.mjs'], {
    env: {
      ...process.env,
      SEO_FIXTURE_MODE: 'valid',
      NITRO_PORT: String(port),
      NITRO_HOST: '127.0.0.1',
      NUXT_SITE_URL: `http://127.0.0.1:${port}`
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    await once(child.stdout, 'data');
    const response = await new Promise<{ status: number; body: string }>(
      (done, reject) => {
        const req = request(
          {
            hostname: '127.0.0.1',
            port,
            path: '/"><script>alert(1)</script>',
            signal: AbortSignal.timeout(1000)
          },
          (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
              body += chunk;
            });
            res.on('end', () => done({ status: res.statusCode!, body }));
            res.on('error', reject);
          }
        );
        req.on('error', reject);
        req.end();
      }
    );
    expect(response.body).not.toContain('<script>alert(1)</script>');
    expect(response.status).toBe(404);
  } finally {
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
});
