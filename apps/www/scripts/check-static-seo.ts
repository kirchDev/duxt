import { fileURLToPath } from 'node:url';
import { checkStaticSeo } from './static-seo.ts';

const result = checkStaticSeo(
  fileURLToPath(new URL('../.output/public', import.meta.url)),
  'https://duxt.app',
  true
);
if (result.failures.length) {
  console.error(result.failures.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Production SEO passed: ${result.pages} pages, ${result.urls} URLs, locale sitemaps.`
  );
