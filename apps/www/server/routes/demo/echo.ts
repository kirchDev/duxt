/**
 * The one endpoint this site actually answers.
 *
 * `apps/www/demo/` describes an invented API and says so — no host behind it
 * replies, which is right for a reference page and wrong for the try-it client,
 * where a reader presses Send and gets a network error.
 *
 * So one path in it is real, and this is it. `POST` takes a consignment and
 * hands it back with an id and a timestamp, the way `POST /consignments` would.
 * Every other method, on `/demo/echo` and on any path under it, answers with
 * what it was sent: the Bruno collection beside the OpenAPI document points all
 * of its requests here, and a `GET` that answered 404 made every send button on
 * those pages but one a failure the page could not explain.
 *
 * Nothing is stored, and the token is checked only for being there — enough to
 * show the authorisation field doing something, and not enough to pretend this
 * is an account system.
 *
 * It lives in `apps/www/` rather than in the layer: duxt ships no API, and a
 * documentation layer that mounted a writable route into every site extending
 * it would be shipping one.
 */
import {
  defineEventHandler,
  getHeader,
  getQuery,
  getRouterParam,
  readBody,
  setResponseStatus
} from 'h3';

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    return {
      method: event.method,
      path: `/demo/echo${getRouterParam(event, 'path') ? `/${getRouterParam(event, 'path')}` : ''}`,
      query: getQuery(event),
      receivedAt: new Date().toISOString()
    };
  }

  const authorisation = getHeader(event, 'authorization');

  // The 401 the document declares. A demo whose only answer is success shows
  // the authorisation field as decoration; this makes it the thing that
  // decides, which is what a reader is being shown.
  if (!authorisation?.toLowerCase().startsWith('bearer ')) {
    setResponseStatus(event, 401);

    return {
      type: 'https://example.org/problems/unauthorised',
      title: 'No bearer token was sent',
      status: 401,
      detail: 'Put any value in the token field above and send it again.'
    };
  }

  const body = await readBody<{ reference?: unknown; mode?: unknown }>(
    event
  ).catch(() => ({}) as { reference?: unknown; mode?: unknown });

  const reference =
    typeof body?.reference === 'string' ? body.reference : 'HB-1042';
  const mode = body?.mode === 'air' ? 'air' : 'sea';

  setResponseStatus(event, 201);

  return {
    id: crypto.randomUUID(),
    reference,
    mode,
    createdAt: new Date().toISOString()
  };
});
