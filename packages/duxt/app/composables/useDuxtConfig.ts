import type { ComputedRef } from 'vue';
import { createDuxtConfigCache } from '../utils/duxt-config-cache';

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
 * imports i18n. The result stays live, so switching language updates the
 * navbar without a full page load.
 *
 * ONE RESOLUTION PER APP, NOT PER CALLER. The merge and the cache live on the
 * Nuxt app — per request on the server, per tab in the browser — and every
 * component reads the answer for its own path out of it. Each component still
 * follows its OWN route: the header and the page see a navigation at different
 * moments, and a shared path would hand one of them the other's position. See
 * `duxt-config-cache.ts` for what was measured.
 */
export function useDuxtConfig(): DuxtConfigResolved {
  const nuxtApp = useNuxtApp() as ReturnType<typeof useNuxtApp> & {
    _duxtConfig?: DuxtSharedConfig;
  };
  const shared = (nuxtApp._duxtConfig ??= sharedConfig(nuxtApp));
  // The reader's position, because a section resolved per version has one
  // entry and it is the one for the version being read.
  const path = useDuxtPath();

  const resolved = computed(() =>
    shared.cache.resolve(
      shared.merged.value,
      path.value,
      shared.locale.value,
      shared.lookup,
      shared.catalogue.value
    )
  );

  // One computed per key read, so a reader of `sections` is only notified
  // when `sections` changes — the cache keeps an unchanged key's object.
  const keyed = new Map<PropertyKey, ComputedRef<unknown>>();
  const read = (key: PropertyKey) => {
    let entry = keyed.get(key);
    if (!entry) {
      entry = computed(
        () => (resolved.value as Record<PropertyKey, unknown>)[key]
      );
      keyed.set(key, entry);
    }
    return entry.value;
  };

  return new Proxy({} as DuxtConfigResolved, {
    get: (_, key) => read(key),
    has: (_, key) => key in resolved.value,
    ownKeys: () => Reflect.ownKeys(resolved.value),
    getOwnPropertyDescriptor: (_, key) =>
      key in resolved.value
        ? { enumerable: true, configurable: true, value: read(key) }
        : undefined,
    set: () => false
  });
}

interface DuxtSharedConfig {
  merged: ComputedRef<DuxtConfig>;
  locale: ComputedRef<string>;
  catalogue: ComputedRef<string>;
  lookup: (key: string) => string | undefined;
  cache: ReturnType<typeof createDuxtConfigCache>;
}

function sharedConfig(
  nuxtApp: ReturnType<typeof useNuxtApp>
): DuxtSharedConfig {
  const appConfig = useAppConfig();
  const i18n = nuxtApp.$i18n as unknown as {
    t: (key: string) => string;
    te: (key: string) => boolean;
    locale: { value: string };
    messages?: { value?: Record<string, unknown> };
  };

  return {
    // Tracked in development, where app.config is hot-reloaded in place.
    // Production never changes it, and walking it through the reactive proxy
    // costs every read a tracking step for nothing.
    merged: computed(() =>
      mergeDuxtConfig(
        import.meta.dev ? appConfig.duxt : toRaw(appConfig).duxt,
        duxtDefaults
      )
    ),
    locale: computed(() => i18n.locale.value),
    // A token for the locale's messages, so a lazily loaded catalogue
    // re-resolves the texts. Serialised rather than compared by identity:
    // i18n MERGES a loaded file into the existing object. Only runs when a
    // message actually changes, because the serialisation tracks every one.
    catalogue: computed(() =>
      JSON.stringify(i18n.messages?.value?.[i18n.locale.value] ?? null)
    ),
    // `te` first, so a literal never reaches `t` and never produces a
    // "key not found" warning. duxt's OWN missing keys still warn, which a
    // global `missingWarn: false` would have silenced along with them.
    lookup: (key) => (i18n.te(key) ? i18n.t(key) : undefined),
    cache: createDuxtConfigCache()
  };
}
