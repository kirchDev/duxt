import { localeDirection } from '@duxt/utils/direction';
import type { DuxtDirection } from '@duxt/utils/direction';

/**
 * Which way round this page is drawn.
 *
 * Two shells need the answer and neither can borrow it from the other:
 * `error.vue` REPLACES `app.vue` rather than nesting inside it, which is how
 * the error page came to set `lang` and never `dir`. One composable, both
 * shells, and the layer's one statement about direction.
 *
 * WHAT THE ANSWER IS FOR is wider than the `<html>` attribute. reka-ui reads
 * its direction from a `ConfigProvider` and from nothing else — `useDirection`
 * injects that context and defaults to `ltr`, never looking at the document —
 * so a menu, a select and a tooltip stay left-to-right under a right-to-left
 * page unless the same value is handed to the provider. That is the difference
 * between a theme that CAN be mirrored and one that merely says it is.
 */
export function useDuxtDirection(): ComputedRef<DuxtDirection> {
  const { locale, locales } = useI18n();

  return computed(() => localeDirection(locales.value, locale.value));
}
