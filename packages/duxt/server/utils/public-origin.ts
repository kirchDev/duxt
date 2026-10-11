import type { H3Event } from 'h3';

/**
 * The origin absolute links in a text export are written against.
 *
 * The site's configured URL — the one the canonicals and the sitemap use — and
 * the request's own origin only where none is configured, or in development,
 * where links have to point at the server the developer is looking at. Taken
 * from the request alone, a `Host` header decided every link in `llms.txt`,
 * `llms-full.txt` and the feed, which is harmless until anything caches the
 * response for the next reader.
 */
export function duxtPublicOrigin(event: H3Event): string {
  const request = getRequestURL(event).origin;
  if (import.meta.dev) return request;

  const configured = getSiteConfig(event).url;
  if (!configured) return request;

  try {
    return new URL(configured).origin;
  } catch {
    return request;
  }
}
