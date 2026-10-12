import { describe, expect, it } from 'vitest';
import { syncTypesense } from '../sync';

const record = Object.freeze({
  id: 'stable_id',
  url: '/de/v1/guide#intro',
  title: 'Einführung',
  content: 'Plain text',
  source: '/',
  version: 'v1',
  locale: 'de'
});

describe('Typesense full-set synchronization', () => {
  it('publishes every record unchanged and removes the previous managed collection after the alias switches', async () => {
    const calls: { path: string; body?: string }[] = [];
    const request: typeof fetch = async (input, init) => {
      const path = new URL(String(input)).pathname;
      calls.push({ path, body: init?.body as string | undefined });
      if (path === '/aliases/docs' && (init?.method ?? 'GET') === 'GET')
        return Response.json({ collection_name: 'docs__duxt_old' });
      if (path.endsWith('/import')) return new Response('{"success":true}');
      return Response.json({});
    };
    const result = await syncTypesense(
      [record],
      {
        endpoint: 'https://search.example',
        adminKey: 'admin',
        collection: 'docs'
      },
      request
    );
    expect(result.records).toBe(1);
    const imported = calls.find((call) => call.path.endsWith('/import'))!;
    expect(JSON.parse(imported.body!)).toEqual(record);
    const switched = calls.findIndex(
      (call) => call.path === '/aliases/docs' && call.body
    );
    expect(JSON.parse(calls[switched]!.body!)).toEqual({
      collection_name: result.collection
    });
    expect(
      calls.findIndex((call) => call.path === '/collections/docs__duxt_old')
    ).toBeGreaterThan(switched);
  });
  it('keeps the previous index searchable and removes staging when an import row fails despite HTTP 200', async () => {
    let alias = 'docs__duxt_old';
    const deleted: string[] = [];
    const request: typeof fetch = async (input, init) => {
      const path = new URL(String(input)).pathname;
      if (path === '/aliases/docs' && init?.method === 'GET')
        return Response.json({ collection_name: alias });
      if (path.endsWith('/import'))
        return new Response('{"success":false,"error":"bad row"}');
      if (path === '/aliases/docs')
        alias = JSON.parse(String(init?.body)).collection_name;
      if (init?.method === 'DELETE') deleted.push(path);
      return Response.json({});
    };
    await expect(
      syncTypesense(
        [record],
        {
          endpoint: 'https://search.example',
          adminKey: 'admin',
          collection: 'docs'
        },
        request
      )
    ).rejects.toThrow('import');
    expect(alias).toBe('docs__duxt_old');
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).not.toBe('/collections/docs__duxt_old');
  });
});

it('never deletes a potentially published collection when the alias response is lost', async () => {
  let published: string | undefined;
  const deleted: string[] = [];
  const request: typeof fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (path === '/aliases/docs' && init?.method === 'GET')
      return new Response('', { status: 404 });
    if (path.endsWith('/import')) return new Response('{"success":true}');
    if (path === '/aliases/docs' && init?.method === 'PUT') {
      published = JSON.parse(String(init.body)).collection_name;
      throw new Error('response lost after commit');
    }
    if (init?.method === 'DELETE') deleted.push(path);
    return Response.json({});
  };
  await expect(
    syncTypesense(
      [record],
      {
        endpoint: 'https://search.example',
        adminKey: 'admin',
        collection: 'docs'
      },
      request
    )
  ).rejects.toThrow('response lost');
  expect(published).toBeDefined();
  expect(deleted).not.toContain(`/collections/${published}`);
});
