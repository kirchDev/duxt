import {
  transformerMetaHighlight,
  transformerMetaWordHighlight
} from '@shikijs/transformers';
import { defineConfig } from '@nuxtjs/mdc/config';

/**
 * Two Shiki transformers the MDC module does not enable by itself.
 *
 * It already ships four — diff, focus, error level and `[!code highlight]` —
 * which cover the annotations written INSIDE the code. These two cover the ones
 * written on the fence instead:
 *
 *     ```ts {2,4-6}
 *     ```ts /useDuxtConfig/
 *
 * Both matter for documentation specifically: a snippet quoted from a real file
 * cannot always carry a comment marking the interesting line, and a page
 * explaining an API wants to point at a word rather than a row.
 *
 * `mdc.config.ts` is read per layer, so a consumer adding its own transformers
 * gets these as well rather than instead.
 */
export default defineConfig({
  shiki: {
    transformers: [transformerMetaHighlight(), transformerMetaWordHighlight()]
  }
});
