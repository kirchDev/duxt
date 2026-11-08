import { appendFileSync } from 'node:fs';

export default defineNuxtConfig({
  hooks: {
    'content:file:afterParse': (context) => {
      if (process.env.DUXT_WIKI_TRACK_PARSE === '1')
        appendFileSync(
          new URL('./parsed.log', import.meta.url),
          context.file.path + String.fromCharCode(10)
        );
    }
  }
});
