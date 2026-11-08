import { appendFileSync } from 'node:fs';

export default defineNuxtConfig({
  hooks: {
    'nitro:config': (config) => {
      // Exercise the same ignore gate a crawler-discovered redlink reaches.
      config.prerender ??= {};
      config.prerender.routes = [
        ...(config.prerender.routes ?? []),
        '/wiki/wanted?title=Wanted%20Wiki'
      ];
    },
    'content:file:afterParse': (context) => {
      if (process.env.DUXT_WIKI_TRACK_PARSE === '1')
        appendFileSync(
          new URL('./parsed.log', import.meta.url),
          context.file.path + String.fromCharCode(10)
        );
    }
  }
});
