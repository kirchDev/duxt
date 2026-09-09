/**
 * The one endpoint this site actually answers.
 *
 * `www/openapi.yaml` is an invented API and says so — no host behind it
 * replies, which is right for a reference page and wrong for the try-it client
 * on the landing page, where a reader presses Send and gets a network error.
 *
 * So one operation in that document is real, and this is it: it takes a widget
 * and hands it back with an id and a timestamp, the way `POST /widgets` would.
 * Nothing is stored, and the token is checked only for being there — enough to
 * show the authorisation field doing something, and not enough to pretend this
 * is an account system.
 *
 * It lives in `www/` rather than in the layer: duxt ships no API, and a
 * documentation layer that mounted a writable route into every site extending
 * it would be shipping one.
 */
export default defineEventHandler(async (event) => {
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

  const body = await readBody<{ name?: unknown; shape?: unknown }>(event).catch(
    () => ({}) as { name?: unknown; shape?: unknown }
  );

  const name = typeof body?.name === 'string' ? body.name : 'A widget';
  const shape = body?.shape === 'square' ? 'square' : 'round';

  setResponseStatus(event, 201);

  return {
    id: crypto.randomUUID(),
    name,
    shape,
    createdAt: new Date().toISOString()
  };
});
