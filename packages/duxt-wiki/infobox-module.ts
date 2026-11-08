import type { Nuxt } from 'nuxt/schema';
import { collectInfobox } from './infobox';

export default function duxtInfobox(_options: unknown, nuxt: Nuxt) {
  nuxt.hook('content:file:afterParse', (context) => {
    if (context.collection.type === 'page') collectInfobox(context.content);
  });
}
