import { toReactive } from '@vueuse/core';

/**
 * The layer's config, with the consumer's app.config merged over it and every
 * text field resolved for the current locale.
 *
 * Two things happen here that a component should never have to know about:
 *
 *  - Nuxt's own app.config merge APPENDS arrays instead of replacing them, so
 *    a consumer overriding `navigation` would get the layer's entries after
 *    its own — see `duxt-config.ts`.
 *  - a label may be a literal, an i18n key or a per-locale record, and
 *    `resolveDuxtTexts` collapses all three to a string — see `duxt-text.ts`.
 *  - a generated section's navbar entry is not in the config a human wrote at
 *    all; it follows from the resolved manifest AND from where the reader
 *    currently is — see `withGeneratedSections`.
 *
 * Resolving here rather than at each call site is the point: `DuxtHeader`,
 * `DuxtFooter` and the rest keep writing `{{ section.label }}` and none of them
 * imports i18n. `toReactive` keeps the result live, so switching language
 * updates the navbar without a full page load.
 */
export function useDuxtConfig(): DuxtConfigResolved {
  const appConfig = useAppConfig();
  const { t, te, locale } = useI18n();
  // The reader's position, because a section resolved per version has one
  // entry and it is the one for the version being read.
  const path = useDuxtPath();

  return toReactive(
    computed(() =>
      resolveDuxtTexts(
        // After the merge, because a generated section's entry is APPENDED to
        // whatever list the consumer wrote — see `withGeneratedSections`.
        withGeneratedSections(
          mergeDuxtConfig(appConfig.duxt, duxtDefaults),
          path.value
        ),
        locale.value,
        // `te` first, so a literal never reaches `t` and never produces a
        // "key not found" warning. duxt's OWN missing keys still warn, which a
        // global `missingWarn: false` would have silenced along with them.
        (key) => (te(key) ? t(key) : undefined)
      )
    )
  ) as DuxtConfigResolved;
}
