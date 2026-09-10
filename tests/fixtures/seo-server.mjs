import { createServer } from 'node:http';

const mode = process.env.SEO_FIXTURE_MODE;
if (mode === 'startup-stall')
  await new Promise(() => setInterval(() => {}, 1000));
if (mode === 'startup-exit') process.exit(17);
const origin = process.env.NUXT_SITE_URL;
const locales = ['en-GB', 'en-US', 'de-DE', 'es-ES', 'fr-FR', 'pt-PT', 'pt-BR'];
let docRequests = 0;
const server = createServer((req, res) => {
  const route = req.url;
  if (route === '/getting-started') docRequests++;
  if (mode === 'premature-exit' && route === '/getting-started')
    process.exit(18);
  if (mode === 'stall' && route === '/getting-started') return;
  if (mode === 'body-stall' && route === '/getting-started') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.write('<html><head>');
    return;
  }
  res.setHeader('content-type', 'text/html; charset=utf-8');
  if (mode === 'http500' && docRequests === 5) {
    res.writeHead(500);
    res.end('<html><head><title>Render failed</title></head></html>');
    return;
  }
  if (mode === 'redirect' && route === '/getting-started') {
    res.writeHead(302, { location: '/' });
    res.end('<head><title>Redirect</title></head>');
    return;
  }
  if (mode === 'json' && route === '/getting-started')
    res.setHeader('content-type', 'application/json');
  res.statusCode =
    route === '/does-not-exist' && mode !== 'wrong404' ? 404 : 200;
  res.end(`<html><head>
    <link rel="canonical" href="${origin}${route}">
    ${[...locales, 'x-default'].map((locale) => `<link rel="alternate" hreflang="${locale}" href="${origin}${route}">`).join('')}
    <meta name="robots" content="${route === '/does-not-exist' ? 'noindex' : 'index'}">
    <meta property="og:title" content="Title">
    <meta property="og:description" content="Description">
    <meta property="og:image" content="${origin}/image.png">
    <meta property="og:locale" content="en_GB">
    ${locales
      .slice(mode === 'missing-alternate' ? 2 : 1)
      .map(
        (locale) =>
          `<meta property="og:locale:alternate" content="${locale.replace('-', '_')}">`
      )
      .join('')}
    <script type="application/ld+json">${JSON.stringify({ '@graph': [{ '@type': 'WebSite' }, { '@type': 'TechArticle' }, { '@type': 'BreadcrumbList' }] })}</script>
  </head><body>Fixture</body></html>`);
});
server.listen(Number(process.env.NITRO_PORT), process.env.NITRO_HOST, () => {
  console.log(`Listening on ${origin}`);
});
