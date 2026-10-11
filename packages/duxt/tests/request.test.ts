import { effectScope } from 'vue';
import { afterEach, expect, it, vi } from 'vitest';
import { useDuxtRequest } from '../app/composables/useDuxtRequest';

const scopes: ReturnType<typeof effectScope>[] = [];
function client(options = {}) {
  const scope = effectScope();
  scopes.push(scope);
  return scope.run(() => useDuxtRequest({ minimumWait: 0, ...options }))!;
}
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
  vi.unstubAllGlobals();
});

it('bounds JSON formatting as well as response reading', async () => {
  const nested = '['.repeat(3000) + '0' + ']'.repeat(3000);
  vi.stubGlobal('fetch', async () => new Response(nested));
  const state = client({ maxBytes: 16 * 1024 });
  await state.send('https://example.test', {});
  expect(state.result.value?.body).toBe(nested);
  expect(state.result.value?.truncated).toBe(false);
});

it('keeps the previous response while pending and prevents a duplicate send', async () => {
  let finish!: (response: Response) => void;
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response('first'))
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
  vi.stubGlobal('fetch', fetcher);
  const state = client();
  await state.send('https://example.test', {});
  const pending = state.send('https://example.test', {});
  expect(state.result.value?.body).toBe('first');
  await state.send('https://example.test', {});
  expect(fetcher).toHaveBeenCalledTimes(2);
  finish(new Response('second'));
  await pending;
  expect(state.result.value?.body).toBe('second');
  expect(state.sending.value).toBe(false);
});
it('bounds the streamed preview and cancels further consumption', async () => {
  const cancelled = vi.fn();
  vi.stubGlobal(
    'fetch',
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('abcdef'));
          },
          cancel: cancelled
        })
      )
  );
  const state = client({ maxBytes: 4 });
  await state.send('https://example.test', {});
  expect(state.result.value).toMatchObject({ body: 'abcd', truncated: true });
  expect(cancelled).toHaveBeenCalledOnce();
});
it.each(['cancelled', 'timeout'])(
  'settles a stalled body after %s',
  async (reason) => {
    const cancelled = vi.fn();
    vi.stubGlobal(
      'fetch',
      async () => new Response(new ReadableStream({ cancel: cancelled }))
    );
    const state = client({ timeout: reason === 'timeout' ? 10 : 10000 });
    const pending = state.send('https://example.test', {});
    await Promise.resolve();
    if (reason === 'cancelled') state.cancel();
    await pending;
    expect(state.failure.value).toBe(reason);
    expect(state.sending.value).toBe(false);
    expect(cancelled).toHaveBeenCalledOnce();
  }
);
it('aborts on navigation without reporting a stale outcome', async () => {
  const settled = vi.fn();
  let signal!: AbortSignal;
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    signal = init.signal!;
    return new Response(new ReadableStream());
  });
  const state = client({ settled });
  const pending = state.send('https://example.test', {});
  await Promise.resolve();
  scopes.at(-1)!.stop();
  await pending;
  expect(signal.aborted).toBe(true);
  expect(settled).not.toHaveBeenCalled();
  expect(state.result.value).toBeUndefined();
});
it('labels unreachable requests without retaining a URL or credentials in errors', async () => {
  vi.stubGlobal('fetch', async () => {
    throw new TypeError('secret URL');
  });
  const state = client();
  await state.send('https://example.test', {
    headers: { authorization: 'secret' }
  });
  expect(state.failure.value).toBe('blocked');
});
