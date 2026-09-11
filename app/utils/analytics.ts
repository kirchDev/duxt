/**
 * Where the reader was, in the four fields an event is allowed to say it with.
 *
 * The NORMALISATION is the point, not the assembly. A path reaches this from a
 * router, and a router's paths carry query strings and fragments — which is
 * where a search term, a campaign id, a session token and the heading someone
 * scrolled to all live. None of that is "which page", so none of it survives
 * here, once, rather than at each of the six call sites that build an event.
 *
 * `source` and `version` are OMITTED rather than set undefined: a site with one
 * source has no answer, and a key present-but-undefined is a key a provider
 * serialises as null and then charges a column for.
 */
export function duxtAnalyticsContext(
  path: string,
  locale: string,
  source?: { repo?: string; version?: string }
): DuxtAnalyticsContext {
  return {
    path: path.split(/[?#]/)[0] || '/',
    locale,
    ...(source?.repo ? { source: source.repo } : {}),
    ...(source?.version ? { version: source.version } : {})
  };
}

/**
 * A status as its class, which is as far as an event is allowed to go.
 *
 * The exact code belongs to the reader's own request — their token, their id,
 * their typo — and a documentation site learns nothing from 403 against 404
 * that `4xx` does not already tell it. Undefined outside the five classes,
 * because a request that produced no status produced no class either.
 */
export function duxtStatusClass(
  status: number
): DuxtAnalyticsStatusClass | undefined {
  const leading = Math.floor(status / 100);

  return leading >= 1 && leading <= 5
    ? (`${leading}xx` as DuxtAnalyticsStatusClass)
    : undefined;
}

/** Does nothing, on purpose — the rejection handler that drops the reason. */
const ignore = () => undefined;

/**
 * A value with a `then`, which is all that has to be true to reject.
 *
 * Duck-typed rather than `instanceof Promise`: a site may hand back its
 * provider's own thenable, or a promise from another realm, and both reject
 * exactly as unhandled as a native one.
 */
const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | undefined)?.then === 'function';

/**
 * Hand one event to the site's callback, and never let it back out.
 *
 * The whole of duxt's analytics transport. There is no queue, no batch, no
 * retry and no network call — a site's `track` is the only thing that ever
 * leaves the page, which is what keeps the provider, the consent gate and the
 * decision to transmit at all on the side that owns them.
 *
 * Nothing it does reaches the caller: the reader pressed copy, searched, or
 * sent a request, and a provider that is down, missing a key or throwing on a
 * malformed property must not take that interaction with it.
 */
export function emitDuxtAnalytics(
  track: ((event: DuxtAnalyticsEvent) => unknown) | undefined,
  event: DuxtAnalyticsEvent
): void {
  if (typeof track !== 'function') return;

  try {
    const returned: unknown = track(event);

    // A provider SDK almost always hands back a promise, and one that rejects
    // with nothing attached is an unhandled rejection — logged by every
    // browser, and fatal to a Node process configured to treat it so. Caught
    // here rather than left to the site: `track` is called for its effect and
    // its result is never read, so there is nowhere else a handler could go.
    if (isThenable(returned)) {
      returned.then(undefined, ignore);
    }
  } catch {
    // Deliberately silent, and silent in both halves: the reader pressed copy,
    // not report-that-I-copied.
  }
}
