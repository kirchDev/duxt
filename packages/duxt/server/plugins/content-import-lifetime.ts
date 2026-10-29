/**
 * Keeps a request alive on Cloudflare until it has produced its response, even
 * after the reader has gone.
 *
 * Content restores a collection into D1 the first time a request reads it
 * after a deploy: it writes the collection's `_content_info` row with
 * `ready = 0`, replays the dump one statement at a time — about ten seconds a
 * collection on duxt.app — and flips the row to ready as the last statement.
 * A Worker CANCELS a request's work the moment its client disconnects. A
 * reader who gives up, a crawler with a timeout, a prefetch the router drops:
 * any of them stops that replay halfway, and the row is never flipped. Every
 * later read of that collection then waits on `ready` for 90 seconds and
 * fails, on every isolate, until the row is removed by hand — and a docs page
 * reads every version's collection to draw its version switcher, so one stuck
 * collection hangs every page of every version. duxt.app ran into exactly
 * that after the v0.10.0 deploy.
 *
 * `waitUntil` is the one thing a Worker lets outlive a disconnect, so every
 * request hands it a promise that settles when the request is done. Anything
 * it started — the restore included — then runs to completion inside the
 * platform's grace period rather than being cut off. Other runtimes do not
 * cancel on disconnect, so this only arms where `cloudflare` is in the context.
 */
const settle = Symbol('duxt.settle');

type Settling = { [settle]?: () => void };

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    if (!event.context.cloudflare || !event.waitUntil) return;

    event.waitUntil(
      new Promise<void>((resolve) => {
        (event.context as Settling)[settle] = resolve;
      })
    );
  });

  const done = (event: { context: Settling } | undefined) => {
    event?.context[settle]?.();
  };

  nitroApp.hooks.hook('afterResponse', (event) => done(event));
  nitroApp.hooks.hook('error', (_error, { event }) => done(event));
});
