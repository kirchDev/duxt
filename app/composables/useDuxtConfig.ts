/**
 * The layer's config, with the consumer's app.config merged over it.
 *
 * Components read this rather than `useAppConfig().duxt` directly, because
 * Nuxt's own merge appends arrays instead of replacing them — see
 * `duxt-config.ts` for why that makes every list unusable.
 */
export function useDuxtConfig(): DuxtConfig {
  const appConfig = useAppConfig();

  return computed(() => mergeDuxtConfig(appConfig.duxt, duxtDefaults)).value;
}
