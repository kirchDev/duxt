/**
 * Report one reader interaction to whoever the site said, if it said anyone.
 *
 * OPT-IN IS THE WHOLE FEATURE, and it is worth saying what that buys. duxt
 * ships no provider, no SDK, no adapter and no script: a site that has not
 * written `duxt.analytics.track` downloads not one byte more than before this
 * existed, and every call below reaches a `typeof track !== 'function'` and
 * stops. There is no queue, no buffer, no storage, no cookie and no consent
 * banner, because duxt never holds the data long enough to need any of them —
 * the site's own function is the only thing that ever leaves the page.
 *
 * That puts three decisions on the side that owns them: WHICH provider, WHETHER
 * to transmit at all, and under what consent. A layer cannot answer any of the
 * three for somebody else's readers — the same reason `DuxtPageFeedback` has an
 * event and no backend, and the footer's legal row ships empty (ADR 0005).
 *
 * WHAT IS NEVER SENT, stated once so it can be checked: no API credential, no
 * request or response body, no concrete request URL, no header, no copied text,
 * no rendered search result, no browser or reader identifier, and no query
 * string or fragment off the page's own path. The event types say the rest —
 * they are a closed union, so what duxt can report is readable in one place.
 *
 * CLIENT ONLY. A build and a prerender call nobody: a static render is not a
 * reader, and a site's analytics must not fill up with pages the crawler
 * opened. `duxt.app` prerenders every page it has, which is exactly the case
 * that would otherwise send hundreds of events from a CI box.
 */
export function useDuxtAnalytics() {
  const duxt = useDuxtConfig();
  const path = useDuxtPath();
  const { locale } = useI18n();
  // The source the reader is standing in, not the one a hit came out of — a
  // search result carries its own provenance on the event itself.
  const { source } = useDuxtCollection();

  /**
   * Stamp the context on and hand it over. Returns nothing, on purpose:
   * nothing a call site does should depend on whether reporting worked.
   */
  function track<Event extends DuxtAnalyticsEventInput>(event: Event): void {
    if (import.meta.server) return;

    emitDuxtAnalytics(duxt.analytics?.track, {
      ...event,
      context: duxtAnalyticsContext(path.value, locale.value, source.value)
    });
  }

  return { track };
}
