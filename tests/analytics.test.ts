import { describe, expect, it, vi } from 'vitest';
import {
  duxtAnalyticsContext,
  duxtStatusClass,
  emitDuxtAnalytics
} from '../app/utils/analytics';

describe('emitDuxtAnalytics', () => {
  const event = {
    name: 'feedback' as const,
    helpful: true,
    context: { path: '/guides', locale: 'en' }
  };

  it('does nothing at all when the site configured no callback', () => {
    expect(() => emitDuxtAnalytics(undefined, event)).not.toThrow();
  });

  it('hands the event to the callback the site configured', () => {
    const track = vi.fn();
    emitDuxtAnalytics(track, event);
    expect(track).toHaveBeenCalledExactlyOnceWith(event);
  });

  // The interaction the reader actually wanted is the copy, the search or the
  // request — never the reporting of it. A provider SDK that throws on a
  // missing key, or rejects because the network is down, must reach no further
  // than this function.
  it('swallows a callback that throws', () => {
    const track = vi.fn(() => {
      throw new Error('provider exploded');
    });

    expect(() => emitDuxtAnalytics(track, event)).not.toThrow();
    expect(track).toHaveBeenCalledOnce();
  });

  // A provider SDK almost always returns a promise, and one rejecting with
  // nothing attached to it is an unhandled rejection — which is a process-level
  // event a browser logs and Node can be configured to exit on. Observed
  // through the runtime rather than through the call, because that is where it
  // would land.
  //
  // NOT a `vi.fn`: a vitest mock attaches its own handler to a returned promise
  // to record `settledResults`, which handles the rejection before the runtime
  // can call it unhandled — the test then passes against an implementation that
  // does nothing at all. Counted by hand instead, so the only handler in play is
  // the one under test.
  it('swallows a callback that rejects', async () => {
    let calls = 0;
    const track = () => {
      calls += 1;
      return Promise.reject(new Error('network down'));
    };
    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => unhandled.push(reason);

    process.on('unhandledRejection', listener);
    try {
      emitDuxtAnalytics(track, event);
      // Node decides a rejection is unhandled once the microtask queue has
      // drained, so one macrotask is what it takes to see the verdict.
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      process.off('unhandledRejection', listener);
    }

    expect(calls).toBe(1);
    expect(unhandled).toEqual([]);
  });
});

describe('duxtAnalyticsContext', () => {
  it('says where the reader was, and nothing more', () => {
    expect(duxtAnalyticsContext('/guides/deploy', 'en')).toEqual({
      path: '/guides/deploy',
      locale: 'en'
    });
  });

  // A query string is where a search term, a session token or a campaign id
  // ends up, and a fragment is where a reader was on the page. Neither is part
  // of "which page", so neither travels.
  it('drops a query string and a fragment from the path', () => {
    expect(duxtAnalyticsContext('/guides/deploy?token=abc123', 'en').path).toBe(
      '/guides/deploy'
    );
    expect(duxtAnalyticsContext('/guides/deploy#step-2', 'en').path).toBe(
      '/guides/deploy'
    );
    expect(duxtAnalyticsContext('/guides/deploy?a=1#step-2', 'en').path).toBe(
      '/guides/deploy'
    );
  });

  it('names the source and version the page came out of', () => {
    expect(
      duxtAnalyticsContext('/nuxt/v3/guide', 'de', {
        repo: 'nuxt',
        version: 'v3'
      })
    ).toEqual({
      path: '/nuxt/v3/guide',
      locale: 'de',
      source: 'nuxt',
      version: 'v3'
    });
  });

  // A site with one source and no versions has nothing to say here, and a key
  // present but undefined is a key a provider will happily transmit as null.
  it('omits the two keys a single-source site has no answer for', () => {
    const context = duxtAnalyticsContext('/guide', 'en', {
      repo: undefined,
      version: undefined
    });

    expect(Object.keys(context).sort()).toEqual(['locale', 'path']);
  });
});

// "Outcome and status class" is what the issue settles an API-playground event
// may report. 404 against 403 is a reader's own request going wrong; `4xx` is
// the shape of it, which is what a documentation site can act on.
describe('duxtStatusClass', () => {
  it('reduces a status to its class', () => {
    expect(duxtStatusClass(200)).toBe('2xx');
    expect(duxtStatusClass(201)).toBe('2xx');
    expect(duxtStatusClass(304)).toBe('3xx');
    expect(duxtStatusClass(404)).toBe('4xx');
    expect(duxtStatusClass(500)).toBe('5xx');
    expect(duxtStatusClass(100)).toBe('1xx');
  });

  it('answers nothing for a status outside the five classes', () => {
    expect(duxtStatusClass(0)).toBeUndefined();
    expect(duxtStatusClass(600)).toBeUndefined();
  });
});
