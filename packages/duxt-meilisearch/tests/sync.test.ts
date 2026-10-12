import { expect, it } from 'vitest';
import { syncMeilisearch } from '../sync';

const records = Object.freeze([
  Object.freeze({
    id: 'stable_id',
    url: '/de/v1/guide#intro',
    title: 'Einführung',
    content: 'Klartext',
    source: '/',
    version: 'v1',
    locale: 'de'
  })
]);
const options = {
  host: 'https://search.example',
  index: 'docs',
  syncKey: 'private',
  enabled: true,
  deployment: 'production' as const
};

it('waits for the complete staging snapshot before swapping and removes the old snapshot only afterwards', async () => {
  const calls: { path: string; method: string; body: unknown }[] = [];
  let uid = 0;
  let staging = '';
  const fetcher: typeof fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, method, body });
    expect(new Headers(init?.headers).get('Authorization')).toBe(
      'Bearer private'
    );
    if (path === '/indexes/docs') return Response.json({ uid: 'docs' });
    if (path.startsWith('/tasks/'))
      return Response.json({ status: 'succeeded' });
    if (path === '/indexes') staging = body.uid;
    return Response.json({ taskUid: ++uid });
  };
  const result = await syncMeilisearch(records, options, fetcher);
  expect(staging).toMatch(/^docs__duxt_[a-f0-9]{32}$/);
  expect(calls).toEqual([
    {
      path: '/indexes',
      method: 'POST',
      body: { uid: staging, primaryKey: 'id' }
    },
    { path: '/tasks/1', method: 'GET', body: undefined },
    {
      path: `/indexes/${staging}/settings`,
      method: 'PATCH',
      body: {
        searchableAttributes: ['title', 'content'],
        filterableAttributes: ['source', 'version', 'locale', 'page'],
        displayedAttributes: [
          'id',
          'url',
          'title',
          'content',
          'source',
          'version',
          'locale'
        ]
      }
    },
    { path: '/tasks/2', method: 'GET', body: undefined },
    {
      path: `/indexes/${staging}/documents`,
      method: 'POST',
      body: [{ ...records[0], page: '/de/v1/guide' }]
    },
    { path: '/tasks/3', method: 'GET', body: undefined },
    { path: '/indexes/docs', method: 'GET', body: undefined },
    {
      path: '/swap-indexes',
      method: 'POST',
      body: [{ indexes: ['docs', staging] }]
    },
    { path: '/tasks/4', method: 'GET', body: undefined },
    { path: `/indexes/${staging}`, method: 'DELETE', body: undefined },
    { path: '/tasks/5', method: 'GET', body: undefined }
  ]);
  expect(result).toMatchObject({ records: 1, cleanupFailed: false });
  expect(records[0].locale).toBe('de');
});

it.each([false, true])(
  'does not contact the service when disabled or targeting a preview (%s)',
  async (enabled) => {
    let requests = 0;
    const result = await syncMeilisearch(
      records,
      { ...options, enabled, deployment: 'preview' },
      async () => {
        requests++;
        throw new Error('must not run');
      }
    );
    expect(requests).toBe(0);
    expect(result.skipped).toBe(true);
  }
);

it.each(['settings', 'documents', 'swap'])(
  'keeps the old snapshot when the %s task fails, and never deletes after an uncertain swap',
  async (failure) => {
    const methods: string[] = [];
    let failedTask = 0;
    let uid = 0;
    const fetcher: typeof fetch = async (input, init) => {
      const path = new URL(String(input)).pathname;
      methods.push(`${init?.method ?? 'GET'} ${path}`);
      if (path.startsWith('/tasks/'))
        return Response.json({
          status:
            Number(path.split('/').at(-1)) === failedTask
              ? 'failed'
              : 'succeeded'
        });
      if (path === '/indexes/docs') return Response.json({ uid: 'docs' });
      const taskUid = ++uid;
      if (
        path.endsWith(`/${failure}`) ||
        (failure === 'swap' && path === '/swap-indexes')
      )
        failedTask = taskUid;
      return Response.json({ taskUid });
    };
    await expect(syncMeilisearch(records, options, fetcher)).rejects.toThrow(
      'failed'
    );
    expect(
      methods.some((call) => call.startsWith('DELETE /indexes/docs__duxt_'))
    ).toBe(failure !== 'swap');
    if (failure !== 'swap') expect(methods).not.toContain('POST /swap-indexes');
  }
);

it('polls queued and processing tasks rather than treating acceptance as publication', async () => {
  const statuses = ['enqueued', 'processing', 'succeeded'];
  let polls = 0;
  const fetcher: typeof fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path.startsWith('/tasks/')) {
      polls++;
      return Response.json({ status: statuses.shift() ?? 'succeeded' });
    }
    if (path === '/indexes/docs') return Response.json({ uid: 'docs' });
    return Response.json({ taskUid: 0 });
  };
  await syncMeilisearch(records, options, fetcher);
  expect(polls).toBe(7);
});
it('bootstraps the target only after an empty staging snapshot is ready and swaps to remove every stale record', async () => {
  const operations: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (path.startsWith('/tasks/'))
      return Response.json({ status: 'succeeded' });
    operations.push(`${init?.method ?? 'GET'} ${path}`);
    if (path === '/indexes/docs') return new Response(null, { status: 404 });
    return Response.json({ taskUid: 0 });
  };
  const result = await syncMeilisearch([], options, fetcher);
  expect(
    operations.map((operation) =>
      operation.replace(/docs__duxt_[a-f0-9]{32}/g, 'staging')
    )
  ).toEqual([
    'POST /indexes',
    'PATCH /indexes/staging/settings',
    'GET /indexes/docs',
    'POST /indexes',
    'POST /swap-indexes',
    'DELETE /indexes/staging'
  ]);
  expect(result.records).toBe(0);
});
it('reports cleanup failure after successful publication without exposing service errors', async () => {
  const fetcher: typeof fetch = async (input, init) => {
    if (init?.method === 'DELETE')
      return new Response('private documents and keys', { status: 500 });
    if (String(input).includes('/tasks/'))
      return Response.json({ status: 'succeeded' });
    if (String(input).endsWith('/indexes/docs'))
      return Response.json({ uid: 'docs' });
    return Response.json({ taskUid: 0 });
  };
  expect((await syncMeilisearch(records, options, fetcher)).cleanupFailed).toBe(
    true
  );
});
it('bounds task waiting and leaves the live index alone when an import never finishes', async () => {
  let mutatedLive = false;
  const fetcher: typeof fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (path === '/swap-indexes') mutatedLive = true;
    if (path.startsWith('/tasks/'))
      return Response.json({ status: 'processing' });
    expect(init?.signal).toBeDefined();
    return Response.json({ taskUid: 0 });
  };
  await expect(
    syncMeilisearch(records, { ...options, taskTimeoutMs: 10 }, fetcher)
  ).rejects.toThrow();
  expect(mutatedLive).toBe(false);
});

it('can read global swap tasks with a separate read-only task key while every write stays index-scoped', async () => {
  let writes = 0;
  const fetcher: typeof fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    const key = new Headers(init?.headers).get('Authorization');
    if (path.startsWith('/tasks/')) {
      expect(key).toBe('Bearer tasks-only');
      return Response.json({ status: 'succeeded' });
    }
    expect(key).toBe('Bearer private');
    if (path === '/indexes/docs') return Response.json({ uid: 'docs' });
    writes++;
    return Response.json({ taskUid: 0 });
  };
  await syncMeilisearch(
    records,
    { ...options, taskKey: 'tasks-only' },
    fetcher
  );
  expect(writes).toBe(5);
});

it('fails closed and retains staging when a global swap task is hidden with HTTP 404', async () => {
  let uid = 0;
  let deleted = false;
  const fetcher: typeof fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (init?.method === 'DELETE') deleted = true;
    if (path === '/tasks/4')
      return Response.json({ code: 'task_not_found' }, { status: 404 });
    if (path.startsWith('/tasks/'))
      return Response.json({ status: 'succeeded' });
    if (path === '/indexes/docs') return Response.json({ uid: 'docs' });
    return Response.json({ taskUid: ++uid });
  };
  await expect(syncMeilisearch(records, options, fetcher)).rejects.toThrow(
    'GET /tasks/4 failed (404)'
  );
  expect(deleted).toBe(false);
});
